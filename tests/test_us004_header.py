"""US-004 : header (🔄, ⚙️, avatar, popup), tailles d'écran."""
import sys, threading, http.server, functools, os, json
from playwright.sync_api import sync_playwright
from helpers import ROOT, OUT, TESTS_DIR, start_server
srv, URL = start_server()
ok = 0
def check(cond, label):
    global ok
    if not cond: raise AssertionError(label)
    ok += 1; print('  ✓', label)
PROFILE = {'name': 'Zoé <b>Müller</b> Dupont', 'swimrankingsId': '5332548', 'gender': 'F', 'birthYear': '2010', 'club': 'Lausanne Aquatique', 'createdAt': '2026-10-01T12:00:00Z'}

def new_page(ctx, profile=PROFILE):
    page = ctx.new_page()
    for n in ('swimmers-data.json', 'swimmers-season.json'):
        page.route(f'**/raw.githubusercontent.com/**/{n}', lambda r, req, n=n: r.fulfill(path=os.path.join(ROOT, n)))
    init = "localStorage.clear();" + (f"localStorage.setItem('swimtimes_profile', {json.dumps(json.dumps(profile))});" if profile else '')
    page.add_init_script(init)
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    return page, errors

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 375, 'height': 812})

    print('Écran de configuration')
    page, errors = new_page(ctx, None); page.wait_for_selector('#profile-form')
    check(not page.locator('.header-actions').is_visible(), '🔄 ⚙️ avatar masqués')
    check(page.locator('.header-title').is_visible(), 'logo et titre visibles')

    print('Header avec profil')
    page, errors = new_page(ctx); page.wait_for_selector('.nav', state='visible')
    for sel in ('#header-sync', '#header-settings', '#header-avatar'):
        box = page.locator(sel).bounding_box()
        check(page.locator(sel).is_visible() and box['width'] >= 44 and box['height'] >= 44, f'{sel} visible, ≥ 44×44')
        check(bool(page.locator(sel).get_attribute('aria-label')), f'{sel} a un aria-label')
    xs = [page.locator(s).bounding_box()['x'] for s in ('.header-title', '#header-sync', '#header-settings', '#header-avatar')]
    check(xs == sorted(xs), 'ordre : titre, 🔄, ⚙️, avatar')
    check(page.locator('#header-avatar').inner_text() == 'ZD', 'initiales ZD (premier + dernier mot)')
    check(page.locator('#swimmer-selector').count() == 0, 'plus de sélecteur de nageur')
    page.screenshot(path=f'{OUT}/us004-header.png')

    print('🔄 désactivé')
    sync = page.locator('#header-sync')
    check(sync.get_attribute('aria-disabled') == 'true' and sync.get_attribute('title') == 'Synchronisation disponible prochainement', 'aria-disabled + tooltip')
    sync.click(force=True)
    page.wait_for_selector('.toast--visible')
    check('disponible prochainement' in page.locator('#toast').inner_text(), 'toast au clic (mobile sans survol)')
    page.wait_for_selector('.toast--visible', state='detached', timeout=4000)
    check(True, 'toast disparaît')

    print('⚙️')
    page.click('.nav-tab[data-tab=times]'); page.click('#header-settings')
    check(page.locator('#settings-screen').is_visible(), 'ouvre les Paramètres')
    page.click('.btn-back')

    print('Popup avatar')
    page.click('#header-avatar'); popup = page.locator('#swimmer-popup')
    check(popup.is_visible() and page.locator('#header-avatar').get_attribute('aria-expanded') == 'true', 'popup ouverte, aria-expanded')
    text = popup.inner_text()
    check('Zoé <b>Müller</b> Dupont' in text and popup.locator('b').count() == 0, 'nom du profil, échappé')
    check('Lausanne Aquatique' in text and 'ans' in text and 'ID: 5332548' in text, 'club, âge, ID')
    page.wait_for_timeout(400); page.screenshot(path=f'{OUT}/us004-popup.png', clip={'x':0,'y':0,'width':375,'height':340})
    page.keyboard.press('Escape')
    check(not popup.is_visible() and page.evaluate('document.activeElement.id') == 'header-avatar', 'Échap ferme et rend le focus')
    page.click('#header-avatar'); page.click('main', position={'x': 20, 'y': 400})
    check(not popup.is_visible(), 'clic extérieur ferme')
    page.click('#header-avatar'); page.click('.swimmer-popup-close')
    check(not popup.is_visible(), 'bouton ✕ ferme')

    print('Clavier')
    page.focus('#header-sync'); page.keyboard.press('Tab')
    check(page.evaluate('document.activeElement.id') == 'header-settings', 'Tab : 🔄 → ⚙️')
    page.keyboard.press('Tab'); page.keyboard.press('Enter')
    check(popup.is_visible(), 'Entrée sur l\'avatar ouvre la popup')
    page.keyboard.press('Escape')

    print('Sans données (ID inconnu)')
    page2, errors2 = new_page(ctx, {**PROFILE, 'swimrankingsId': '999', 'club': ''}); page2.wait_for_selector('.nav', state='visible')
    page2.click('#header-avatar')
    check(page2.locator('#swimmer-popup').is_visible() and 'ID: 999' in page2.locator('#swimmer-popup').inner_text(), 'popup même sans données')

    print('Largeurs')
    for w in (320, 375, 768):
        pg = ctx.new_page(); pg.set_viewport_size({'width': w, 'height': 700})
        for n in ('swimmers-data.json', 'swimmers-season.json'):
            pg.route(f'**/raw.githubusercontent.com/**/{n}', lambda r, req, n=n: r.fulfill(path=os.path.join(ROOT, n)))
        pg.add_init_script(f"localStorage.setItem('swimtimes_profile', {json.dumps(json.dumps(PROFILE))})")
        pg.goto(URL); pg.wait_for_selector('.nav', state='visible')
        check(pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'{w}px : pas de débordement horizontal')
        hb = pg.locator('.header').bounding_box(); ab = pg.locator('#header-avatar').bounding_box()
        check(ab['x'] + ab['width'] <= hb['width'], f'{w}px : avatar dans le header')
        pg.screenshot(path=f'{OUT}/us004-{w}.png', clip={'x': 0, 'y': 0, 'width': w, 'height': 80})

    check(not errors and not errors2, f'aucune erreur JS {errors + errors2}')
    b.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
