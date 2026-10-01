"""BUG-19 : un appui commencé pendant que « Supprimer » est inactif ne confirme pas la suppression."""
import sys, threading, http.server, functools, os, json
from playwright.sync_api import sync_playwright
from helpers import ROOT, OUT, TESTS_DIR, start_server
srv, URL = start_server()
P = {'name': 'Ava Hehlen', 'swimrankingsId': '5332548', 'gender': 'F'}
ok = 0
def check(cond, label):
    global ok
    if not cond: raise AssertionError(label)
    ok += 1; print('  ✓', label)
errors = []

def open_dialog(b, touch=False, w=414, h=896):
    ctx = b.new_context(has_touch=touch, is_mobile=touch, viewport={'width': w, 'height': h})
    pg = ctx.new_page()
    for n in ('swimmers-data.json', 'swimmers-season.json'):
        pg.route(f'**/raw.githubusercontent.com/**/{n}', lambda r, req, n=n: r.fulfill(path=os.path.join(ROOT, n)))
    pg.add_init_script(f"if (!sessionStorage.getItem('i')) {{ sessionStorage.setItem('i', '1'); localStorage.setItem('swimtimes_profile', {json.dumps(json.dumps(P))}); }}")
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL); pg.wait_for_selector('.nav', state='visible'); pg.click('#header-settings')
    pg.locator('#settings-delete').scroll_into_view_if_needed(); pg.click('#settings-delete')
    pg.wait_for_selector('#confirm-dialog[open]')
    box = pg.locator('#confirm-ok').bounding_box()
    return ctx, pg, box['x'] + box['width'] / 2, box['y'] + box['height'] / 2

deleted = lambda pg: pg.evaluate("localStorage.getItem('swimtimes_profile')") is None

def touch_press(pg, x, y, start_ms, hold_ms):
    cdp = pg.context.new_cdp_session(pg)
    pg.wait_for_timeout(start_ms)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
    pg.wait_for_timeout(hold_ms)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    pg.wait_for_timeout(200)

with sync_playwright() as p:
    b = p.chromium.launch()
    print('BUG-19 : appui commencé pendant que le bouton est grisé')
    for start, hold in ((850, 150), (900, 120), (900, 300), (950, 80), (600, 600)):
        ctx, pg, x, y = open_dialog(b)
        pg.wait_for_timeout(start); pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(hold); pg.mouse.up(); pg.wait_for_timeout(200)
        check(not deleted(pg), f'souris : appui à {start} ms maintenu {hold} ms → rien supprimé')
        ctx.close()
        ctx, pg, x, y = open_dialog(b, touch=True)
        touch_press(pg, x, y, start, hold)
        check(not deleted(pg), f'doigt : appui à {start} ms maintenu {hold} ms → rien supprimé')
        ctx.close()

    print('Confirmation volontaire après la seconde')
    ctx, pg, x, y = open_dialog(b)
    pg.wait_for_selector('#confirm-ok:enabled'); pg.mouse.click(x, y); pg.wait_for_timeout(200)
    check(deleted(pg), 'souris : clic après activation → supprimé')
    ctx.close()
    ctx, pg, x, y = open_dialog(b, touch=True)
    touch_press(pg, x, y, 1100, 80)
    check(deleted(pg), 'doigt : tap après activation → supprimé')
    ctx.close()
    ctx, pg, x, y = open_dialog(b)
    pg.wait_for_selector('#confirm-ok:enabled'); pg.keyboard.press('Tab')
    check(pg.evaluate('document.activeElement.id') == 'confirm-ok', 'clavier : Tab amène sur Supprimer')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    check(deleted(pg), 'clavier : Entrée après activation → supprimé')
    ctx.close()
    ctx, pg, x, y = open_dialog(b)
    pg.wait_for_selector('#confirm-ok:enabled'); pg.keyboard.press('Tab'); pg.keyboard.press('Space'); pg.wait_for_timeout(200)
    check(deleted(pg), 'clavier : Espace après activation → supprimé')
    ctx.close()

    print('Réouverture : un appui de la 1re ouverture ne compte pas pour la 2e')
    ctx, pg, x, y = open_dialog(b)
    pg.wait_for_selector('#confirm-ok:enabled'); pg.keyboard.press('Escape')
    pg.click('#settings-delete'); pg.wait_for_timeout(950); pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(150); pg.mouse.up(); pg.wait_for_timeout(200)
    check(not deleted(pg), 'réouverture : appui à 950 ms maintenu 150 ms → rien supprimé')
    ctx.close()
    check(not errors, f'aucune erreur JS {errors}')
    b.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
