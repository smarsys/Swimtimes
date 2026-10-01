"""Outils communs aux tests navigateur (Playwright) de SwimTimes."""
import functools
import http.server
import os
import threading

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TESTS_DIR)                  # Racine du dépôt, servie telle quelle
OUT = os.path.join(TESTS_DIR, 'screenshots')       # Captures d'écran (ignorées par git)
os.makedirs(OUT, exist_ok=True)


def start_server():
    """Sert la racine du dépôt sur un port libre ; retourne (serveur, URL de index.html)."""
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    srv.RequestHandlerClass.log_message = lambda *args: None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}/index.html'
