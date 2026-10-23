# SwimTimes – Maintenance

Opérations récurrentes pour garder les calculs et les temps limites à jour.

---

## 1. Mise à jour annuelle des temps de base FINA

Les points FINA affichés dans l'app sont calculés avec la formule de World Aquatics :

```
points = 1000 × (temps de base / temps du nageur)³   (arrondi vers le bas, comme SwimRankings)
```

Les temps de base sont dans le bloc `FINA_BASE_TIMES` en haut d'`app.js`.

**Quand** : début septembre, après publication par World Aquatics (généralement dans les jours suivant le 1er septembre)

**Procédure** :
1. Aller sur https://www.worldaquatics.com/swimming/points
2. Télécharger le PDF "Base Times SCM and LCM" de l'année en cours
3. Mettre à jour `FINA_BASE_TIMES` dans app.js avec les nouvelles valeurs (en secondes)
4. Mettre à jour le commentaire de version en haut du bloc
5. Changer `app.js?v=YYYYMMDD` dans index.html
6. Tester le calcul des points sur quelques temps connus
7. Commiter, PR, déployer

**Validité** :
- SCM (25m) : 1er septembre → 31 août
- LCM (50m) : 1er janvier → 31 décembre

> **À noter** : les deux bassins n'ont pas la même période de validité. La mise à jour de septembre apporte les nouvelles bases **SCM** (petit bassin) ; les bases **LCM** (grand bassin) courent sur l'année civile. Si World Aquatics publie de nouvelles bases LCM pour le 1er janvier, refaire la procédure en janvier pour le seul grand bassin.

### Détails

**Structure du bloc** (`app.js`) :

```javascript
// =============================================================================
// FINA 2026 BASE TIMES (from official World Aquatics - September 2026)
// LCM: valid 01.01.2026 – 31.12.2026
// SCM: valid 01.09.2026 – 31.08.2027
// Source: https://www.worldaquatics.com/swimming/points
// Format: seconds (converted from mm:ss.cc)
// =============================================================================
const FINA_BASE_TIMES = {
    Male: {
        "25m": { "50_Freestyle": 19.90, "100_Freestyle": 44.84, /* … */ },
        "50m": { /* … */ }
    },
    Female: {
        "25m": { /* … */ },
        "50m": { /* … */ }
    }
};
```

- Genre : `Male` / `Female` ; bassin : `"25m"` (SCM) / `"50m"` (LCM)
- Épreuve : `"<distance>_<nage>"`, nages en anglais : `Freestyle`, `Backstroke`, `Breaststroke`, `Butterfly`, `Medley`
- Valeurs **en secondes** : `1:38.61` → `98.61`, `14:06.88` → `846.88`
- Garder les mêmes 70 épreuves (35 par genre) ; une épreuve absente ne donne pas de points (`null`)
- Signaler les valeurs modifiées par un commentaire `// Updated from <ancienne valeur>` aide à relire la PR

**Étape 6, tester le calcul** :
- Dans l'app, importer une page SwimRankings et comparer les points affichés (onglet Temps, sous le PB) à ceux de SwimRankings pour quelques épreuves : ils doivent être identiques (SwimRankings recalcule les points avec les bases en vigueur).
- Lancer les tests : `PYTHON=~/swimscraper/bin/python tests/run_all.sh`. Le test `tests/test_us017_018_affichage.py` compare les points calculés à ceux enregistrés dans les échantillons `tests/fixtures/swimrankings/`, capturés en octobre 2026 avec les bases 2026. Après une mise à jour des bases, **ce test échouera** pour les épreuves dont la base a changé : recapturer les pages d'échantillon sur SwimRankings (puis remplacer noms et IDs des nageurs, voir `tests/fixtures/swimrankings/README.md`), ou adapter la vérification.

---

## 2. Ajout de temps limites pour une nouvelle compétition

**Fichier** : temps-limites.json

**Procédure** :
1. Récupérer les temps limites officiels de la compétition
2. Ajouter une entrée dans temps-limites.json avec le format existant
3. Tester l'affichage dans l'onglet Temps limites
4. Commiter, PR, déployer

> **Documents sources (étape 1)** : enregistrer le document officiel des temps limites (PDF de la fédération ou de l'association) dans le dossier `Temps Limites Sources/` à la racine du projet (ex. `Limiten-KBSM-2025-2028.pdf`), et citer sa provenance dans `_metadata.sources` de `temps-limites.json`. On garde ainsi la trace de l'origine de chaque valeur.

> **À ne pas oublier (étape 2)** : déclarer la compétition dans `categories` (sinon elle s'affiche avec son code brut et sans icône), et ajouter son code à la liste `categoryOrder` de `updateProgressDisplay()` dans `app.js`, à sa place par ordre de prestige. Un code absent de cette liste est considéré par l'onglet Progression comme le niveau le plus élevé.

### Format du fichier `temps-limites.json`

Le fichier est chargé par l'app au démarrage (`loadTimeStandards()`). Il contient six clés :

```json
{
  "_metadata": { … },
  "Female":     { "50m": { … }, "25m": { … } },
  "Male":       { "50m": { … }, "25m": { … } },
  "categories": { … },
  "strokes":    { … },
  "distances":  { … }
}
```

#### `_metadata` : informations sur le fichier

```json
"_metadata": {
  "version": "2025-2028",
  "lastUpdated": "2025-12-12",
  "sources": {
    "CS": "Swiss Aquatics - Championnats Suisses Grand Bassin 2025-2028",
    "RSR_Hiver": "Association RSR - Limites Hiver 2024-2028 (25m)"
  }
}
```

- `version` : période couverte par les temps limites
- `lastUpdated` : date de dernière modification (AAAA-MM-JJ) — à mettre à jour à chaque changement
- `sources` : provenance officielle de chaque série de temps limites, par code de compétition

#### `Female` / `Male` : les temps limites

Genre → bassin (`"50m"` ou `"25m"`) → épreuve → code de compétition → temps limite.

```json
"Female": {
  "25m": {
    "50_Freestyle": { "RSR_Hiver": "00:29.40", "CS_Hiver": "00:27.82" },
    "100_Freestyle": { "RSR_Hiver": "01:04.10", "CS_Hiver": "01:00.23" }
  },
  "50m": {
    "50_Freestyle": { "RSR_Ete": "00:30.40", "CS": "00:28.39", "JO_B": "00:24.81", "JO_A": "00:24.56" }
  }
}
```

- Épreuve : `"<distance>_<nage>"`, même nommage que `FINA_BASE_TIMES` (nages en anglais)
- Temps limite : texte `"MM:SS.cc"`, avec `00:` devant les temps de moins d'une minute (`"00:29.40"`, `"02:26.00"`)
- Une compétition n'est présente que pour les épreuves où elle a un temps limite
- Les temps d'une compétition vont dans le bassin où elle se nage (même valeur que son `poolLength`, ci-dessous)

#### `categories` : les compétitions

Une entrée par code de compétition utilisé dans `Female` / `Male` :

```json
"categories": {
  "RSR_Hiver": {
    "name": "Champ. Romands Hiver",
    "shortName": "RSR Hiver",
    "icon": "❄️",
    "color": "#06b6d4",
    "poolLength": 25,
    "description": "Championnats Romands Hiver - Bassin 25m"
  }
}
```

| Champ | Rôle |
|-------|------|
| `name` | Nom affiché dans les tableaux (Temps et Progression) |
| `shortName` | Nom court |
| `icon` | Émoji associé |
| `color` | Couleur associée (hexadécimal) |
| `poolLength` | `25` ou `50` : la compétition n'apparaît que pour ce bassin ; `null` : les deux bassins |
| `description` | Description complète |

Codes existants : `RSR_Ete`, `RSR_Hiver` (Championnats Romands), `CS`, `CS_Hiver` (Championnats Suisses), `JO_B`, `JO_A` (Jeux Olympiques LA28). Un code qui contient `JO` est mis en évidence dans l'onglet Temps (liseré jaune).

#### `strokes` : les nages

```json
"strokes": {
  "Freestyle": { "fr": "Nage Libre", "abbr": "NL" },
  "Backstroke": { "fr": "Dos", "abbr": "Dos" },
  "Breaststroke": { "fr": "Brasse", "abbr": "Br" },
  "Butterfly": { "fr": "Papillon", "abbr": "Pap" },
  "Medley": { "fr": "4 Nages", "abbr": "4N" }
}
```

Libellés français et abréviations affichés dans l'app. Les clés en anglais sont aussi celles des temps importés depuis SwimRankings : ne pas les renommer.

#### `distances` : les distances proposées

```json
"distances": {
  "Freestyle": [50, 100, 200, 400, 800, 1500],
  "Backstroke": [50, 100, 200],
  "Breaststroke": [50, 100, 200],
  "Butterfly": [50, 100, 200],
  "Medley": [100, 200, 400]
}
```

Distances du sélecteur de l'onglet Temps, par nage. Une épreuve qui a des temps limites mais dont la distance n'est pas listée ici ne peut pas être sélectionnée.

### Étape 3, tester l'affichage

- Recharger l'app (rechargement complet, Cmd+Maj+R / Ctrl+F5 : le fichier peut être gardé en cache par le navigateur)
- Onglet **Temps** : choisir le genre, le bassin, la nage et la distance concernés ; la nouvelle compétition apparaît dans le tableau, triée de la plus facile à la plus difficile, avec son nom et son temps limite
- Onglet **Progression** : vérifier que la compétition apparaît dans les objectifs et qualifications pour un nageur dont les temps sont importés
- Lancer les tests : `PYTHON=~/swimscraper/bin/python tests/run_all.sh` (dont l'audit de contraste, qui parcourt toutes les épreuves)
