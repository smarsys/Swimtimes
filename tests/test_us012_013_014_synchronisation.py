"""US-012, US-013, US-014 : fenêtre de synchronisation, import et stockage des temps, messages d'erreur."""
import json
import os
import re

from playwright.sync_api import sync_playwright

from helpers import ROOT, OUT, start_server, FIXED_DATE_SCRIPT, fixture, wait_sync_message

srv, URL = start_server()
FIXTURES = os.path.join(ROOT, 'tests', 'fixtures', 'swimrankings')
ok = 0
all_errors = []


def check(cond, label):
    global ok
    if not cond:
        raise AssertionError(label)
    ok += 1
    print('  ✓', label)


PROFILE_1 = {'name': 'Swimmer One Test', 'swimrankingsId': '9999001', 'gender': 'F', 'createdAt': '2026-01-01T00:00:00Z'}
PROFILE_2 = {'name': 'Swimmer Two Test', 'swimrankingsId': '9999002', 'gender': 'M', 'createdAt': '2026-01-01T00:00:00Z'}

FIXED_DATE = FIXED_DATE_SCRIPT  # Échantillons de la saison 2026-2027 : la page vit le 15 octobre 2026


def new_page(browser, profile=PROFILE_1, width=375, height=812, extra=''):
    page = browser.new_page(viewport={'width': width, 'height': height})
    page.add_init_script(FIXED_DATE + "if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.clear();"
                         f" localStorage.setItem('swimtimes_profile', {json.dumps(json.dumps(profile))}); }}" + extra)
    page.on('pageerror', lambda e: all_errors.append(str(e)))
    page.goto(URL)
    page.wait_for_selector('.nav', state='visible')
    return page


def stored(page, key):
    value = page.evaluate(f"localStorage.getItem('{key}')")
    return json.loads(value) if value else None


def paste_and_import(page, html):
    page.fill('#sync-html', html)
    page.click('#sync-import')
    return wait_sync_message(page)


def fully_selected(page):
    return page.evaluate("(() => { const t = document.getElementById('sync-html'); return t.value.length > 0 && t.selectionStart === 0 && t.selectionEnd === t.value.length; })()")


def active(page):
    return page.evaluate('document.activeElement.id || document.activeElement.className')


with sync_playwright() as p:
    browser = p.chromium.launch()

    print('US-012 : fenêtre de synchronisation')
    page = new_page(browser)
    sync = page.locator('#header-sync')
    check(sync.get_attribute('aria-disabled') is None and sync.get_attribute('aria-label') == 'Synchroniser mes temps', '🔄 actif')
    sync.click()
    dialog = page.locator('#sync-dialog')
    check(dialog.is_visible() and 'Synchroniser mes temps' in dialog.inner_text(), '🔄 ouvre la fenêtre')
    check(active(page) == 'sync-title' and page.evaluate("document.getElementById('sync-dialog').scrollTop") == 0,
          'focus sur le titre, fenêtre en haut (pas de clavier qui s\'ouvre, instructions visibles)')
    text = dialog.inner_text()
    check(all(step in text for step in ('Ouvre ta page', 'Cloudflare', 'code source', 'Importer')), 'étapes affichées')
    links = page.locator('.sync-link')
    check(links.nth(0).get_attribute('href') == 'https://www.swimrankings.net/index.php?page=athleteDetail&athleteId=9999001',
          'lien « Mes meilleurs temps » construit avec l\'ID du profil')
    check(links.nth(1).get_attribute('href').endswith('&athleteId=9999001&pbest=2027') and 'saison 2026-2027' in links.nth(1).inner_text(),
          'lien de la saison 2026-2027 (pbest=2027)')
    check(all(links.nth(i).get_attribute('target') == '_blank' and 'noopener' in links.nth(i).get_attribute('rel') for i in range(2)),
          'liens dans un nouvel onglet (noopener)')
    check('(nouvel onglet)' in links.nth(0).text_content(), 'nouvel onglet annoncé aux lecteurs d\'écran')
    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), '375 px : pas de débordement horizontal')
    box = dialog.bounding_box()
    check(box['width'] == 375 and box['height'] == 812, '375 px : fenêtre en plein écran')
    page.wait_for_timeout(300); page.screenshot(path=os.path.join(OUT, 'sync-375.png'))

    ids = []
    for _ in range(8):
        page.keyboard.press('Tab'); ids.append(active(page))
    check(page.evaluate("document.getElementById('sync-dialog').contains(document.activeElement)"), f'focus piégé dans la fenêtre {ids}')
    page.evaluate("[...document.querySelectorAll('#sync-dialog button:not([disabled])')].pop().focus()")
    page.keyboard.press('Tab')
    first = page.evaluate("[...document.querySelectorAll('#sync-dialog a[href], #sync-dialog button:not([disabled]), #sync-dialog textarea')].filter(el => el.offsetParent !== null)[0] === document.activeElement")
    check(first, 'Tab sur le dernier élément : retour au premier')
    page.keyboard.press('Shift+Tab')
    check(page.evaluate("[...document.querySelectorAll('#sync-dialog button:not([disabled])')].pop() === document.activeElement"), 'Maj+Tab sur le premier : retour au dernier')
    page.keyboard.press('Escape')
    check(not dialog.is_visible() and active(page) == 'header-sync', 'Échap ferme, focus rendu à 🔄')

    page.click('#header-settings'); page.click('#settings-sync')
    check(dialog.is_visible(), '« Synchroniser maintenant » ouvre la fenêtre')
    page.fill('#sync-html', 'texte collé')
    page.keyboard.press('Escape')
    check(not dialog.is_visible() and page.locator('#settings-screen').is_visible(), 'Échap ferme seulement la fenêtre (Paramètres restent ouverts)')
    check(active(page) == 'settings-sync', 'focus rendu à « Synchroniser maintenant »')
    page.click('#settings-sync')
    check(page.locator('#sync-html').input_value() == 'texte collé', 'texte collé conservé après une fermeture')
    page.click('.dialog__close'); check(not dialog.is_visible(), '✕ ferme')
    page.click('#settings-sync'); page.click('text=Terminer'); check(not dialog.is_visible(), '« Terminer » ferme')

    print('US-013 : import et stockage')
    page = new_page(browser)
    page.click('#header-sync')
    message = paste_and_import(page, fixture('nageur1-meilleurs-temps.html'))
    check('39 meilleurs temps importés' in message, f'meilleurs temps : « {message} »')
    pbs = stored(page, 'swimtimes_pb')
    expected = page.evaluate('html => parseSwimRankingsPage(html).page.times', fixture('nageur1-meilleurs-temps.html'))
    check(pbs['data'] == expected and pbs['updated'].startswith('2026-10-15'), 'stockés dans swimtimes_pb (spec §3.1)')
    check(page.locator('#sync-html').input_value() == '' and active(page) == 'sync-html', 'zone vidée, focus conservé')
    check(page.locator('#sync-check-pb').get_attribute('data-state') == '✓' and
          page.locator('#sync-check-season').get_attribute('data-state') == '○', 'liste : meilleurs temps ✓, saison à faire')
    message = paste_and_import(page, fixture('nageur1-saison.html'))
    check('11 temps de la saison 2026-2027 importés' in message, f'saison : « {message} »')
    season = stored(page, 'swimtimes_season')
    check(season['season'] == '2026-2027' and len(season['data']) == 11, 'stockés dans swimtimes_season')
    check(page.locator('#sync-check-season').get_attribute('data-state') == '✓', 'liste : saison ✓')
    paste_and_import(page, fixture('nageur1-meilleurs-temps.html'))
    check(len(stored(page, 'swimtimes_pb')['data']) == 39, 'nouvel import : remplace, sans doublons')
    raw = page.evaluate('Object.values(localStorage).join()')
    check('<' not in raw, 'le HTML collé n\'est jamais stocké')
    page.screenshot(path=os.path.join(OUT, 'sync-importe.png'))

    page = new_page(browser)
    page.click('#header-sync')
    paste_and_import(page, fixture('nageur1-saison.html'))
    paste_and_import(page, fixture('nageur1-meilleurs-temps.html'))
    check(stored(page, 'swimtimes_pb') and stored(page, 'swimtimes_season'), 'ordre libre : saison puis meilleurs temps')

    page = new_page(browser, PROFILE_2)
    page.click('#header-sync')
    message = paste_and_import(page, fixture('nageur2-saison.html'))
    check('Aucun temps sur la saison 2026-2027' in message and stored(page, 'swimtimes_season')['data'] == [],
          'saison sans temps : enregistrée vide, message adapté')

    print('US-014 : messages d\'erreur')
    page = new_page(browser)
    page.click('#header-sync')
    paste_and_import(page, fixture('nageur1-meilleurs-temps.html'))
    before = page.evaluate("localStorage.getItem('swimtimes_pb')")
    reference = fixture('nageur1-meilleurs-temps.html')
    errors = [
        # « zone vide » après une erreur : juste après un import réussi, un clic sur une zone vide est ignoré (double-clic)
        ('texte de la page', 'Personal bests 50m Freestyle 27.80', 'code source'),
        ('zone vide', '', "Colle d'abord"),
        ('défi Cloudflare', fixture('cloudflare.html'), 'vérification Cloudflare'),
        ('page de connexion', fixture('connexion.html'), 'Connecte-toi'),
        ('autre page', '<html><body><p>Bonjour</p></body></html>', "pas celui d'une page nageur"),
        ('page en allemand', reference.replace('Personal bests, Alltime', 'Persönliche Bestzeiten, Alle'), 'en anglais'),
        ('copie incomplète', reference[:len(reference) // 2], 'incomplet'),
        ('page d\'un autre nageur', fixture('nageur2-meilleurs-temps.html'), 'Swimmer Two Test, pas la tienne'),
        ('saison passée', fixture('nageur1-saison.html').replace('Season 2027', 'Season 2026'), 'saison 2025-2026'),
        ('meilleurs temps vides', re.sub(r'<tr class="athleteBest[01]">.*?</tr>', '', reference, flags=re.S), 'aucun temps'),
    ]
    for label, html, expected_text in errors:
        message = paste_and_import(page, html)
        check(expected_text in message and message.startswith('⚠️'), f'{label} : « {message} »')
        check(page.evaluate("localStorage.getItem('swimtimes_pb')") == before and page.evaluate("localStorage.getItem('swimtimes_season')") is None,
              f'{label} : rien n\'est modifié')
        check(page.locator('#sync-html').input_value() == html and active(page) == 'sync-html', f'{label} : texte conservé, focus sur la zone')
        if html:
            check(fully_selected(page), f'{label} : texte entièrement sélectionné (un collage le remplace)')
    page.screenshot(path=os.path.join(OUT, 'sync-erreur.png'))

    print('BUG-P2-01 : recoller par-dessus une erreur')
    for label, first in (('page Cloudflare', fixture('cloudflare.html')), ('copie incomplète', reference[:len(reference) // 2]),
                         ('page d\'une autre nageuse', fixture('nageur2-meilleurs-temps.html'))):
        page.fill('#sync-html', first); page.click('#sync-import'); wait_sync_message(page)
        page.keyboard.insert_text(fixture('nageur1-meilleurs-temps.html'))  # collage réel : remplace la sélection
        page.click('#sync-import')
        message = wait_sync_message(page)
        check('39 meilleurs temps importés' in message and len(json.loads(page.evaluate("localStorage.getItem('swimtimes_pb')"))['data']) == 39,
              f'après {label}, nouveau collage : 39 temps, sans doublon (« {message} »)')
    page.fill('#sync-html', fixture('cloudflare.html') + fixture('nageur1-meilleurs-temps.html')); page.click('#sync-import')
    check('plusieurs pages' in wait_sync_message(page), 'deux pages dans la zone : refusées')

    trapped = fixture('nageur2-meilleurs-temps.html').replace('TEST, Swimmer Two', '<img src=x onerror="window.__xss=1">TEST, Swimmer Two')
    message = paste_and_import(page, trapped)
    page.wait_for_timeout(200)
    check(page.evaluate('window.__xss') is None and page.locator('#sync-message img').count() == 0, 'nom piégé : affiché en texte, rien exécuté')

    page = new_page(browser, extra="""
        const realSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === 'swimtimes_pb') throw new DOMException('plein', 'QuotaExceededError');
            return realSet.call(this, key, value);
        };""")
    page.click('#header-sync')
    message = paste_and_import(page, fixture('nageur1-meilleurs-temps.html'))
    check("Impossible d'enregistrer" in message and page.locator('#sync-html').input_value() != '', 'stockage plein : message, texte conservé')

    print('Lignes non reconnues (décision A) et double-clic')
    page = new_page(browser)
    page.click('#header-sync')
    paste_and_import(page, fixture('nageur1-saison.html'))
    relay = fixture('nageur1-meilleurs-temps.html').replace('>50m Butterfly<', '>4x50m Medley Relay<')
    message = paste_and_import(page, relay)
    check('37 meilleurs temps importés · 2 lignes ignorées' in message and '4x50m Medley Relay' in message,
          f'lignes ignorées annoncées et nommées : « {message} »')
    unreadable = fixture('nageur1-saison.html')
    for stroke, other in (('Freestyle<', 'Freistil<'), ('Backstroke<', 'Rücken<'), ('Breaststroke<', 'Brust<'), ('Butterfly<', 'Delfin<'), ('Medley<', 'Lagen<')):
        unreadable = unreadable.replace(stroke, other)
    message = paste_and_import(page, unreadable)
    check("Aucun temps de cette page n'a pu être lu" in message and 'anglais' not in message, f'saison illisible : « {message} »')
    check(len(json.loads(page.evaluate("localStorage.getItem('swimtimes_season')"))['data']) == 11, 'saison illisible : les 11 temps stockés sont conservés')
    page.fill('#sync-html', fixture('nageur1-meilleurs-temps.html'))
    page.dblclick('#sync-import')
    page.wait_for_timeout(300)
    message = page.locator('#sync-message').inner_text()
    check('39 meilleurs temps importés' in message, f'double-clic sur « Importer » : message de succès conservé (« {message} »)')

    print('Erreurs sur une page de saison')
    page = new_page(browser, extra="""
        const realSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === 'swimtimes_season') throw new DOMException('plein', 'QuotaExceededError');
            return realSet.call(this, key, value);
        };""")
    page.click('#header-sync')
    check("Impossible d'enregistrer" in paste_and_import(page, fixture('nageur1-saison.html')), 'saison, stockage plein : message')
    page = new_page(browser)
    page.click('#header-sync')
    check('Swimmer Two Test, pas la tienne' in paste_and_import(page, fixture('nageur2-saison.html')) and
          page.evaluate("localStorage.getItem('swimtimes_season')") is None, 'saison d\'un autre nageur : refusée')

    print('BUG-P2-03 : code collé effacé')
    page = new_page(browser)
    page.click('#header-sync'); page.fill('#sync-html', 'code collé non importé'); page.keyboard.press('Escape')
    page.click('#header-settings'); page.click('#settings-delete')
    page.wait_for_selector('#confirm-ok:enabled'); page.click('#confirm-ok')
    page.wait_for_selector('#profile-form')
    check(page.locator('#sync-html').count() == 0, 'après « Supprimer mes données » : plus de code collé ni de liens de l\'ancien ID')
    page = new_page(browser)
    page.click('#header-sync'); page.fill('#sync-html', 'code collé non importé'); page.keyboard.press('Escape')
    page.click('#header-settings'); page.click('#settings-edit'); page.fill('#profile-swimrankingsId', '9999002'); page.click('#profile-submit')
    page.wait_for_selector('#settings-screen .btn-back', state='visible'); page.click('#settings-sync')
    check(page.locator('#sync-html').input_value() == '' and '9999002' in page.locator('.sync-link').first.get_attribute('href'),
          'après un changement d\'ID : zone vide, liens vers le nouvel ID')

    print('Mise en page')
    page = new_page(browser, width=1200, height=800)
    page.click('#header-sync')
    box = page.locator('#sync-dialog').bounding_box()
    check(box['width'] <= 560 and abs(box['x'] + box['width'] / 2 - 600) < 2, '1200 px : fenêtre centrée, 560 px au plus')
    page.wait_for_timeout(300); page.screenshot(path=os.path.join(OUT, 'sync-1200.png'))

    check(not all_errors, f'aucune erreur JS {all_errors}')
    browser.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
