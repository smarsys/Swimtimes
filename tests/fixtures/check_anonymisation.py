"""Vérifie que les échantillons SwimRankings ne contiennent aucune donnée personnelle réelle.

Sans liste de vrais noms (le dépôt est public) : les seuls IDs nageur et noms de nageur
autorisés sont les fictifs, et aucun nom ni ID des données du club (swimmers-data.json) ne doit apparaître.
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
FICTIVE_IDS = {'9999001', '9999002', '9999003'}
FICTIVE_NAME = re.compile(r'^TEST, Swimmer (One|Two|Three)$')
# Noms propres présents dans des noms de compétitions (pas des nageurs)
ALLOWED_WORDS = {'louis'}  # « 4eme Meeting Louis Golay »

club = json.load(open(os.path.join(ROOT, 'swimmers-data.json'), encoding='utf-8'))
club_ids = {str(s.get('id')) for s in club['swimmers'].values()}
club_names = {s[k].lower() for s in club['swimmers'].values() for k in ('firstName', 'lastName')
              if s.get(k) and len(s[k]) > 2} - ALLOWED_WORDS

problems = []
for path in sorted(glob.glob(os.path.join(HERE, 'swimrankings', '*.html'))):
    name = os.path.basename(path)
    text = open(path, encoding='utf-8', errors='replace').read()
    lower = text.lower()
    for athlete_id in set(re.findall(r'athleteId=(\d+)', text)) - FICTIVE_IDS:
        problems.append(f'{name} : ID nageur non fictif {athlete_id}')
    for swimmer in re.findall(r'<div id="name">([^<]*)', text) + re.findall(r'<title>Swimrankings - ([^<]*)', text):
        if not FICTIVE_NAME.match(swimmer.strip()):
            problems.append(f'{name} : nom de nageur non fictif « {swimmer.strip()} »')
    problems += [f'{name} : ID des données du club {i}' for i in club_ids if re.search(rf'\b{i}\b', text)]
    problems += [f'{name} : nom des données du club « {n} »' for n in club_names if re.search(rf'\b{re.escape(n)}\b', lower)]
    problems += [f'{name} : adresse e-mail {m}' for m in re.findall(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', text)]

if problems:
    print('❌ Données personnelles possibles :')
    print('\n'.join(f'   {p}' for p in problems))
    sys.exit(1)
print('✅ Échantillons anonymisés')
