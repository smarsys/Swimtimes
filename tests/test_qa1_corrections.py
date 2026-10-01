"""Corrections de la 1re passe QA / review (BUG-01 à BUG-12) : chargement, profil invalide, initiales, focus, fuites."""
import sys, threading, http.server, functools, os, json, time
from playwright.sync_api import sync_playwright
from helpers import ROOT, OUT, TESTS_DIR, start_server
srv, URL = start_server()
ok = 0
def check(cond, label):
    global ok
    if not cond: raise AssertionError(label)
    ok += 1; print('  ✓', label)
P = {'name': 'Ava Hehlen', 'swimrankingsId': '5332548', 'gender': 'F', 'birthYear': '2010', 'club': 'Lausanne Aquatique', 'createdAt': '2026-01-01T00:00:00Z'}
DATA = {n: open(os.path.join(ROOT, n)).read() for n in ('swimmers-data.json', 'swimmers-season.json')}

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

def new_page(ctx, profile=P, delay=0, hang=False, data=None, raw_profile=None):
    page = ctx.new_page()
    def handler(route, request, name):
        route.fulfill(body=(data or DATA)[name], content_type='application/json')
    # Lenteur ou absence de réponse simulées dans la page (respecte l'annulation par AbortController)
    slow = f"""
    (() => {{
      const realFetch = window.fetch, delay = {int(delay * 1000)}, hang = {str(hang).lower()};
      window.fetch = (url, opts = {{}}) => {{
        if (!/githubusercontent/.test(url)) return realFetch(url, opts);
        return new Promise((resolve, reject) => {{
          opts.signal?.addEventListener('abort', () => reject(new DOMException('Délai dépassé', 'AbortError')));
          if (!hang) setTimeout(() => realFetch(url, opts).then(resolve, reject), delay);
        }});
      }};
    }})();
    """
    for n in DATA:
        page.route(f'**/raw.githubusercontent.com/**/{n}', lambda r, req, n=n: handler(r, req, n))
    stored = raw_profile if raw_profile is not None else (json.dumps(profile) if profile else None)
    page.add_init_script(COUNT_LISTENERS + slow + "localStorage.clear();" + (f"localStorage.setItem('swimtimes_profile', {json.dumps(stored)});" if stored else ''))
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    return page, errors

all_errors = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 375, 'height': 812})

    print('BUG-01 : chargement lent qui écrasait l\'écran ouvert')
    page, e = new_page(ctx, delay=3); all_errors += e
    page.wait_for_selector('.nav', state='visible')
    check('Chargement des temps' in page.locator('#pb-time').inner_text(), 'indicateur de chargement (onglet Temps)')
    check(page.locator('#header-avatar').inner_text() == 'AH', 'avatar affiché avant la fin du chargement')
    page.click('#header-settings')
    check('Chargement' in page.locator('#settings-source').inner_text(), 'Paramètres : « Chargement… »')
    page.click('text=Modifier le profil'); page.fill('#profile-name', 'Ava Modifiée')
    page.wait_for_timeout(4500)
    check(page.locator('#profile-form').is_visible() and page.locator('#profile-name').input_value() == 'Ava Modifiée', 'formulaire et saisie conservés après le chargement')
    page.click('#profile-cancel'); page.wait_for_selector('#confirm-dialog[open]'); page.wait_for_selector('#confirm-ok:enabled'); page.click('#confirm-ok')
    check('Données du club' in page.locator('#settings-source').inner_text() and page.locator('details.records-details').count() == 1, 'Paramètres à jour (date + records)')

    page, e = new_page(ctx, delay=3); all_errors += e
    page.wait_for_selector('.nav', state='visible'); page.click('#header-settings')
    page.wait_for_function("document.getElementById('settings-source').textContent.includes('Données du club')", timeout=8000)
    check(page.locator('details.records-details').count() == 1 and page.locator('#settings-screen').is_visible(), 'Paramètres ouverts pendant le chargement : mis à jour sans fermeture')

    print('Changement d\'ID pendant un chargement')
    page, e = new_page(ctx, delay=3); all_errors += e
    page.wait_for_selector('.nav', state='visible')
    page.click('#header-settings'); page.click('text=Modifier le profil')
    page.fill('#profile-swimrankingsId', '999'); page.click('#profile-submit')
    page.wait_for_timeout(4500)
    check(page.evaluate('swimmerDataStatus') == 'not-found' and page.evaluate('swimmer') is None, 'le chargement de l\'ancien ID est ignoré')
    check(page.locator('details.records-details').count() == 0, 'pas de records de l\'ancien ID')

    print('BUG-02 : GitHub ne répond pas')
    page, e = new_page(ctx, profile=None, hang=True); all_errors += e
    page.wait_for_selector('#profile-form')
    page.fill('#profile-name', 'Léo Martin'); page.fill('#profile-swimrankingsId', '5332548'); page.click('text=Homme')
    t0 = time.time(); page.click('#profile-submit'); page.wait_for_selector('.nav', state='visible', timeout=3000)
    check(time.time() - t0 < 2.5, f'l\'app s\'affiche sans attendre le réseau ({time.time() - t0:.1f}s)')
    check(page.locator('#select-gender').input_value() == 'Male', 'genre Homme appliqué tout de suite')
    check('Chargement' in page.locator('#pb-time').inner_text(), 'chargement affiché')
    page.wait_for_function("document.getElementById('pb-time').textContent.includes('Impossible de charger')", timeout=12000)
    check(True, 'après le délai maximal : « Impossible de charger les temps »')
    page.screenshot(path=f'{OUT}/fix-erreur-reseau.png')

    print('Chargement en parallèle')
    page, e = new_page(ctx, delay=2); all_errors += e
    t0 = time.time(); page.wait_for_function("swimmerDataStatus === 'loaded'", timeout=8000)
    check(time.time() - t0 < 3.5, f'2 fichiers de 2 s chargés en {time.time() - t0:.1f}s (et non 4 s)')
    cache = page.evaluate("loadSwimmersData().then(d => d.swimmers['5332548'])")
    check('seasonBests' not in cache and cache.get('gender') != 'Female' or 'seasonBests' not in cache, 'cache non modifié (pas de seasonBests ajouté)')

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

    print('Données JSON piégées')
    data = json.loads(DATA['swimmers-data.json'])
    pbs = data['swimmers']['5332548']['personalBests']
    pbs[0]['timeDisplay'] = '<img src=x onerror="window.__xss=1">'
    season = json.loads(DATA['swimmers-season.json']); season['_metadata']['season']['label'] = '<img src=x onerror="window.__xss=2">'
    page, e = new_page(ctx, data={'swimmers-data.json': json.dumps(data), 'swimmers-season.json': json.dumps(season)}); all_errors += e
    page.wait_for_function("swimmerDataStatus === 'loaded'")
    page.click('#header-settings'); page.click('summary'); page.click('.btn-back'); page.click('#header-avatar')
    for tab in ('times', 'progress'):
        page.keyboard.press('Escape'); page.click(f'.nav-tab[data-tab={tab}]')
    page.wait_for_timeout(300)
    check(page.evaluate('window.__xss') is None and page.locator('main img, #swimmer-popup img').count() == 0, 'aucun HTML injecté depuis le JSON')

    print('BUG-08 : changement de genre pendant le chargement')
    ref, e = new_page(ctx, profile={**P, 'gender': 'M'}); all_errors += e
    ref.wait_for_function("swimmerDataStatus === 'loaded'"); ref.click('.nav-tab[data-tab=progress]')
    expected = ref.locator('.progress-card').all_inner_texts()
    page, e = new_page(ctx, delay=3); all_errors += e
    page.wait_for_selector('.nav', state='visible'); page.click('#header-settings'); page.click('text=Modifier le profil')
    page.click('text=Homme'); page.click('#profile-submit')
    page.wait_for_function("swimmerDataStatus === 'loaded'", timeout=8000)
    page.click('.btn-back'); page.click('.nav-tab[data-tab=progress]')
    check(page.locator('.progress-card').all_inner_texts() == expected, f'Progression calculée en Homme {expected}')

    print('BUG-09 : popup pendant le chargement et en erreur')
    page, e = new_page(ctx, delay=3); all_errors += e
    page.wait_for_selector('.nav', state='visible'); page.click('#header-avatar')
    stats = page.locator('.swimmer-popup-stat-value').all_inner_texts()
    check(stats[1:] == ['…', '…'] and 'Chargement' in page.locator('#swimmer-popup').inner_text(), f'chargement : {stats}')
    page.wait_for_function("swimmerDataStatus === 'loaded'", timeout=8000)
    check(page.locator('#swimmer-popup').is_visible() and page.locator('.swimmer-popup-stat-value').nth(1).inner_text() == str(len(json.loads(DATA['swimmers-data.json'])['swimmers']['5332548']['personalBests'])), 'popup mise à jour à la fin du chargement')
    check(page.evaluate('document.activeElement.className') == 'swimmer-popup-close', 'focus conservé pendant la mise à jour')
    page, e = new_page(ctx, hang=True); all_errors += e
    page.wait_for_function("swimmerDataStatus === 'error'", timeout=12000); page.click('#header-avatar')
    check(page.locator('.swimmer-popup-stat-value').all_inner_texts()[1:] == ['—', '—'] and 'Impossible de charger' in page.locator('#swimmer-popup').inner_text(), 'erreur : « — » et message, pas de faux zéro')

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
