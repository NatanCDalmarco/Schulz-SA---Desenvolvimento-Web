"""Testes locais da PoC AV4 (não equivalem a deploy em AWS)."""
import os
import json
import base64
import unittest

os.environ['LOCAL_MODE']='1'
os.environ['ISSUE_TOKEN']='demo-av4-local-apenas'
from cloud.app import lambda_handler, _record, _calculate, _LOCAL_RECORDS


def req(path, method='GET', data=None, key=None):
    headers = {}
    if key: headers['x-issuer-token']=key
    event={'rawPath':path,'headers':headers,'requestContext':{'http':{'method':method}}}
    if data is not None: event['body']=json.dumps(data)
    return lambda_handler(event,None)


def data(val=0.01):
    return {'tag':'MAN-001','tecnico':'Equipe AV4','arquivo':'teste.xlsx',
            'pontos':[{'ponto':'P1','padrao':0,'lea':0.05,'leituras':[0,val,0.02]},
                      {'ponto':'P2','padrao':2,'lea':0.05,'leituras':[2.01,2.02,2.03]}]}

class ApiAv4Tests(unittest.TestCase):
    def setUp(self): _LOCAL_RECORDS.clear()
    def test_status(self):
        self.assertEqual(req('/api/status')['statusCode'],200)
    def test_static_original(self):
        self.assertEqual(req('/')['statusCode'],200)
        self.assertEqual(req('/js/calculos.js')['statusCode'],200)
    def test_issue_requires_token(self):
        self.assertEqual(req('/api/certificados','POST',data())['statusCode'],403)
        self.assertEqual(req('/api/certificados','POST',data(),'errada')['statusCode'],403)
    def test_issue_lookup_qr_pdf(self):
        r=req('/api/certificados','POST',data(),'demo-av4-local-apenas')
        self.assertEqual(r['statusCode'],201, r['body'])
        ident=json.loads(r['body'])['id']
        record=req('/api/certificados/'+ident)
        self.assertEqual(record['statusCode'],200)
        val=json.loads(record['body'])
        self.assertTrue(val['integridade'])
        self.assertEqual(val['parecer'],'APROVADO')
        qr=req('/api/certificados/'+ident+'/qr.svg')
        self.assertEqual(qr['statusCode'],200)
        self.assertIn(b'<svg',base64.b64decode(qr['body']))
        pdf=req('/api/certificados/'+ident+'/pdf')
        self.assertEqual(pdf['statusCode'],200, pdf['body'][:100])
        self.assertTrue(base64.b64decode(pdf['body']).startswith(b'%PDF'))
    def test_reprovado(self):
        r=req('/api/certificados','POST',data(.32),'demo-av4-local-apenas')
        self.assertEqual(r['statusCode'],201)
        obj=json.loads(req('/api/certificados/'+json.loads(r['body'])['id'])['body'])
        self.assertEqual(obj['parecer'],'REPROVADO')
    def test_zero_repeticoes(self):
        d=data();d['pontos'][0]['leituras']=[]
        self.assertEqual(req('/api/certificados','POST',d,'demo-av4-local-apenas')['statusCode'],400)
    def test_numeros_inadequados(self):
        d=data();d['pontos'][0]['leituras']=[0,False,0]
        self.assertEqual(req('/api/certificados','POST',d,'demo-av4-local-apenas')['statusCode'],400)
    def test_missing_tag(self):
        d=data();d['tag']=''
        self.assertEqual(req('/api/certificados','POST',d,'demo-av4-local-apenas')['statusCode'],400)
    def test_certificado_nao_encontrado(self):
        self.assertEqual(req('/api/certificados/'+'a'*32)['statusCode'],404)
    def test_traversal_blocked(self):
        self.assertEqual(req('/js/../../cloud/app.py')['statusCode'],404)
    def test_conditional_point(self):
        d=data();d['pontos'][0]['leituras']=[.02,.04,.06]
        r=req('/api/certificados','POST',d,'demo-av4-local-apenas')
        obj=json.loads(req('/api/certificados/'+json.loads(r['body'])['id'])['body'])
        self.assertEqual(obj['pontos'][0]['decisao'],'APROVADO_CONDICIONAL')
    def test_invalid_id(self):
        self.assertEqual(req('/api/certificados/xyz')['statusCode'],404)

if __name__=='__main__': unittest.main()
