"""Servidor local de desenvolvimento do Geoportal Evereste."""
import argparse
import functools
import http.server
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = {'index.html', 'mapa.html', 'app.js', 'analysis.js', 'measure.js', 'professional.js', 'spatial-worker.js', 'styles.css', 'data-catalog.json', 'logo_evereste.png', 'infovias.geojson', 'pontos_estrategicos.geojson', 'localidades.geojson', 'favicon.ico'}
PUBLIC_DIRS = {'municipios', 'setores_censitarios', 'localidades_por_uf'}

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def send_head(self):
        path = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        parts = path.split('/')
        allowed = path in PUBLIC_FILES or (len(parts) == 2 and parts[0] in PUBLIC_DIRS and parts[1].endswith('.geojson'))
        if not allowed or '..' in parts or '\\' in path:
            self.send_error(404)
            return None
        return super().send_head()

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
            super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(ROOT)))
    except OSError as error:
        raise SystemExit(f'Porta {args.port} indisponivel: {error}. Escolha outra com --port.')
    print(f'Geoportal: http://127.0.0.1:{args.port}/mapa.html', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
