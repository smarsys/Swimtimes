"""Corrections de la 1re passe QA / review (BUG-01 à BUG-12) : profil invalide, initiales, focus, fuites, données piégées.

Les tests de chargement réseau (BUG-01, BUG-02) sont devenus sans objet avec US-018 : plus aucune donnée n'est chargée depuis GitHub."""
import sys, threading, http.server, functools, os, json, time
from playwright.sync_api import sync_playwright
from helpers import ROOT, OUT, TESTS_DIR, start_server, imported_storage, storage_script
srv, URL = start_server()
ok = 0
def check(cond, label):
    global ok
    if not cond: raise AssertionError(label)
    ok += 1; print('  ✓', label)
P = {'name': 'Ava Hehlen', 'swimrankingsId': '5332548', 'gender': 'F', 'birthYear': '2010', 'club': 'Lausanne Aquatique', 'createdAt': '2026-01-01T00:00:00Z'}

# Compte les écouteurs actifs sur document (détection de fuites)
COUNT_LISTENERS = """
(() => {
  const live = {};
  const add = Document.prototype.addEventListener, remove = Document.prototype.removeEventListener;
  window.__listeners = live;
  Document.prototype.addEventListener = function (type, fn, opts) {
    live[type] = (live[type] || 0) + 1;
    const signal = opts && opts.signal;
    if (signal) signal.addEventListener('abort', () => { live[type]--; });
    if (opts && opts.once) { const orig = fn; fn = function (e) { live[type]--; return orig.call(this, e); }; }
    return add.call(this, type, fn, opts);
  };
  Document.prototype.removeEventListener = function (type, fn, opts) { if (live[type]) live[type]--; return remove.call(this, type, fn, opts); };
})();
"""

def new_page(ctx, profile=P, raw_profile=None, times=None):
    """Page avec ce profil ; times = entrées localStorage des temps importés (par défaut : celles de l'échantillon nageur 1)."""
    page = ctx.new_page()
    stored = raw_profile if raw_profile is not None else (json.dumps(profile) if profile else None)
    imported = imported_storage() if times is None else times
    page.add_init_script(COUNT_LISTENERS + "localStorage.clear();"
                         + (f"localStorage.setItem('swimtimes_profile', {json.dumps(stored)});" if stored else '')
                         + storage_script(imported))
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    return page, errors

all_errors = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 375, 'height': 812})

    print('BUG-01 / BUG-02 : plus de chargement réseau (US-018)')
    page = ctx.new_page()
    requests = []; page.on('request', lambda r: requests.append(r.url))
    page.add_init_script("localStorage.clear(); localStorage.setItem('swimtimes_profile', " + json.dumps(json.dumps(P)) + ");" + storage_script(imported_storage()))
    page.goto(URL); page.wait_for_selector('.nav', state='visible')
    check('PB:' in page.locator('#pb-time').inner_text(), 'temps importés affichés dès l\'ouverture, sans attente réseau')
    page.wait_for_timeout(500)
    check(not [u for u in requests if 'githubusercontent' in u or 'swimmers-' in u], 'aucune requête vers GitHub ni vers swimmers-*.json')

    print('BUG-03 : profil enregistré invalide')
    cases = [
        ('genre v1 "Male"', {**P, 'gender': 'Male'}, None),
        ('genre absent', {k: v for k, v in P.items() if k != 'gender'}, 'gender'),
        ('année 3000', {**P, 'birthYear': '3000'}, 'birthYear'),
        ('nom fait d\'espaces', {**P, 'name': '   '}, 'name'),
        ('nom non textuel', {**P, 'name': {'a': 1}}, 'name'),
        ('ID non numérique', {**P, 'swimrankingsId': 'abc<b>'}, 'swimrankingsId'),
    ]
    for label, prof, bad in cases:
        page, e = new_page(ctx, profile=prof); all_errors += e
        page.wait_for_selector('#profile-form')
        check(page.locator('.notice').is_visible() and not page.locator('.nav').is_visible(), f'{label} : formulaire de correction, onglets bloqués')
        if bad:
            check(page.locator(f'#profile-{bad}-error').is_visible(), f'{label} : erreur affichée sur {bad}')
    page, e = new_page(ctx, profile={**P, 'gender': 'Male'}); all_errors += e
    page.wait_for_selector('#profile-form')
    check(page.locator('input[value=M]').is_checked() and page.locator('#profile-name').input_value() == 'Ava Hehlen', 'v1 "Male" converti en Homme, champs pré-remplis')
    page.click('#profile-submit'); page.wait_for_selector('.nav', state='visible')
    stored = page.evaluate("JSON.parse(localStorage.getItem('swimtimes_profile'))")
    check(stored['gender'] == 'M' and stored['createdAt'] == P['createdAt'], 'profil corrigé enregistré, createdAt conservé')
    page.screenshot(path=f'{OUT}/fix-profil-invalide.png')
    page, e = new_page(ctx, raw_profile='{"name": 42, "swimrankingsId": 5332548, "gender": "F"}'); all_errors += e
    page.wait_for_selector('#profile-form')
    check(page.locator('#profile-swimrankingsId').input_value() == '5332548', 'valeurs numériques reprises en texte')

    print('BUG-04 : initiales Unicode')
    page, e = new_page(ctx); all_errors += e; page.wait_for_selector('.nav', state='visible')
    for name, expected in [('🏊 Ava Hehlen', 'AH'), ('Ava 🏊', 'A'), ('ß ß', 'SS'), ('élodie dupont', 'ÉD'), ('Ava', 'A')]:
        got = page.evaluate('n => getInitials(n)', name)
        check(got == expected, f'getInitials({name!r}) = {got!r}')
    check(page.evaluate("PROFILE_VALIDATORS.name('\\u200B')") != '', 'nom fait d\'un caractère invisible refusé')

    print('BUG-05 : club long dans la popup')
    page, e = new_page(ctx, profile={**P, 'club': 'X' * 80}); all_errors += e
    page.wait_for_selector('.nav', state='visible'); page.click('#header-avatar')
    meta = page.locator('.swimmer-popup-meta')
    check(page.evaluate("el => el.scrollWidth <= el.clientWidth", meta.element_handle()), 'club long sans débordement')
    check(page.evaluate('document.activeElement.className') == 'swimmer-popup-close', 'focus dans la popup à l\'ouverture')
    page.keyboard.press('Escape')

    print('BUG-06 : focus')
    page, e = new_page(ctx, profile=None); all_errors += e
    page.wait_for_selector('#profile-form')
    page.fill('#profile-name', 'Léa Dupont'); page.fill('#profile-swimrankingsId', '5332548'); page.click('text=Femme')
    page.press('#profile-swimrankingsId', 'Enter'); page.wait_for_selector('.nav', state='visible')
    check(page.evaluate("document.activeElement.dataset.tab") == 'times', 'après création : focus sur l\'onglet Temps')
    page.click('#header-settings'); page.click('text=Modifier le profil')
    check(page.evaluate("document.activeElement.className") == 'setup-title', 'Modifier le profil : focus sur le titre')

    print('Accessibilité du genre')
    g = page.locator('#profile-gender')
    check(g.get_attribute('role') == 'radiogroup' and g.get_attribute('aria-required') == 'true' and g.get_attribute('aria-describedby') == 'profile-gender-error', 'radiogroup, aria-required, aria-describedby')

    print('Fuites d\'écouteurs')
    page, e = new_page(ctx); all_errors += e; page.wait_for_selector('.nav', state='visible')
    base = page.evaluate("window.__listeners.click || 0")
    page.dblclick('#header-avatar'); page.wait_for_timeout(100)
    check(not page.locator('#swimmer-popup').is_visible() and page.evaluate("window.__listeners.click || 0") == base, 'double-clic sur l\'avatar : pas d\'écouteur de clic orphelin')
    page.click('#header-settings'); page.click('text=Modifier le profil')
    for sel in ('#profile-name', '#profile-club', '#profile-birthYear', '.segmented__option:has-text("Homme")'):
        page.click(sel)
    page.wait_for_timeout(100)
    check(page.evaluate("(window.__listeners.pointerup || 0) + (window.__listeners.pointercancel || 0)") == 0, 'aucun écouteur pointerup/pointercancel restant')

    print('Temps importés piégés')
    trapped = {'swimtimes_pb': json.dumps({'updated': '2026-10-15T08:00:00.000Z', 'nation': '<img src=x onerror="window.__xss=1">',
                                           'data': [{'event': '50m Freestyle', 'distance': 50, 'stroke': '<img src=x onerror="window.__xss=2">',
                                                     'course': '50m', 'time': '27.80', 'finaPoints': 612, 'date': '1 Jan 2026',
                                                     'city': '<img src=x onerror="window.__xss=3">', 'meet': '<script>window.__xss=4</script>'}]})}
    page, e = new_page(ctx, times=trapped); all_errors += e
    page.wait_for_selector('.nav', state='visible')
    page.click('#header-settings'); page.click('summary'); page.click('.btn-back'); page.click('#header-avatar')
    for tab in ('times', 'progress'):
        page.keyboard.press('Escape'); page.click(f'.nav-tab[data-tab={tab}]')
    page.wait_for_timeout(300)
    check(page.evaluate('window.__xss') is None and page.locator('main img, #swimmer-popup img').count() == 0, 'aucun HTML injecté depuis les temps importés')

    print('BUG-08 : genre modifié après import')
    ref, e = new_page(ctx, profile={**P, 'gender': 'M'}); all_errors += e
    ref.wait_for_selector('.nav', state='visible'); ref.click('.nav-tab[data-tab=progress]')
    expected = ref.locator('.progress-card').all_inner_texts()
    page, e = new_page(ctx); all_errors += e
    page.wait_for_selector('.nav', state='visible'); page.click('#header-settings'); page.click('text=Modifier le profil')
    page.click('text=Homme'); page.click('#profile-submit')
    page.wait_for_selector('#settings-screen .btn-back', state='visible')
    page.click('.btn-back'); page.click('.nav-tab[data-tab=progress]')
    check(page.locator('.progress-card').all_inner_texts() == expected, f'Progression calculée en Homme {expected}')

    print('BUG-09 : popup avec et sans temps importés')
    page, e = new_page(ctx); all_errors += e
    page.wait_for_selector('.nav', state='visible'); page.click('#header-avatar')
    stats = page.locator('.swimmer-popup-stat-value').all_inner_texts()
    check(stats[1:] == ['39', '11'], f'avec import : 39 PB, 11 temps de saison ({stats})')
    page, e = new_page(ctx, times={}); all_errors += e
    page.wait_for_selector('.nav', state='visible'); page.click('#header-avatar')
    check(page.locator('.swimmer-popup-stat-value').all_inner_texts()[1:] == ['—', '—'] and 'Aucun temps importé' in page.locator('#swimmer-popup').inner_text(),
          'sans import : « — » et message, pas de faux zéro')

    print('BUG-10 : bandeau sans champ en erreur')
    page, e = new_page(ctx, profile={**P, 'gender': 'Female'}); all_errors += e
    page.wait_for_selector('#profile-form'); page.wait_for_function("document.getElementById('profile-notice').textContent")
    check('doit être vérifié' in page.locator('.notice').inner_text() and page.locator('.field-error:visible').count() == 0, 'genre v1 converti : bandeau « à vérifier », aucune erreur')
    page, e = new_page(ctx, profile={**P, 'birthYear': 3000}); all_errors += e
    page.wait_for_selector('#profile-form'); page.wait_for_function("document.getElementById('profile-notice').textContent")
    check('Corrige les champs signalés' in page.locator('.notice').inner_text() and page.evaluate('document.activeElement.id') == 'profile-birthYear', 'R-14 : focus sur le premier champ à corriger')

    print('BUG-11 : profil stocké sans champ exploitable')
    for raw in ('[1,2]', '{}', '{"createdAt":"2026-01-01"}', '"texte"'):
        page, e = new_page(ctx, raw_profile=raw); all_errors += e
        page.wait_for_selector('#profile-form')
        check(page.locator('.notice').count() == 0 and page.locator('.field-error:visible').count() == 0 and page.locator('#profile-club').input_value() == 'Lausanne Aquatique', f'{raw} : formulaire vierge')

    print('BUG-12 et R-13 : fermeture de la popup')
    page, e = new_page(ctx); all_errors += e; page.wait_for_selector('.nav', state='visible')
    page.click('#header-avatar'); page.click('.swimmer-popup-close')
    check(page.evaluate('document.activeElement.id') == 'header-avatar', '✕ rend le focus à l\'avatar')
    page.keyboard.press('Enter'); page.keyboard.press('Shift+Tab')
    check(page.locator('#swimmer-popup').is_visible(), 'Shift+Tab vers l\'avatar : popup gardée ouverte')
    page.keyboard.press('Tab'); page.keyboard.press('Tab')
    check(not page.locator('#swimmer-popup').is_visible(), 'Tab hors de la popup : fermée')

    check(not all_errors, f'aucune erreur JS {all_errors}')
    b.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
