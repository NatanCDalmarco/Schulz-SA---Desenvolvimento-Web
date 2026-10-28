"""Backend de demonstração AV4: front estático + emissão/consulta na AWS Lambda.

Não usar com dados reais da empresa: endpoint de consulta é público e autenticação
por chave de emissão é adequada apenas para prova de conceito acadêmica.
"""
import base64
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import hmac
import io
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import secrets
import uuid
from urllib.parse import unquote

_ROOT = Path(__file__).resolve().parent.parent
_STATIC = _ROOT / 'calibracao-web'
_ID = re.compile(r'^[0-9a-f]{32}$')
_TOKEN = os.environ.get('ISSUE_TOKEN', '')
_TABLE = os.environ.get('TABLE_NAME', '')
# LOCAL_MODE=1 existe SOMENTE para testes no computador. Nunca ativar no deploy.
_LOCAL_RECORDS = {}


def _reply(code, content, mime='application/json; charset=utf-8', *, binary=False):
    if not binary and not isinstance(content, (str, bytes)):
        content = json.dumps(content, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    if isinstance(content, str):
        content = content.encode('utf-8')
    return {
        'statusCode': code,
        'headers': {'Content-Type': mime, 'Cache-Control': 'no-store',
                    'X-Content-Type-Options': 'nosniff',
                    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'"},
        'body': base64.b64encode(content).decode('ascii') if binary else content.decode('utf-8'),
        'isBase64Encoded': bool(binary)
    }


def _error(code, message):
    return _reply(code, {'erro': message})


def _finite(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError('Campo numérico inválido.')
    return float(value)


def _calculate(raw):
    if not isinstance(raw, list) or not 1 <= len(raw) <= 100:
        raise ValueError('Informe entre 1 e 100 pontos de ensaio.')
    saidas = []
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError('Ponto inválido.')
        nome = str(item.get('ponto', '')).strip()[:60]
        if not nome: raise ValueError('Ponto sem identificação.')
        padrao = _finite(item.get('padrao'))
        lea = _finite(item.get('lea'))
        if not 0 <= lea <= 1e9 or abs(padrao) > 1e9:
            raise ValueError('Tolerância ou valor do padrão fora do limite da PoC.')
        leitura_raw = item.get('leituras')
        if not isinstance(leitura_raw, list) or not 3 <= len(leitura_raw) <= 30:
            raise ValueError('São necessárias de 3 a 30 repetições por ponto.')
        leituras = [_finite(v) for v in leitura_raw]
        if any(abs(v) > 1e9 for v in leituras): raise ValueError('Leitura fora do limite da PoC.')
        media = sum(leituras) / len(leituras)
        erro = media - padrao
        u_a = math.sqrt(sum((x - media) ** 2 for x in leituras) / (len(leituras) - 1)) / math.sqrt(len(leituras))
        expandida = 2 * u_a
        dentro = abs(erro) <= lea + 1e-9
        decisao = ('REPROVADO' if not dentro else 'APROVADO_CONDICIONAL' if abs(erro) + expandida > lea + 1e-9 else 'APROVADO')
        saidas.append({'ponto': nome, 'padrao': padrao, 'lea': lea, 'leituras': leituras,
                       'media': media, 'erroSistematico': erro, 'incertezaExpandida': expandida,
                       'status': 'DENTRO_DA_TOLERANCIA' if dentro else 'FORA_DA_TOLERANCIA', 'decisao': decisao})
    return saidas


def _record(payload):
    if not isinstance(payload, dict): raise ValueError('Payload inválido.')
    tag = str(payload.get('tag', '')).strip()[:65]
    tecnico = str(payload.get('tecnico', '')).strip()[:100]
    arquivo = str(payload.get('arquivo', '')).strip()[:150]
    if not tag or not tecnico: raise ValueError('Preencha TAG e técnico responsável.')
    pontos = _calculate(payload.get('pontos'))
    parecer = 'REPROVADO' if any(p['decisao'] == 'REPROVADO' for p in pontos) else 'APROVADO'
    numero = uuid.uuid4().hex
    doc = {'id': numero, 'tag': tag, 'tecnico': tecnico, 'arquivo': arquivo,
           'emitidoEm': datetime.now(timezone.utc).isoformat(timespec='seconds'),
           'parecer': parecer, 'pontos': pontos,
           'observacao': 'Documento demonstrativo acadêmico; incerteza expandida somente Tipo A (k=2).'}
    # Hash de identificação íntegra do registro; não é assinatura digital qualificada.
    canonical = json.dumps(doc, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    doc['sha256'] = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
    return doc


def _db():
    import boto3
    return boto3.resource('dynamodb').Table(_TABLE)


def _save(item):
    if os.environ.get('LOCAL_MODE') == '1':
        _LOCAL_RECORDS[item['id']] = item
    else:
        _db().put_item(Item=json.loads(json.dumps(item), parse_float=Decimal),
                       ConditionExpression='attribute_not_exists(id)')


def _read(ident):
    if os.environ.get('LOCAL_MODE') == '1': return _LOCAL_RECORDS.get(ident)
    response = _db().get_item(Key={'id': ident}, ConsistentRead=True)
    obj = response.get('Item')
    return json.loads(json.dumps(obj, default=lambda x: float(x) if isinstance(x, Decimal) else str(x))) if obj else None


def _static(route):
    if route in ('/', '/index.html'): target = _STATIC / 'index.html'
    elif route in ('/certificado.html', '/verificar.html'):
        target = _STATIC / route.lstrip('/')
    elif route.startswith(('/js/', '/css/', '/exemplos/')):
        target = _STATIC / route.lstrip('/')
    else: return _error(404, 'Página não encontrada.')
    target = target.resolve()
    if not target.is_relative_to(_STATIC.resolve()) or not target.is_file():
        return _error(404, 'Arquivo não encontrado.')
    mimetype = mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
    if mimetype.startswith('text/') or mimetype in ('application/javascript', 'application/json'):
        mimetype += '; charset=utf-8'
    return _reply(200, target.read_bytes(), mimetype, binary=True)


def _certificate_pdf(item, url):
    """PDF demonstrativo com hash e QR Code (sem assinatura qualificada)."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.barcode.qr import QrCodeWidget
    buf = io.BytesIO()
    document = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
                                 topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='AvisoAV4', parent=styles['Normal'], fontSize=9,
                              textColor=colors.HexColor('#a61c1c'), alignment=TA_CENTER, spaceAfter=10))
    titulo = Paragraph('CERTIFICADO DE CALIBRACAO - PROVA DE CONCEITO', styles['Heading2'])
    aviso = Paragraph('DOCUMENTO DEMONSTRATIVO - SEM VALIDADE METROLOGICA', styles['AvisoAV4'])
    escape = __import__('xml.sax.saxutils', fromlist=['escape']).escape
    def limpa(texto): return escape(str(texto))
    story = [titulo, aviso, Paragraph(f'<b>ID:</b> {limpa(item["id"])}', styles['Normal']),
             Paragraph(f'<b>TAG:</b> {limpa(item["tag"])}', styles['Normal']),
             Paragraph(f'<b>Tecnico:</b> {limpa(item["tecnico"])}', styles['Normal']),
             Paragraph(f'<b>Emitido (UTC):</b> {limpa(item["emitidoEm"])}', styles['Normal']),
             Paragraph(f'<b>Parecer:</b> {limpa(item["parecer"])}', styles['Normal']), Spacer(1, 7*mm)]
    rows = [['Ponto', 'Padrao', 'Media', 'Erro', 'LEA', 'Situacao']]
    for point in item['pontos']:
        rows.append([point['ponto'][:18], f'{point["padrao"]:.4f}', f'{point["media"]:.4f}',
                     f'{point["erroSistematico"]:.4f}', f'{point["lea"]:.4f}',
                     'Dentro' if point['status']=='DENTRO_DA_TOLERANCIA' else 'Fora'])
    t = Table(rows, colWidths=[30*mm, 26*mm, 26*mm, 26*mm, 24*mm, 37*mm], repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#0e3b4d')),
                           ('TEXTCOLOR',(0,0),(-1,0),colors.white),
                           ('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#bdc8ce')),
                           ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                           ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
                           ('FONTSIZE',(0,0),(-1,-1),7.5),
                           ('BOTTOMPADDING',(0,0),(-1,-1),7),
                           ('TOPPADDING',(0,0),(-1,-1),7)]))
    story.extend([t, Spacer(1, 5*mm)])
    qr = QrCodeWidget(url)
    qr_drawing = Drawing(85, 85, transform=[85/(qr.getBounds()[2]),0,0,85/(qr.getBounds()[3]),0,0])
    qr_drawing.add(qr)
    story.extend([Paragraph('Consulta publica pelo QR Code:', styles['Normal']), qr_drawing,
                  Paragraph('SHA-256 do registro: ' + item['sha256'], styles['Normal']),
                  Paragraph('Hash para verificacao de consistencia do registro. Nao e assinatura digital.', styles['Normal']),
                  Spacer(1, 5*mm), Paragraph(limpa(item['observacao']), styles['Normal'])])
    document.build(story)
    return buf.getvalue()


def _qr_svg(url):
    import qrcode
    from qrcode.image.svg import SvgPathImage
    img = qrcode.make(url, image_factory=SvgPathImage, box_size=6, border=2)
    output = io.BytesIO()
    img.save(output)
    return output.getvalue()


def lambda_handler(event, context):
    try:
        path = unquote(event.get('rawPath') or '/')
        method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
        headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
        domain = event.get('requestContext', {}).get('domainName', '')
        # Nunca construa links absolutos a partir do cabeçalho Host controlado pelo cliente.
        url_base = 'https://' + domain if domain else 'http://127.0.0.1:8000'
        if method == 'GET' and path == '/api/status':
            return _reply(200, {'status': 'ok', 'servico': 'AV4 Schulz - demonstracao'})
        if path.startswith('/api/certificados/') and method == 'GET':
            resto = path.removeprefix('/api/certificados/')
            is_qr = resto.endswith('/qr.svg')
            is_pdf = resto.endswith('/pdf')
            ident = resto[:-7] if is_qr else resto[:-4] if is_pdf else resto
            if not _ID.fullmatch(ident): return _error(404, 'Certificado não encontrado.')
            item = _read(ident)
            if not item: return _error(404, 'Certificado não encontrado.')
            if is_qr:
                svg = _qr_svg(f'{url_base}/verificar.html?id={ident}')
                return _reply(200, svg, 'image/svg+xml', binary=True)
            if is_pdf:
                pdf = _certificate_pdf(item, f'{url_base}/verificar.html?id={ident}')
                reply = _reply(200, pdf, 'application/pdf', binary=True)
                reply['headers']['Content-Disposition'] = f'attachment; filename="certificado-{ident}.pdf"'
                return reply
            # integridade interna: hash refeito antes da exibição
            copy = {k:v for k,v in item.items() if k!='sha256'}
            canonical = json.dumps(copy, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
            current = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
            # DynamoDB converte Decimals; round trip float serializa de forma idêntica para casos simples.
            item['integridade'] = hmac.compare_digest(current, item['sha256'])
            return _reply(200, item)
        if method == 'POST' and path == '/api/certificados':
            if not _TOKEN or not hmac.compare_digest(headers.get('x-issuer-token', ''), _TOKEN):
                return _error(403, 'Chave de emissão inválida.')
            body = event.get('body') or ''
            if event.get('isBase64Encoded'): body = base64.b64decode(body).decode('utf-8')
            if len(body.encode('utf-8')) > 160_000: return _error(413, 'Documento acima do tamanho permitido.')
            item = _record(json.loads(body))
            _save(item)
            return _reply(201, {'id': item['id'], 'url': f'{url_base}/verificar.html?id={item["id"]}',
                                'certificadoUrl': f'{url_base}/certificado.html?id={item["id"]}',
                                'sha256': item['sha256']})
        if method == 'GET': return _static(path)
        return _error(405, 'Método não permitido.')
    except (ValueError, json.JSONDecodeError) as exc:
        return _error(400, str(exc))
    except Exception:
        # detalhes técnicos só no CloudWatch, não na resposta pública
        import logging
        logging.exception('Erro ao processar requisição.')
        return _error(500, 'Erro interno. Verifique os logs da função Lambda.')
