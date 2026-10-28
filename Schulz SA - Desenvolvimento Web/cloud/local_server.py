"""Servidor local de teste: python -m cloud.local_server"""
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
os.environ['LOCAL_MODE'] = '1'
os.environ.setdefault('ISSUE_TOKEN', 'demo-av4-local-apenas')
from cloud.app import lambda_handler


class Handler(BaseHTTPRequestHandler):
    def _response(self):
        length = int(self.headers.get('Content-Length', '0'))
        if length > 200_000:
            self.send_error(413); return
        result = lambda_handler({
            'rawPath': self.path.split('?')[0],
            'requestContext': {'http': {'method': self.command}},
            'headers': dict(self.headers),
            'body': self.rfile.read(length).decode('utf-8'),
        }, None)
        self.send_response(result['statusCode'])
        for k, v in result['headers'].items(): self.send_header(k, v)
        self.end_headers()
        data = result['body'].encode('utf-8')
        if result.get('isBase64Encoded'): data = base64.b64decode(result['body'])
        self.wfile.write(data)

    def do_GET(self): self._response()
    def do_POST(self): self._response()


if __name__ == '__main__':
    print('Acesse http://127.0.0.1:8000 | Chave local: demo-av4-local-apenas')
    ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()
