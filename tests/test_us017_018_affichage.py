"""US-017 : affichage des temps importés dans les onglets ; US-018 : plus de données du club chargées depuis GitHub."""
import json
import os

from playwright.sync_api import sync_playwright

from helpers import ROOT, OUT, start_server, fixture, fixture_times, storage_script, FIXED_DATE_SCRIPT

srv, URL = start_server()
ok = 0
all_errors = []


def check(cond, label):
    global ok
    if not cond:
        raise AssertionError(label)
    ok += 1
    print('  ✓', label)


PROFILE = {'name': 'Swimmer One Test', 'swimrankingsId': '9999001', 'gender': 'F', 'birthYear': '2010', 'createdAt': '2026-01-01T00:00:00Z'}
FIXED_DATE = FIXED_DATE_SCRIPT  # Échantillons de la saison 2026-2027 : la page vit le 15 octobre 2026


def to_ms(text):
    minutes, rest = text.split(':') if ':' in text else ('0', text)
    seconds, centis = rest.split('.')
    return (int(minutes) * 60 + int(seconds)) * 1000 + int(centis) * 10


def new_page(browser, entries=None):
    page = browser.new_page(viewport={'width': 375, 'height': 812})
    requests = []
    page.on('request', lambda r: requests.append(r.url))
    page.on('pageerror', lambda e: all_errors.append(str(e)))
    page.add_init_script(FIXED_DATE + "if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.clear();"
                         f" localStorage.setItem('swimtimes_profile', {json.dumps(json.dumps(PROFILE))});" + storage_script(entries or {}) + " }")
    page.goto(URL)
    page.wait_for_selector('.nav', state='visible')
    page.requests = requests
    return page


def show_event(page, pool, stroke, distance):
    page.click('.nav-tab[data-tab=times]')
    page.select_option('#select-pool', pool)
    page.select_option('#select-stroke', stroke)
    page.select_option('#select-distance', distance)
    return page.locator('#pb-time').inner_text()


def import_page(page, name):
    page.click('#header-sync')
    page.fill('#sync-html', fixture(name))
    page.click('#sync-import')
    message = page.locator('#sync-message').inner_text()
    page.click('text=Terminer')
    return message


with sync_playwright() as p:
    browser = p.chromium.launch()

    print('Avant tout import')
    page = new_page(browser)
    check('Aucune donnée' in show_event(page, '50m', 'Freestyle', '50'), 'Temps : « Aucune donnée »')
    page.click('.nav-tab[data-tab=progress]')
    check('Aucune donnée' in page.locator('#progress-content').inner_text(), 'Progression : « Aucune donnée »')
    page.click('#header-settings')
    check(page.locator('#settings-last-sync').inner_text() == 'Jamais synchronisé', 'Paramètres : « Jamais synchronisé »')
    check('Temps affichés' not in page.locator('#settings-screen').inner_text(), 'plus de ligne « Temps affichés » (US-018)')
    page.click('.btn-back')

    print('Import des meilleurs temps : mise à jour immédiate')
    import_page(page, 'nageur1-meilleurs-temps.html')
    pb_text = show_event(page, '50m', 'Freestyle', '50')
    check('PB: 27.80' in pb_text and 'Pas encore nagé cette saison' in pb_text, f'Temps 50 m NL grand bassin : « {pb_text} »')
    check('pts FINA' in pb_text, 'points FINA calculés')
    check('PB: 2:09.54' in show_event(page, '50m', 'Freestyle', '200'), 'temps « M:SS.cc » affiché (200 m NL : 2:09.54)')
    page.click('.nav-tab[data-tab=progress]')
    check(page.locator('.progress-card').count() == 3, 'Progression : cartes affichées')
    page.click('#header-settings')
    check(page.locator('#settings-last-sync').inner_text() != 'Jamais synchronisé', f'Paramètres : dernière synchronisation « {page.locator("#settings-last-sync").inner_text()} »')
    check('Mes records personnels (39)' in page.locator('#settings-screen').inner_text(), 'Paramètres : 39 records')
    check('SUI' in page.locator('#settings-details').inner_text(), 'Paramètres : nation lue sur la page SwimRankings')
    page.click('.btn-back')

    print('Import de la saison')
    import_page(page, 'nageur1-saison.html')
    season_time = next(t for t in fixture_times('nageur1-saison.html') if t['course'] == '25m' and t['event'] == '50m Freestyle')['time']
    text = show_event(page, '25m', 'Freestyle', '50')
    check(f'2026-2027: {season_time}' in text, f'Temps 50 m NL petit bassin : saison 2026-2027 « {text} »')
    page.click('#header-avatar')
    stats = page.locator('.swimmer-popup-stat-value').all_inner_texts()
    check(stats[1:] == ['39', '11'] and '2026-2027' in page.locator('#swimmer-popup').inner_text(), f'popup : 39 PB, 11 temps de la saison 2026-2027 ({stats})')
    page.keyboard.press('Escape')
    page.screenshot(path=os.path.join(OUT, 'us017-temps.png'))

    print('Rechargement')
    page.reload(); page.wait_for_selector('.nav', state='visible')
    check(f'2026-2027: {season_time}' in show_event(page, '25m', 'Freestyle', '50'), 'temps importés affichés dès l\'ouverture')
    page.wait_for_timeout(500)
    check(not [u for u in page.requests if 'githubusercontent' in u or 'swimmers-' in u], 'aucune requête vers GitHub ni vers swimmers-*.json (US-018)')

    print('Conversion des temps importés')
    converted = page.evaluate("""() => getPBs().data.map(toDisplayTime)""")
    stored_times = fixture_times('nageur1-meilleurs-temps.html')
    check(len(converted) == len(stored_times) and all(c is not None for c in converted), 'tous les temps convertis')

    check(all(c['timeMs'] == to_ms(s['time']) and c['poolLength'] == int(s['course'][:2]) and c['timeDisplay'] == s['time']
              for c, s in zip(converted, stored_times)), 'timeMs, poolLength et timeDisplay corrects pour chaque temps')

    print('Saison passée')
    old_season = {'swimtimes_pb': json.dumps({'updated': '2026-05-01T08:00:00.000Z', 'nation': 'SUI', 'data': fixture_times('nageur1-meilleurs-temps.html')}),
                  'swimtimes_season': json.dumps({'season': '2025-2026', 'updated': '2026-05-01T08:00:00.000Z', 'data': fixture_times('nageur1-saison.html')})}
    page = new_page(browser, old_season)
    text = show_event(page, '25m', 'Freestyle', '50')
    check('2025-2026' not in text and '2026-2027:' not in text and 'Pas encore nagé cette saison' in text,
          f'temps de la saison 2025-2026 non présentés comme ceux de la saison en cours (« {text} »)')
    page.click('#header-avatar')
    check(page.locator('.swimmer-popup-stat-value').all_inner_texts()[2] == '0', 'popup : 0 temps sur la saison en cours')

    print('Qualifications : comparaison avec un calcul indépendant (temps-limites.json)')
    standards = json.load(open(os.path.join(ROOT, 'temps-limites.json'), encoding='utf-8'))['Female']
    pbs = {(t['distance'], t['stroke'], t['course']): to_ms(t['time']) for t in stored_times}
    page = new_page(browser, {'swimtimes_pb': json.dumps({'updated': '2026-10-15T08:00:00.000Z', 'nation': 'SUI', 'data': stored_times})})
    compared = mismatches = 0
    for pool, events in standards.items():
        for key, limits in events.items():
            distance, stroke = key.split('_')
            pb = pbs.get((int(distance), stroke, '25m' if pool == '25m' else '50m'))
            if pb is None or str(distance) not in page.evaluate('s => (DISTANCES[s] || []).map(String)', stroke):
                continue
            show_event(page, pool, stroke, distance)
            expected = sum(1 for limit in limits.values() if pb <= to_ms(limit.replace('00:', '', 1) if limit.startswith('00:') else limit))
            shown = page.locator('#times-table .pb-icon-cell', has_text='💪').count()
            compared += 1
            if shown != expected:
                mismatches += 1
                print(f'      écart : {pool} {key} attendu {expected} 💪, affiché {shown}')
    check(compared >= 20 and mismatches == 0, f'{compared} épreuves × bassins : nombre de temps limites atteints par le PB identique au calcul indépendant')

    print('Points FINA : identiques à SwimRankings (arrondi vers le bas, bases 2026)')
    for name, gender in (('nageur1-meilleurs-temps.html', 'Female'), ('nageur1-saison.html', 'Female'), ('nageur2-meilleurs-temps.html', 'Male')):
        rows = page.evaluate("""([times, gender]) => times.map(t => [calculateFinaPoints(timeToMs(t.time), gender, t.course === '25m' ? 25 : 50, t.stroke, t.distance), t.finaPoints])
            .filter(([app, sr]) => app !== null && sr > 0)""", [fixture_times(name), gender])
        same = sum(1 for app, sr in rows if app == sr)
        check(rows and same == len(rows), f'{name} : {same}/{len(rows)} points identiques à SwimRankings')

    print('Saison importée sans les meilleurs temps (BUG-P2-02)')
    season_only = {'swimtimes_season': json.dumps({'season': '2026-2027', 'updated': '2026-10-15T08:00:00.000Z', 'data': fixture_times('nageur1-saison.html')})}
    page = new_page(browser, season_only)
    page.click('.nav-tab[data-tab=progress]')
    text = page.locator('#progress-content').inner_text()
    check('Importe aussi tes meilleurs temps' in text and 'Aucune donnée' not in text, f'Progression : « {text.strip()} »')
    check('2026-2027:' in show_event(page, '25m', 'Freestyle', '50'), 'Temps : temps de la saison affichés')

    print('Temps stockés pour un autre ID')
    other = {'swimtimes_pb': json.dumps({'updated': '2026-10-15T08:00:00.000Z', 'athleteId': '9999002', 'nation': 'SUI',
                                         'data': fixture_times('nageur2-meilleurs-temps.html')})}
    page = new_page(browser, other)
    check('Aucune donnée' in show_event(page, '50m', 'Freestyle', '50'), 'temps d\'un autre ID ignorés')

    print('Données stockées corrompues')
    corrupted = {'swimtimes_pb': json.dumps({'updated': None, 'data': [None, 'texte', {'event': '50m Freestyle', 'distance': 50,
                 'stroke': 'Freestyle', 'course': '50m', 'time': 27.8}, {'event': '100m Freestyle', 'distance': 100, 'stroke': 'Freestyle',
                 'course': '50m', 'time': '59.42', 'finaPoints': 659, 'date': '24 May 2026', 'city': 'Renens', 'meet': 'Meeting'}]})}
    page = new_page(browser, corrupted)
    check(page.locator('#header-avatar').inner_text() == 'ST', 'démarrage complet malgré des temps illisibles')
    check('PB: 59.42' in show_event(page, '50m', 'Freestyle', '100') and 'Pas encore de temps' in show_event(page, '50m', 'Freestyle', '50'),
          'seuls les temps lisibles sont affichés')
    page.click('#header-settings')
    check(page.locator('#settings-last-sync').inner_text() == 'Jamais synchronisé' and
          'header-btn--stale' not in page.locator('#header-sync').get_attribute('class'),
          'date de synchronisation vide : ni « il y a 20 741 jours » ni badge')

    print('US-018 : code')
    source = open(os.path.join(ROOT, 'app.js'), encoding='utf-8').read()
    check('TODO Phase 3' not in source and 'raw.githubusercontent.com' not in source and 'swimmers-data.json' not in source,
          'app.js : plus de marqueur TODO Phase 3 ni de chargement des fichiers du club')

    check(not all_errors, f'aucune erreur JS {all_errors}')
    browser.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
