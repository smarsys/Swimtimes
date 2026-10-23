# Échantillons de pages SwimRankings (US-010)

Pages HTML utilisées par les tests de l'analyse (US-011) et de l'import (US-013, US-014). Les noms et IDs des nageurs sont remplacés par des valeurs fictives (vérification : `python3 tests/fixtures/check_anonymisation.py`).

**Décision (2026-10-23, product owner)** : les autres données des pages (temps, dates, compétitions, identifiants de résultats `resultDetail` et de compétitions `meetId`) sont conservées telles quelles : elles sont publiques sur SwimRankings et ces fichiers ne servent qu'aux tests.

## Pages nageur

| Fichier | ID fictif | Nom | Genre | Né | Type de page | Lignes | Origine |
|---------|-----------|-----|-------|----|--------------|--------|---------|
| `nageur1-meilleurs-temps.html` | 9999001 | TEST, Swimmer One | F | 2010 | Meilleurs temps (Alltime) | 45, dont 6 « Lap » | réelle, anonymisée (référence) |
| `nageur1-saison.html` | 9999001 | TEST, Swimmer One | F | 2010 | Saison 2027 | 12, dont 1 « Lap » | réelle, anonymisée |
| `nageur2-meilleurs-temps.html` | 9999002 | TEST, Swimmer Two | M | 2001 | Meilleurs temps (Alltime) | 45, dont 10 « Lap » | réelle, anonymisée |
| `nageur2-saison.html` | 9999002 | TEST, Swimmer Two | M | 2001 | Saison 2027 | **0** (aucun temps) | réelle, anonymisée |
| `nageur3-peu-de-temps.html` | 9999003 | TEST, Swimmer Three | F | 2013 | Saison 2027 | 2 | réelle, anonymisée |

Pages générées avec Claude web à partir du HTML réel, puis anonymisées (noms, IDs).

## Pages d'erreur

| Fichier | Contenu | Origine |
|---------|---------|---------|
| `cloudflare.html` | Défi Cloudflare (« Just a moment... », `_cf_chl_opt`, `cf-turnstile-response`) | **inventée** : la structure ne reproduit pas la vraie page |
| `connexion.html` | Page de connexion (`loginForm`, champ mot de passe) | **inventée** : la structure ne reproduit pas la vraie page |

## Structure constatée sur les pages réelles

- Nom : `<title>Swimrankings - NOM, Prénom</title>` et `<div id="name">NOM, Prénom <br>(année …gender1.png = homme, gender2.png = femme…)</div>`
- Nation et club : `<div id="nationclub"><br>SUI - Switzerland<br>Club</div>`
- ID du nageur : dans les liens `athleteId=…`
- Type de page : `<b>Personal bests, Alltime</b>` (meilleurs temps) ou `<b>Personal bests, Season 2027</b>` (saison)
- Temps : `table.athleteBest`, lignes `tr.athleteBest0` / `tr.athleteBest1`, cellules `event`, `course`, `time`, `code` (points), `date`, `city`, `name` (compétition)
- Toutes les lignes ont 7 cellules. À ignorer : les lignes dont l'épreuve contient « Lap » (temps de passage)
- Dates avec espaces insécables (`10&nbsp;Feb&nbsp;2018`)

## Limite

Les pages d'erreur sont inventées et les pages nageur dérivent d'une capture unique. Avant chaque déploiement qui touche à l'analyse, faire un essai réel : copier le code de sa propre page SwimRankings et l'importer dans l'app.
