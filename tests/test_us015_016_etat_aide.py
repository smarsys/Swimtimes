"""US-015 : état de la synchronisation (✓ sur 🔄, badge au-delà de 7 jours) ; US-016 : aide selon l'appareil."""
import json
import os

from playwright.sync_api import sync_playwright

from helpers import OUT, start_server, fixture, fixture_times, storage_script, FIXED_DATE_SCRIPT

srv, URL = start_server()
ok = 0
all_errors = []


def check(cond, label):
    global ok
    if not cond:
        raise AssertionError(label)
    ok += 1
    print('  ✓', label)


PROFILE = {'name': 'Swimmer One Test', 'swimrankingsId': '9999001', 'gender': 'F', 'createdAt': '2026-01-01T00:00:00Z'}
USER_AGENTS = {
    'iphone': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    'ipad': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'android': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
    'mac': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
    'windows': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
}


def pb_entry(updated):
    return {'swimtimes_pb': json.dumps({'updated': updated, 'nation': 'SUI', 'data': fixture_times('nageur1-meilleurs-temps.html')})}


def new_page(browser, entries=None, device=None, touch_points=None):
    context = browser.new_context(viewport={'width': 375, 'height': 812}, user_agent=USER_AGENTS.get(device))
    page = context.new_page()
    page.on('pageerror', lambda e: all_errors.append(str(e)))
    touch = f"Object.defineProperty(navigator, 'maxTouchPoints', {{ get: () => {touch_points} }});" if touch_points is not None else ''
    page.add_init_script(FIXED_DATE_SCRIPT + touch + "if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.clear();"
                         f" localStorage.setItem('swimtimes_profile', {json.dumps(json.dumps(PROFILE))});" + storage_script(entries or {}) + " }")
    page.goto(URL)
    page.wait_for_selector('.nav', state='visible')
    return page


with sync_playwright() as p:
    browser = p.chromium.launch()
    sync = lambda page: page.locator('#header-sync')

    print('US-015 : données anciennes (plus de 7 jours)')
    page = new_page(browser, pb_entry('2026-10-01T00:00:00.000Z'))
    check('header-btn--stale' in sync(page).get_attribute('class'), 'synchronisée il y a 14 jours : badge sur 🔄')
    check(sync(page).get_attribute('aria-label') == 'Synchroniser mes temps (dernière synchronisation il y a 14 jours)', 'badge annoncé (aria-label)')
    page.click('#header-settings')
    check('il y a 14 jours' in page.locator('#settings-last-sync').inner_text(), f'Paramètres : « {page.locator("#settings-last-sync").inner_text()} »')
    page.click('.btn-back')
    page.wait_for_timeout(300); page.screenshot(path=os.path.join(OUT, 'us015-badge.png'), clip={'x': 0, 'y': 0, 'width': 375, 'height': 70})

    print('US-015 : import puis ✓ sur 🔄')
    page.click('#header-sync')
    page.fill('#sync-html', fixture('nageur1-meilleurs-temps.html')); page.click('#sync-import')
    page.click('text=Terminer')
    page.wait_for_function("document.getElementById('header-sync').textContent === '✓'", timeout=1000)  # événement « close » asynchrone
    check(sync(page).inner_text() == '✓' and 'header-btn--success' in sync(page).get_attribute('class'), 'fermeture après import : ✓ sur 🔄')
    check('header-btn--stale' not in sync(page).get_attribute('class'), 'badge retiré après un nouvel import')
    page.wait_for_timeout(2300)
    check(sync(page).inner_text() == '🔄' and 'header-btn--success' not in sync(page).get_attribute('class'), '🔄 revient après 2 s')
    page.click('#header-sync'); page.keyboard.press('Escape')
    check(sync(page).inner_text() == '🔄', 'fermeture sans import : pas de ✓')
    page.click('#header-settings')
    check('il y a' not in page.locator('#settings-last-sync').inner_text(), 'Paramètres : plus de « il y a X jours » après import')

    print('US-015 : pas de badge sans raison')
    page = new_page(browser, pb_entry('2026-10-12T00:00:00.000Z'))
    check('header-btn--stale' not in sync(page).get_attribute('class'), 'synchronisée il y a 3 jours : pas de badge')
    page = new_page(browser)
    check('header-btn--stale' not in sync(page).get_attribute('class'), 'jamais synchronisé : pas de badge (le message des onglets suffit)')

    print('US-016 : instructions selon l\'appareil')
    expected = {
        'mac': ('Option+Cmd+U', False),
        'windows': ('Ctrl+U', False),
        'android': ('view-source:', False),
        'iphone': ('Sur ton ordinateur', True),
    }
    for device, (text, ios) in expected.items():
        page = new_page(browser, device=device)
        page.click('#header-sync')
        step = page.locator('#sync-view-source').inner_text()
        check(text in step, f'{device} : « {step[:60]}… »')
        check(page.locator('.sync-ios').count() == (1 if ios else 0), f'{device} : bandeau iPhone/iPad {"affiché" if ios else "absent"}')
        if device == 'iphone':
            check('depuis un ordinateur' in page.locator('.sync-ios').inner_text(), 'iphone : le bandeau explique la limite de Safari')
            check(page.locator('#sync-other-devices').is_visible() and 'Mac' in page.locator('#sync-other-devices').inner_text(),
                  'iphone : instructions pour ordinateur déjà dépliées')
            check(page.locator('#sync-dialog').inner_text().count('Safari ne permet pas') == 1, 'iphone : message non répété')
            page.wait_for_timeout(300); page.screenshot(path=os.path.join(OUT, 'us016-iphone.png'))
    page = new_page(browser, device='ipad', touch_points=5)
    page.click('#header-sync')
    check(page.locator('.sync-ios').count() == 1, 'iPad (se présente comme un Mac, écran tactile) : reconnu comme iPad')

    print('US-016 : autres appareils et rappels')
    page = new_page(browser, device='windows')
    page.click('#header-sync')
    toggle = page.locator('.sync-other-device'); others = page.locator('#sync-other-devices')
    check(toggle.get_attribute('aria-expanded') == 'false' and not others.is_visible(), '« Autre appareil » replié')
    toggle.click()
    check(toggle.get_attribute('aria-expanded') == 'true' and others.locator('li').count() == 3, '« Autre appareil » : instructions des 3 autres appareils')
    check(all(t in others.inner_text() for t in ('Mac', 'Android', 'iPhone')), 'Mac, Android, iPhone et iPad listés')
    toggle.click(); check(not others.is_visible(), 'repli au 2e clic')
    text = page.locator('#sync-dialog').inner_text()
    check('SwimRankings est en anglais (sélecteur en haut à droite)' in text, 'rappel : SwimRankings en anglais')
    check('stockées sur cet appareil uniquement' in text, 'rappel : données sur cet appareil uniquement')
    check('Tes' in text and 'Vos ' not in text, 'textes au tutoiement')

    check(not all_errors, f'aucune erreur JS {all_errors}')
    browser.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
