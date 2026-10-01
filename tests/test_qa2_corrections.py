"""Corrections de la 2e passe QA / review (BUG-13 à BUG-18) : double tap, nom v1, avertissement d'ID, abandon des modifications."""
import sys, threading, http.server, functools, os, json
from playwright.sync_api import sync_playwright
from helpers import ROOT, OUT, TESTS_DIR, start_server
srv, URL = start_server()
ok = 0
def check(cond, label):
    global ok
    if not cond: raise AssertionError(label)
    ok += 1; print('  ✓', label)
P = {'name': 'Ava Hehlen', 'swimrankingsId': '5332548', 'gender': 'F', 'birthYear': '2010', 'club': 'Lausanne Aquatique', 'createdAt': '2026-01-01T00:00:00Z'}
REAL_V1 = json.load(open(os.path.join(ROOT, 'swimmers-data.json')))['swimmers']['5332548']
all_errors = []
def new_page(ctx, storage=None, width=375, height=812, extra='', touch=False):
    page = ctx.new_page(); page.set_viewport_size({'width': width, 'height': height})
    for n in ('swimmers-data.json', 'swimmers-season.json'):
        page.route(f'**/raw.githubusercontent.com/**/{n}', lambda r, req, n=n: r.fulfill(path=os.path.join(ROOT, n)))
    init = 'localStorage.clear();' + ''.join(f'localStorage.setItem({json.dumps(k)}, {json.dumps(v if isinstance(v, str) else json.dumps(v))});' for k, v in (storage or {}).items())
    page.add_init_script(f"if (!sessionStorage.getItem('init')) {{ sessionStorage.setItem('init', '1'); {init} }}" + extra)
    page.on('pageerror', lambda e: all_errors.append(str(e)))
    page.goto(URL); page.wait_for_timeout(300)
    return page
stored = lambda pg, key='swimtimes_profile': pg.evaluate(f"localStorage.getItem({json.dumps(key)})")
active = lambda pg: pg.evaluate('document.activeElement.id || document.activeElement.className || document.activeElement.tagName')
def confirm(pg):
    pg.wait_for_selector('#confirm-dialog[open]'); pg.wait_for_selector('#confirm-ok:enabled'); pg.click('#confirm-ok')

with sync_playwright() as p:
    b = p.chromium.launch()

    print('BUG-13 : double tap sur « Supprimer mes données »')
    for w, h in ((375, 812), (390, 844), (414, 896), (320, 568)):
        for mode in ('souris', 'tactile'):
            ctx = b.new_context(has_touch=(mode == 'tactile'), is_mobile=(mode == 'tactile'), viewport={'width': w, 'height': h})
            page = new_page(ctx, {'swimtimes_profile': P}, width=w, height=h)
            page.wait_for_selector('.nav', state='visible'); page.click('#header-settings')
            btn = page.locator('#settings-delete'); btn.scroll_into_view_if_needed()
            box = btn.bounding_box(); x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            if mode == 'souris':
                page.mouse.dblclick(x, y)
            else:
                page.touchscreen.tap(x, y); page.wait_for_timeout(80); page.touchscreen.tap(x, y)
            page.wait_for_timeout(300)
            check(stored(page) is not None and page.locator('#confirm-dialog').is_visible(), f'{w}×{h} {mode} : rien supprimé, confirmation ouverte')
            ctx.close()
    print('BUG-17 : taps espacés (450 à 900 ms)')
    for w, h in ((414, 896), (402, 874), (480, 900), (375, 812), (390, 844)):
        for gap in (450, 700, 900):
            ctx = b.new_context(has_touch=True, is_mobile=True, viewport={'width': w, 'height': h})
            page = new_page(ctx, {'swimtimes_profile': P}, width=w, height=h)
            page.wait_for_selector('.nav', state='visible'); page.click('#header-settings')
            btn = page.locator('#settings-delete'); btn.scroll_into_view_if_needed()
            box = btn.bounding_box(); x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            page.touchscreen.tap(x, y); page.wait_for_timeout(gap); page.touchscreen.tap(x, y)
            page.wait_for_timeout(200)
            check(stored(page) is not None, f'{w}×{h}, 2e tap à {gap} ms : rien supprimé')
            ctx.close()
    ctx = b.new_context()
    page = new_page(ctx, {'swimtimes_profile': P})
    page.wait_for_selector('.nav', state='visible'); page.click('#header-settings'); page.click('#settings-delete')
    check(page.locator('#confirm-ok').is_disabled(), 'bouton Supprimer inactif à l\'ouverture')
    for key in ('Tab', 'Shift+Tab', 'Shift+Tab', 'Tab'):
        page.keyboard.press(key)
        check(active(page) == 'confirm-cancel', f'{key} pendant que Supprimer est inactif : focus reste sur Annuler')
    page.wait_for_selector('#confirm-ok:enabled', timeout=1500)
    check(True, 'bouton Supprimer actif après 1 s')
    ok_box = page.locator('#confirm-ok').bounding_box(); cancel_box = page.locator('#confirm-cancel').bounding_box()
    check(cancel_box['y'] > ok_box['y'], 'Annuler sous Supprimer (bas du bottom sheet)')

    print('BUG-16 : focus après un clic sur le texte de la confirmation')
    page.click('#confirm-text')
    page.keyboard.press('Shift+Tab'); a1 = active(page)
    page.click('#confirm-title'); page.keyboard.press('Tab'); a2 = active(page)
    check(a1 in ('confirm-ok', 'confirm-cancel') and a2 in ('confirm-ok', 'confirm-cancel'), f'Maj+Tab et Tab restent dans la confirmation ({a1}, {a2})')
    page.keyboard.press('Escape')

    print('BUG-14 : confirmation centrée sur tablette et ordinateur')
    for w, h in ((768, 1024), (1200, 800)):
        page = new_page(ctx, {'swimtimes_profile': P}, width=w, height=h)
        page.wait_for_selector('.nav', state='visible'); page.click('#header-settings'); page.click('#settings-delete')
        bx = page.locator('#confirm-dialog').bounding_box()
        cx, cy = bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] / 2
        check(abs(cx - w / 2) < 2 and abs(cy - h / 2) < 2, f'{w}px : centrée ({cx:.0f}, {cy:.0f})')
        page.wait_for_timeout(300); page.screenshot(path=f'{OUT}/r3-dialog-{w}.png')

    print('BUG-15 : nom v1 au format SwimRankings')
    check(REAL_V1['fullName'] == 'HEHLEN, Ava', f"donnée réelle : {REAL_V1['fullName']!r}")
    page = new_page(ctx, {'swimmer_profile': REAL_V1, 'athlete_id': '5332548'})
    page.wait_for_selector('#profile-form')
    check(page.locator('#profile-name').input_value() == 'Ava Hehlen', f"profil v1 réel → {page.locator('#profile-name').input_value()!r}")
    page.click('#profile-submit'); page.wait_for_selector('.nav', state='visible')
    check(page.locator('#header-avatar').inner_text() == 'AH', 'avatar AH après reprise')
    for legacy, expected in [({'id': 1, 'fullName': 'HEHLEN, Ava'}, 'Ava Hehlen'),
                             ({'id': 1, 'firstName': 'Jean', 'lastName': 'DUPONT-ROCHE'}, 'Jean Dupont-Roche'),
                             ({'id': 1, 'firstName': 'Zoé', 'lastName': "D'ARC"}, "Zoé D'Arc"),
                             ({'id': 1, 'firstName': 'Ana', 'lastName': 'da Silva'}, 'Ana da Silva'),
                             ({'id': 1, 'fullName': 'Ava Hehlen'}, 'Ava Hehlen')]:
        page = new_page(ctx, {'swimmer_profile': legacy}); page.wait_for_selector('#profile-form')
        got = page.locator('#profile-name').input_value()
        check(got == expected, f'{legacy} → {got!r}')

    print('athlete_id en texte brut')
    page = new_page(ctx, {'swimmer_profile': {'fullName': 'HEHLEN, Ava'}, 'athlete_id': '0012345'})
    page.wait_for_selector('#profile-form')
    check(page.locator('#profile-swimrankingsId').input_value() == '0012345', 'ID v1 brut repris tel quel (zéros conservés)')

    print('R-22 : bandeau v1 annoncé, focus placé')
    page = new_page(ctx, {'swimmer_profile': REAL_V1})
    page.wait_for_selector('#profile-form')
    notice = page.locator('#profile-notice')
    check(notice.get_attribute('role') == 'status', 'bandeau dans une région role=status')
    page.wait_for_function("document.getElementById('profile-notice').textContent.includes('retrouvé')")
    check(active(page) == 'setup-heading', 'profil v1 complet : focus sur le titre')

    print('Avertissement de changement d\'ID (bloquant review, R-18)')
    page = new_page(ctx); page.wait_for_selector('#profile-form')
    check('warning' not in page.locator('#profile-swimrankingsId').get_attribute('aria-describedby'), 'création : avertissement non relié au champ')
    page = new_page(ctx, {'swimtimes_profile': P}); page.wait_for_selector('.nav', state='visible')
    page.click('#header-settings'); page.click('#settings-edit')
    idf = page.locator('#profile-swimrankingsId'); warn = page.locator('#profile-swimrankingsId-warning')
    check('warning' not in idf.get_attribute('aria-describedby') and warn.inner_text() == '', 'édition sans changement : ni texte ni lien')
    page.fill('#profile-swimrankingsId', 'abc')
    check(warn.inner_text() == '', 'ID invalide : pas d\'avertissement')
    page.fill('#profile-swimrankingsId', '5284006')
    check('ancien ID' in warn.inner_text() and 'warning' in idf.get_attribute('aria-describedby'), 'ID valide changé : avertissement relié au champ')
    check(warn.get_attribute('aria-live') == 'polite', 'avertissement annoncé (aria-live)')
    page.fill('#profile-swimrankingsId', '5332548')
    check(warn.inner_text() == '' and 'warning' not in idf.get_attribute('aria-describedby'), 'retour à l\'ID d\'origine : retiré')

    print('Décision A : abandon des modifications')
    page.keyboard.press('Escape'); page.wait_for_timeout(100)
    check(page.locator('#settings-screen').is_visible() and active(page) == 'settings-edit', 'sans modification : Échap revient aux Paramètres, focus sur « Modifier le profil »')
    page.click('#settings-edit'); page.fill('#profile-club', 'Red Fish'); page.keyboard.press('Escape')
    page.wait_for_selector('#confirm-dialog[open]')
    dt = page.locator('#confirm-dialog').inner_text()
    check('Abandonner les modifications' in dt and 'Continuer la modification' in dt, 'avec modification : confirmation « Abandonner les modifications ? »')
    page.wait_for_timeout(300); page.screenshot(path=f'{OUT}/r3-abandon.png')
    page.wait_for_timeout(450); page.click('#confirm-cancel')
    check(page.locator('#profile-form').is_visible() and page.locator('#profile-club').input_value() == 'Red Fish', 'Continuer : formulaire et saisie conservés')
    page.click('#profile-back'); confirm(page)
    check(page.locator('#settings-screen').is_visible() and json.loads(stored(page))['club'] == 'Lausanne Aquatique', 'Abandonner : rien enregistré, retour aux Paramètres')
    check(active(page) == 'settings-edit', 'focus sur « Modifier le profil »')
    page.click('#settings-edit'); page.fill('#profile-club', 'X'); page.click('#profile-cancel'); confirm(page)
    check(json.loads(stored(page))['club'] == 'Lausanne Aquatique', 'Annuler avec modification : même confirmation')
    page.click('#settings-edit'); page.fill('#profile-club', 'Nouveau club'); page.click('#profile-submit')
    page.wait_for_selector('#settings-screen .btn-back', state='visible')
    check(active(page) == 'settings-edit', 'après Enregistrer : focus sur « Modifier le profil »')

    print('Échap : aide dépliée, appui long')
    page.click('#settings-edit'); page.click('#profile-id-help-toggle')
    page.keyboard.press('Escape')
    check(page.locator('#profile-form').is_visible() and not page.locator('#profile-id-help').is_visible() and active(page) == 'profile-id-help-toggle', 'Échap dans l\'aide : la replie, reste en édition')
    page.keyboard.down('Escape'); page.keyboard.down('Escape'); page.keyboard.down('Escape'); page.keyboard.up('Escape')
    check(page.locator('#settings-screen').is_visible(), 'appui long sur Échap : quitte l\'édition sans fermer les Paramètres')

    print('R-19 : erreur de stockage effacée à la saisie')
    page = new_page(ctx, {'swimtimes_profile': P}, extra="Storage.prototype.setItem = function(){ throw new DOMException('plein', 'QuotaExceededError') };")
    page.wait_for_selector('.nav', state='visible'); page.click('#header-settings'); page.click('#settings-edit')
    page.fill('#profile-club', 'X'); page.click('#profile-submit')
    check('Impossible' in page.locator('#profile-form-error').inner_text(), 'erreur de stockage affichée')
    page.fill('#profile-club', 'Lausanne Aquatique')
    check(page.locator('#profile-form-error').inner_text() == '' and page.locator('#profile-submit').is_disabled(), 'retour aux valeurs : erreur effacée, Enregistrer inactif')

    print('R-20 : extraction de l\'ID')
    page = new_page(ctx); page.wait_for_selector('#profile-form')
    idf = page.locator('#profile-swimrankingsId')
    idf.click(); page.keyboard.type('https://www.swimrankings.net/index.php?page=athleteDetail&athleteId=5332548&pbest=2026')
    check('athleteId' in idf.input_value(), 'frappe : adresse non tronquée pendant la saisie')
    idf.blur(); check(idf.input_value() == '5332548' and not page.locator('#profile-swimrankingsId-error').is_visible(), 'frappe : ID extrait à la sortie du champ')
    for url in ('https%3A%2F%2Fwww.swimrankings.net%2Findex.php%3Fpage%3DathleteDetail%26athleteId%3D5332548',
                'https://www.swimrankings.net/index.php?' + 'x=' + 'a' * 400 + '&athleteId=5332548',
                '  https://swimrankings.net/?ATHLETEID=5332548  '):
        idf.fill(''); idf.fill(url)
        check(idf.input_value() == '5332548', f'collage {url[:45]}… → 5332548')
    idf.fill(''); page.evaluate("""() => {
        const input = document.getElementById('profile-swimrankingsId');
        const data = new DataTransfer(); data.setData('text/plain', 'https://www.swimrankings.net/index.php?page=athleteDetail&athleteId=5284006');
        input.focus(); document.execCommand('insertText', false, '');
        input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    }""")
    idf.fill('https://www.swimrankings.net/index.php?page=athleteDetail&athleteId=5284006')
    check(idf.input_value() == '5284006', 'collage : ID extrait immédiatement')
    check('(nouvel onglet)' in page.locator('#profile-id-help a').text_content(), 'R-21 : lien annoncé « nouvel onglet »')

    print('Genre : un seul groupe')
    check(page.locator('#profile-form fieldset').count() == 0 and page.locator('#profile-gender').get_attribute('aria-labelledby') == 'profile-gender-label', 'radiogroup étiqueté, sans fieldset')

    print('Suppression : plus aucune donnée de l\'ancien profil dans la page')
    page = new_page(ctx, {'swimtimes_profile': {**P, 'name': 'Nom Très Unique'}})
    page.wait_for_function("swimmerDataStatus === 'loaded'"); page.click('.nav-tab[data-tab=progress]')
    page.click('#header-avatar'); page.keyboard.press('Escape')
    page.click('#header-settings'); page.click('summary'); page.click('#settings-delete'); confirm(page)
    page.wait_for_selector('#profile-form')
    html = page.evaluate("document.querySelector('main').innerHTML + document.getElementById('swimmer-popup').innerHTML")
    page.evaluate("1")
    check('Nom Très Unique' not in html and '5332548' not in html.replace('placeholder="ex. 5332548"', '').replace('<mark>5332548</mark>', ''), 'nom, ID et temps retirés du DOM')
    check(page.locator('#pb-time').inner_text() == '—', 'bloc PB réinitialisé')

    print('R-23 : clés v1 retirées quand un profil v2 valide existe')
    page = new_page(ctx, {'swimtimes_profile': P, 'swimmer_profile': REAL_V1, 'athlete_id': '5332548'})
    page.wait_for_selector('.nav', state='visible')
    check(stored(page, 'swimmer_profile') is None and stored(page, 'athlete_id') is None, 'clés v1 supprimées au lancement')

    print('R-24 : « Repartir de zéro »')
    page = new_page(ctx, {'swimmer_profile': REAL_V1})
    page.wait_for_selector('#profile-form'); page.click('#profile-reset')
    check('Repartir de zéro' in page.locator('#confirm-dialog').inner_text(), 'confirmation demandée')
    page.wait_for_timeout(450); page.click('#confirm-cancel')
    check(page.locator('#profile-name').input_value() == 'Ava Hehlen' and stored(page, 'swimmer_profile') is not None, 'Annuler : profil v1 conservé')
    page = new_page(ctx, {'swimmer_profile': REAL_V1}, extra="Storage.prototype.removeItem = function(){ throw new DOMException('bloqué', 'SecurityError') };")
    page.wait_for_selector('#profile-form'); page.click('#profile-reset'); confirm(page)
    check(page.locator('#confirm-dialog').is_visible() and "Impossible d'effacer" in page.locator('#confirm-error').inner_text(), 'stockage bloqué : message d\'erreur')

    print('R-26 : profil supprimé en dernier')
    page = new_page(ctx, {'swimtimes_profile': P, 'swimtimes_season': '{}'}, extra="""
        const realRemove = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function (key) { if (key === 'swimtimes_season') throw new DOMException('bloqué', 'SecurityError'); return realRemove.call(this, key); };""")
    page.wait_for_selector('.nav', state='visible'); page.click('#header-settings'); page.click('#settings-delete'); confirm(page)
    check(stored(page) is not None and page.locator('#confirm-error').inner_text() != '', 'échec en route : profil conservé, erreur affichée')

    check(not all_errors, f'aucune erreur JS {all_errors}')
    b.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
