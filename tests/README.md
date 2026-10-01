# Tests SwimTimes

Tests automatiques de la Phase 1 (profil utilisateur, US-001 à US-009). Les tests navigateur ouvrent l'app dans Chromium via Playwright : chacun sert la racine du dépôt sur un port libre et remplace les fichiers GitHub (`swimmers-data.json`, `swimmers-season.json`) par les copies locales.

## Prérequis

- Node.js (pour `test_us001_stockage.js`)
- Python 3 avec Playwright :
  ```bash
  pip install playwright
  playwright install chromium
  ```
  L'environnement de scraping du projet (`~/swimscraper`) convient aussi.

## Lancer

```bash
tests/run_all.sh                                   # tout (python3 par défaut)
PYTHON=~/swimscraper/bin/python tests/run_all.sh   # avec un autre Python
python3 tests/test_us004_header.py                 # un seul fichier
```

`run_all.sh` renvoie un code de sortie non nul si un test échoue. Les captures d'écran sont écrites dans `tests/screenshots/` (ignoré par git). Durée totale : environ 10 minutes, dont une grande partie pour les audits de contraste et les scénarios de réseau lent.

## Contenu

| Fichier | Couvre |
|---------|--------|
| `test_us001_stockage.js` | US-001 : stockage du profil (Node, faux `localStorage`, section « STOCKAGE LOCAL » d'`app.js`) |
| `test_us002_configuration.py` | US-002 : écran de configuration |
| `test_us004_header.py` | US-004 : header, popup de l'avatar |
| `test_us005_parametres.py` | US-005 : écran Paramètres |
| `test_us003_006_007_008_009.py` | US-003, 006, 007, 008, 009 |
| `test_qa1_corrections.py` | Corrections de la 1re passe QA / review (`QA-PHASE-1.md`, `REVIEW-PHASE-1.md`) |
| `test_qa2_corrections.py` | Corrections de la 2e passe (`QA-PHASE-1-PARTIE-2.md`, `REVIEW-PHASE-1-PARTIE-2.md`) |
| `test_bug19_appui_long.py` | BUG-19 : appui long sur le bouton de confirmation |
| `audit_contraste.py` | Contraste WCAG AA de chaque texte visible, tous écrans, 375 et 1200 px (s'appuie sur `contrast.js`) |
| `audit_contraste_lignes_jo.py` | Contraste des lignes JO pour toutes les épreuves |

## À savoir

- Les tests s'appuient sur les données du club présentes dans le dépôt (nageur `5332548`, Ava Hehlen). Si ces données changent beaucoup, certains scénarios devront être adaptés.
- Seul Chromium est testé. Le comportement sur iOS Safari (double tap, bottom sheet) reste à vérifier à la main.
- Les délais simulés (réseau lent, délai de 1 s de la confirmation) rendent certains tests sensibles à une machine très chargée.
