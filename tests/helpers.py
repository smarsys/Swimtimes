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


# --- Temps importés (US-013) pré-remplis à partir des échantillons SwimRankings ---------------
import datetime
import json
import re
from html.parser import HTMLParser

FIXTURES = os.path.join(TESTS_DIR, 'fixtures', 'swimrankings')


class AthleteBestRows(HTMLParser):
    """Cellules des lignes tr.athleteBest* d'une page SwimRankings (extraction indépendante de l'app)."""

    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr' and (dict(attrs).get('class') or '').startswith('athleteBest'):
            self.row = []
        elif tag == 'td' and self.row is not None:
            self.cell = []

    def handle_endtag(self, tag):
        if tag == 'td' and self.cell is not None:
            self.row.append(re.sub(r'\s+', ' ', ''.join(self.cell)).strip())
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)


def fixture(name):
    return open(os.path.join(FIXTURES, name), encoding='utf-8').read()


def fixture_times(name):
    """Temps d'un échantillon, au format de stockage (spec §3.1), selon les règles du README des échantillons."""
    parser = AthleteBestRows()
    parser.feed(fixture(name))
    times = []
    for cells in parser.rows:
        if len(cells) < 7 or 'Lap' in cells[0]:
            continue
        event, course, time, points, date, city, meet = cells[:7]
        distance, stroke = re.match(r'^(\d+)m (.+)$', event).groups()
        times.append({'event': event, 'distance': int(distance), 'stroke': stroke, 'course': course, 'time': time,
                      'finaPoints': int(points) if points.isdigit() else 0, 'date': date, 'city': city, 'meet': meet})
    return times


def current_season_label(today=None):
    """Saison en cours (1er septembre → 31 août) : octobre 2026 → « 2026-2027 »."""
    today = today or datetime.date.today()
    end = today.year + 1 if today.month >= 9 else today.year
    return f'{end - 1}-{end}'


def imported_storage(pb='nageur1-meilleurs-temps.html', season='nageur1-saison.html', updated=None):
    """Entrées localStorage d'un nageur qui a importé ses temps (saison rattachée à la saison en cours).
    Par défaut, importés à l'instant : pas de badge « plus de 7 jours »."""
    updated = updated or datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    entries = {}
    if pb:
        entries['swimtimes_pb'] = json.dumps({'updated': updated, 'nation': 'SUI', 'data': fixture_times(pb)})
    if season:
        entries['swimtimes_season'] = json.dumps({'season': current_season_label(), 'updated': updated, 'data': fixture_times(season)})
    return entries


def storage_script(entries):
    """Script d'initialisation qui écrit ces entrées dans localStorage."""
    return ''.join(f'localStorage.setItem({json.dumps(k)}, {json.dumps(v)});' for k, v in entries.items())


# Fixe la date de la page au 15 octobre 2026 à 10 h UTC (saison 2026-2027 des échantillons), le temps continuant
# de s'écouler. En UTC : les durées calculées par les tests ne dépendent pas du fuseau horaire de la machine.
FIXED_DATE_SCRIPT = """
(() => {
  const RealDate = Date;
  const offset = new RealDate('2026-10-15T10:00:00Z').getTime() - RealDate.now();
  class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [RealDate.now() + offset])); }
    static now() { return RealDate.now() + offset; }
  }
  window.Date = FixedDate;
})();
"""


def wait_sync_message(page):
    """Attend le message de la fenêtre de synchronisation (écrit avec un court délai pour être annoncé) et le retourne."""
    page.wait_for_function("document.getElementById('sync-message').textContent.trim()")
    return page.locator('#sync-message').inner_text()
