"""Audit de contraste des lignes JO du tableau Temps, pour toutes les épreuves."""
import threading, http.server, functools, os, sys, json
from playwright.sync_api import sync_playwright
from helpers import ROOT, OUT, TESTS_DIR, start_server
srv, URL = start_server()
JS = open(os.path.join(TESTS_DIR, 'contrast.js')).read()
with sync_playwright() as p:
    b = p.chromium.launch(); fails = 0; rows = 0
    for w in (375, 1200):
        pg = b.new_page(viewport={'width': w, 'height': 900}); pg.emulate_media(reduced_motion='reduce')
        for n in ('swimmers-data.json','swimmers-season.json'):
            pg.route(f'**/raw.githubusercontent.com/**/{n}', lambda r, req, n=n: r.fulfill(path=os.path.join(ROOT,n)))
        pg.add_init_script("localStorage.setItem('swimtimes_profile', JSON.stringify({name:'Ava Hehlen',swimrankingsId:'5332548',gender:'F'}))")
        pg.goto(URL); pg.wait_for_function("swimmerDataStatus === 'loaded'")
        for gender in ('Female', 'Male'):
            for pool in ('50m', '25m'):
                for stroke in ('Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Medley'):
                    pg.select_option('#select-gender', gender); pg.select_option('#select-pool', pool); pg.select_option('#select-stroke', stroke)
                    for d in pg.locator('#select-distance option').evaluate_all('o => o.map(x => x.value)'):
                        pg.select_option('#select-distance', d)
                        n = pg.locator('tr.olympic').count()
                        if not n: continue
                        rows += n
                        bad = [r for r in pg.evaluate(JS) if True]
                        if bad:
                            fails += len(bad); print(w, gender, pool, stroke, d, bad[:3])
    print(f'{rows} lignes JO contrôlées, {fails} échec(s)')
    if fails or not rows:
        sys.exit(1)
    print(f'✅ Contraste AA sur les {rows} lignes JO')
    b.close()
srv.shutdown()
