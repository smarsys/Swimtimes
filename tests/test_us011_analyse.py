"""US-011 : analyse du HTML SwimRankings (parseSwimRankingsPage) sur les échantillons de tests/fixtures/swimrankings."""
import html
import os
import re

from playwright.sync_api import sync_playwright

from helpers import ROOT, start_server, fixture, fixture_times

srv, URL = start_server()
FIXTURES = os.path.join(ROOT, 'tests', 'fixtures', 'swimrankings')
ok = 0


def check(cond, label):
    global ok
    if not cond:
        raise AssertionError(label)
    ok += 1
    print('  ✓', label)



with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    parse = lambda source: page.evaluate('source => parseSwimRankingsPage(source)', source)

    print('Pages nageur')
    cases = [
        ('nageur1-meilleurs-temps.html', '9999001', 'pb', None),
        ('nageur1-saison.html', '9999001', 'season', 2027),
        ('nageur2-meilleurs-temps.html', '9999002', 'pb', None),
        ('nageur2-saison.html', '9999002', 'season', 2027),
        ('nageur3-peu-de-temps.html', '9999003', 'season', 2027),
    ]
    names = {'9999001': 'Swimmer One Test', '9999002': 'Swimmer Two Test', '9999003': 'Swimmer Three Test'}
    for name, athlete_id, kind, season in cases:
        source = fixture(name)
        result = parse(source)
        check(result['ok'], f'{name} : analysée')
        data = result['page']
        check((data['athleteId'], data['kind'], data['seasonYear']) == (athlete_id, kind, season),
              f'{name} : ID {athlete_id}, type {kind}, saison {season}')
        check(data['name'] == names[athlete_id], f'{name} : nom « {data["name"]} »')
        expected = fixture_times(name)
        check(data['times'] == expected and data['ignored'] == 0, f'{name} : {len(expected)} temps identiques à l\'extraction indépendante, aucune ligne ignorée')

    pb = parse(fixture('nageur1-meilleurs-temps.html'))['page']['times']
    check(pb[0] == {'event': '25m Freestyle', 'distance': 25, 'stroke': 'Freestyle', 'course': '25m', 'time': '24.35',
                    'finaPoints': 78, 'date': '10 Feb 2018', 'city': 'Lausanne', 'meet': 'RSR: Kids-Ligue - Etape 2'},
          'premier temps de référence (date sans espace insécable)')
    check(not any('Lap' in t['event'] for t in pb), 'temps de passage « Lap » ignorés')
    check({t['stroke'] for t in pb} == {'Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Medley'}, 'les 5 nages reconnues')
    check(any(':' in t['time'] for t in pb) and all(isinstance(t['finaPoints'], int) for t in pb), 'temps « M:SS.cc », points entiers')
    check(parse(fixture('nageur2-saison.html'))['page']['times'] == [], 'saison sans temps : liste vide, sans erreur')
    check(len(parse(fixture('nageur3-peu-de-temps.html'))['page']['times']) == 2, 'peu de temps : 2 temps')
    incomplete = fixture('nageur3-peu-de-temps.html').replace(
        '<tr class="athleteBest0">', '<tr class="athleteBest0"><td class="event">100m Freestyle</td><td>25m</td><td>1:00.00</td></tr><tr class="athleteBest0">', 1)
    check(len(parse(incomplete)['page']['times']) == 2, 'ligne incomplète (moins de 7 cellules) ignorée')
    odd = fixture('nageur3-peu-de-temps.html').replace('>27.91<', '>DSQ<', 1)
    result = parse(odd)['page']
    check(len(result['times']) == 1 and result['ignored'] == 1, 'temps non reconnu (« DSQ ») : ligne ignorée et comptée, l\'autre temps importé')
    one_stroke = parse(fixture('nageur1-meilleurs-temps.html').replace('>50m Butterfly<', '>4x50m Medley Relay<'))['page']
    check(len(one_stroke['times']) == 37 and one_stroke['ignored'] == 2, 'relais sur 2 lignes : 37 temps importés, 2 lignes ignorées et comptées')
    six_cells = re.sub(r'<td class="code">.*?</td>', '', fixture('nageur1-saison.html'))
    check(parse(six_cells) == {'ok': False, 'error': 'unrecognized', 'count': 11},
          'BUG-P2-08 : colonne « Pts. » retirée sur toute la saison → refusée (pas de saison vide enregistrée)')
    one_short = parse(re.sub(r'<td class="code">.*?</td>', '', fixture('nageur1-meilleurs-temps.html'), count=1))['page']
    check(len(one_short['times']) == 38 and one_short['ignored'] == 1 and one_short['ignoredEvents'] == ['25m Freestyle 25m'],
          f'une ligne de 6 cellules : ignorée, comptée et nommée ({one_short["ignoredEvents"]})')
    renamed = parse(fixture('nageur1-saison.html').replace('class="athleteBest0"', 'class="row0"').replace('class="athleteBest1"', 'class="row1"'))
    check(renamed['ok'] and len(renamed['page']['times']) == 11, 'BUG-P2-05 : classe des lignes changée par SwimRankings → les 11 temps restent lus')
    season_source = fixture('nageur1-saison.html')
    all_bad = season_source.replace('Freestyle<', 'Freistil<').replace('Backstroke<', 'Rücken<').replace('Breaststroke<', 'Brust<') \
        .replace('Butterfly<', 'Delfin<').replace('Medley<', 'Lagen<')
    result = parse(all_bad)
    check(result['ok'] is False and result['error'] == 'unrecognized' and result['count'] == 11,
          f'saison entièrement illisible : refusée, sans remplacer les temps par une liste vide ({result})')

    print('Pages et contenus à refuser')
    reference = fixture('nageur1-meilleurs-temps.html')
    text_only = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', reference)))
    german = reference.replace('Personal bests, Alltime', 'Persönliche Bestzeiten, Alle').replace('Freestyle', 'Freistil')
    refused = [
        ('zone vide', '', 'empty'),
        ('espaces seuls', '   \n  ', 'empty'),
        ('texte de la page au lieu du code source', text_only, 'not-html'),
        ('défi Cloudflare', fixture('cloudflare.html'), 'cloudflare'),
        ('page de connexion', fixture('connexion.html'), 'login'),
        ('autre page HTML', '<html><body><p>Bonjour</p></body></html>', 'not-athlete'),
        ('page SwimRankings en allemand', german, 'language'),
    ]
    for label, source, error in refused:
        result = parse(source)
        check(result == {'ok': False, 'error': error}, f'{label} → {error}')
    check(page.evaluate('parseSwimRankingsPage(null)') == {'ok': False, 'error': 'empty'}, 'valeur nulle → empty')

    print('Robustesse')
    for cut in (0.25, 0.5, 0.75, 0.99):
        check(parse(reference[:int(len(reference) * cut)]) == {'ok': False, 'error': 'truncated'},
              f'page tronquée à {cut:.0%} → truncated (pas d\'import partiel)')
    check(parse(reference + '\n\n  ')['ok'], 'espaces après </html> acceptés')
    check(parse(reference + '\n<!-- page enregistrée -->\n')['ok'], 'commentaire après </html> accepté')
    for cut in (0.1, 0.5):
        check(parse(reference[int(len(reference) * cut):]) == {'ok': False, 'error': 'truncated'},
              f'début de page manquant ({cut:.0%}) → truncated, pas « autre langue » ni « pas une page nageur »')
    check(parse(reference + reference) == {'ok': False, 'error': 'multiple-pages'}, 'deux pages collées → multiple-pages')
    check(parse(reference[:len(reference) // 2] + reference) == {'ok': False, 'error': 'multiple-pages'},
          'page incomplète puis page complète (collage par-dessus) → multiple-pages')
    with_turnstile = reference.replace('</body>', '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></body>')
    check(parse(with_turnstile)['ok'], 'page nageur contenant un script Cloudflare : acceptée')
    with_html_string = reference.replace('</body>', '<script>var gabarit = "<html><body></body>";</script></body>')
    check(parse(with_html_string)['ok'], '« <html> » dans un script de la page : pas pris pour une 2e page')
    trapped = reference.replace('>Lausanne<', '><img src=x onerror="window.__xss=1">Lausanne<', 1) \
                       .replace('</body>', '<script>window.__xss = 2</script></body>')
    result = parse(trapped)
    page.wait_for_timeout(300)
    check(result['ok'] and result['page']['times'][0]['city'] == 'Lausanne', 'HTML piégé : données extraites en texte')
    check(page.evaluate('window.__xss') is None, 'HTML piégé : aucun script exécuté')

    check(not errors, f'aucune erreur JS {errors}')
    browser.close()
srv.shutdown()
print(f'\n✅ {ok} vérifications OK')
