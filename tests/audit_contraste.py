"""Audit de contraste WCAG AA de chaque texte visible, sur tous les écrans, à 375 et 1200 px."""
import sys, threading, http.server, functools, os, json
from playwright.sync_api import sync_playwright
from helpers import ROOT, OUT, TESTS_DIR, start_server
srv, URL = start_server()
JS = open(os.path.join(TESTS_DIR, 'contrast.js')).read()
P = {'name': 'Ava Hehlen', 'swimrankingsId': '5332548', 'gender': 'F', 'birthYear': '2010', 'club': 'Lausanne Aquatique'}
total = 0
def page_with(ctx, profile, legacy=None):
    pg = ctx.new_page()
    for n in ('swimmers-data.json', 'swimmers-season.json'):
        pg.route(f'**/raw.githubusercontent.com/**/{n}', lambda r, req, n=n: r.fulfill(path=os.path.join(ROOT, n)))
    pg.add_init_script("localStorage.clear();" + (f"localStorage.setItem('swimtimes_profile', {json.dumps(json.dumps(profile))});" if profile else '')
        + ''.join(f"localStorage.setItem('{k}', {json.dumps(json.dumps(v))});" for k, v in (legacy or {}).items()))
    pg.emulate_media(reduced_motion='reduce')
    pg.goto(URL); pg.wait_for_timeout(500)
    return pg
def audit(pg, label):
    global total
    pg.wait_for_timeout(350)
    res = pg.evaluate(JS)
    seen = set(); rows = []
    for r in res:
        key = (r['cls'], r['ratio'])
        if key in seen: continue
        seen.add(key); rows.append(r)
    total += len(rows)
    print(f'{label}: {"OK" if not rows else str(len(rows)) + " échec(s)"}')
    for r in rows: print(f"   {r['ratio']:>5} < {r['need']}  [{r['cls']}] {r['size']}px « {r['text']} »")
with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (375, 1200):
        print(f'=== {w}px')
        ctx = b.new_context(viewport={'width': w, 'height': 812})
        pg = page_with(ctx, None); audit(pg, 'Configuration')
        pg.click('#profile-submit'); audit(pg, 'Configuration + erreurs')
        pg = page_with(ctx, {'name': ' ', 'swimrankingsId': '1', 'gender': 'Male'}); audit(pg, 'Profil invalide (notice)')
        pg = page_with(ctx, P); pg.wait_for_selector('.nav', state='visible')
        audit(pg, 'Temps (données)')
        pg.click('.nav-tab[data-tab=progress]'); audit(pg, 'Progression')
        pg.select_option('#select-progress-pool', '50m'); audit(pg, 'Progression 50m')
        pg.click('#header-settings'); pg.click('summary'); audit(pg, 'Paramètres + records')
        pg.click('.btn-back'); pg.click('#header-avatar'); audit(pg, 'Popup avatar')
        pg.keyboard.press('Escape'); pg.click('#header-settings'); pg.click('#settings-delete'); audit(pg, 'Confirmation de suppression')
        pg.keyboard.press('Escape'); pg.click('text=Modifier le profil'); pg.fill('#profile-swimrankingsId', '1'); audit(pg, 'Modifier le profil (avertissement ID)')
        pg = page_with(ctx, None); pg.click('#profile-id-help-toggle'); pg.fill('#profile-swimrankingsId', 'athleteId=5332548'); audit(pg, 'Aide ID + ID extrait')
        pg = page_with(ctx, None, {'swimmer_profile': {'id': 1, 'fullName': 'Ava H', 'gender': 'Female'}}); audit(pg, 'Reprise v1')
        pg = page_with(ctx, {**P, 'swimrankingsId': '999'}); audit(pg, 'Temps sans données')
        pg.click('.nav-tab[data-tab=progress]'); audit(pg, 'Progression sans données')
        ctx.close()
    b.close()
srv.shutdown()
print(f'\nTotal : {total} échec(s)')
if total:
    sys.exit(1)
print('✅ Contraste AA : aucun texte sous le seuil')
