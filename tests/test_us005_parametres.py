"""US-005 : écran Paramètres, suppression de l'onglet Profil."""
import sys, threading, http.server, functools, os, json
from playwright.sync_api import sync_playwright
from helpers import ROOT, OUT, TESTS_DIR, start_server
srv, URL = start_server()
ok = 0
def check(cond, label):
    global ok
    if not cond: raise AssertionError(label)
    ok += 1; print('  ✓', label)
PROFILE = {'name': 'Ava Hehlen', 'swimrankingsId': '5332548', 'gender': 'F', 'birthYear': '2010', 'club': 'Lausanne Aquatique', 'createdAt': '2026-10-01T12:00:00Z'}
def new_page(ctx, profile=PROFILE, width=375):
    page = ctx.new_page(); page.set_viewport_size({'width': width, 'height': 812})
    for n in ('swimmers-data.json', 'swimmers-season.json'):
        page.route(f'**/raw.githubusercontent.com/**/{n}', lambda r, req, n=n: r.fulfill(path=os.path.join(ROOT, n)))
    page.add_init_script(f"localStorage.clear(); localStorage.setItem('swimtimes_profile', {json.dumps(json.dumps(profile))});")
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_selector('.nav', state='visible')
    return page, errors
active_tab = lambda pg: pg.locator('.nav-tab.active').get_attribute('data-tab')

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context()
    page, errors = new_page(ctx)
    settings = page.locator('#settings-screen')

    print('Onglet Profil supprimé')
    tabs = page.locator('.nav-tab').evaluate_all('els => els.map(e => e.dataset.tab)')
    check(tabs == ['times', 'progress'], f'2 onglets : {tabs}')
    check(active_tab(page) == 'times' and page.locator('#tab-times').is_visible(), 'Temps affiché par défaut')

    print('Ouverture')
    page.click('.nav-tab[data-tab=progress]'); page.click('#header-settings')
    check(settings.is_visible() and not page.locator('.nav').is_visible() and not page.locator('#tab-progress').is_visible(), 'Paramètres affichés, onglets masqués')
    check(page.locator('#header-settings').get_attribute('aria-pressed') == 'true', '⚙️ aria-pressed')
    check(page.evaluate('document.activeElement.className') == 'btn-back', 'focus sur Retour')

    print('Contenu et ordre')
    t = settings.text_content()
    order = ['Mon profil', 'Ava Hehlen', 'Modifier le profil', 'Dernière synchronisation', 'Synchroniser maintenant', 'Exporter mes données', 'Supprimer mes données']
    idx = [t.find(x) for x in order]
    check(all(i >= 0 for i in idx) and idx == sorted(idx), 'sections dans l\'ordre de la US')
    check('Jamais synchronisé' in t and 'Données du club du' in t, 'dernière synchro + source des temps')
    check('ID 5332548' in t and '2010' in t and 'SUI' in t, 'ID, année, nation')
    for label in ('Synchroniser maintenant', 'Exporter mes données'):
        btn = settings.locator('button', has_text=label)
        check(btn.get_attribute('aria-disabled') == 'true' and 'Bientôt' in btn.inner_text(), f'« {label} » marqué Bientôt')
    check(settings.locator('button', has_text='Supprimer mes données').get_attribute('aria-disabled') is None, '« Supprimer mes données » actif (US-007)')
    danger = page.locator('.danger-zone').bounding_box(); data = settings.locator('section.card').nth(1).bounding_box()
    check(danger['y'] >= data['y'] + data['height'] + 24, 'zone de suppression séparée')

    print('Records')
    det = settings.locator('details.records-details')
    check(not det.get_attribute('open') and 'Mes records personnels (' in det.inner_text(), 'records repliés avec le nombre')
    det.locator('summary').click()
    check(det.locator('.pb-item').count() > 0, 'records dépliés')
    page.screenshot(path=f'{OUT}/us005-settings.png', full_page=True)

    print('Retour')
    page.click('.btn-back')
    check(not settings.is_visible() and active_tab(page) == 'progress', 'Retour → onglet précédent (Progression)')
    check(page.evaluate('document.activeElement.id') == 'header-settings', 'focus rendu à ⚙️')
    page.click('#header-settings'); page.keyboard.press('Escape')
    check(not settings.is_visible() and active_tab(page) == 'progress', 'Échap ferme')
    page.click('#header-settings'); page.click('#header-settings')
    check(not settings.is_visible(), '⚙️ une 2e fois ferme')
    page.click('#header-settings'); page.click('#header-avatar'); page.keyboard.press('Escape')
    check(settings.is_visible() and not page.locator('#swimmer-popup').is_visible(), 'Échap ferme la popup avant les Paramètres')
    page.keyboard.press('Escape')

    print('Modifier le profil depuis Paramètres')
    page.click('.nav-tab[data-tab=times]'); page.click('#header-settings'); page.click('text=Modifier le profil')
    check(page.locator('#profile-form').is_visible() and not settings.is_visible(), 'formulaire en édition')
    page.click('#profile-cancel')
    check(settings.is_visible(), 'Annuler → retour Paramètres')
    page.click('text=Modifier le profil'); page.fill('#profile-name', 'Ava H. Hehlen-Test'); page.click('#profile-submit')
    page.wait_for_selector('#settings-screen .btn-back', state='visible')
    check('Ava H. Hehlen-Test' in settings.inner_text() and page.locator('#header-avatar').inner_text() == 'AH', 'Enregistrer → Paramètres à jour, avatar à jour')
    page.click('.btn-back')
    check(active_tab(page) == 'times', 'puis retour à l\'onglet d\'origine')

    print('Sans données')
    page2, errors2 = new_page(ctx, {**PROFILE, 'swimrankingsId': '999', 'birthYear': ''})
    page2.click('#header-settings'); t2 = page2.locator('#settings-screen').inner_text()
    check('Aucune donnée' in t2 and page2.locator('details.records-details').count() == 0, 'pas de records, « Aucune donnée »')

    print('Mobile')
    page3, errors3 = new_page(ctx, width=320)
    page3.click('#header-settings')
    check(page3.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), '320px : pas de débordement')
    page3.wait_for_timeout(400); page3.screenshot(path=f'{OUT}/us005-320.png', full_page=True)

    check(not (errors + errors2 + errors3), f'aucune erreur JS {errors + errors2 + errors3}')
    b.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
