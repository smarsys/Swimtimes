# SwimTimes - CLAUDE.md

## Description du projet

Application web pour le suivi des temps de natation et des qualifications aux compétitions suisses (RSR, Championnats Suisses). Développée pour le club Lausanne Aquatique.

**URL de production** : Hébergé sur Jelastic/Infomaniak
**Repo GitHub** : smarsys/Swimtimes-main

## Architecture

```
Swimtimes/
├── index.html                  # Page principale (HTML + CSS inline)
├── app.js                      # Logique JavaScript (vanilla JS, pas de framework)
├── manifest.json               # Manifeste PWA (pas encore de service worker)
├── icon-192.svg, icon-512.svg  # Icônes PWA
├── logo-lausanne-aquatique.png # Logo du club
│
├── athletes.txt                # Liste des IDs SwimRankings à suivre
├── swimmers-data.json          # Données des nageurs (PB all-time)
├── swimmers-season.json        # Données des nageurs (temps saison courante)
├── temps-limites.json          # Temps de qualification par compétition
│
├── fetch_swimmers.py           # Scraping PB all-time (Python + Playwright, local)
├── fetch_swimmers_season.py    # Scraping temps saison (Python + Playwright, local)
├── cloudflare-worker.js        # Proxy CORS vers SwimRankings (non utilisé par app.js actuellement)
│
├── .github/workflows/          # GitHub Actions (désactivés - Cloudflare)
│   ├── update-swimmers.yml
│   └── update-swimmers-season.yml
│
├── DEPLOIEMENT-INFOMANIAK.md   # Guide de déploiement Jelastic/Infomaniak
├── GUIDE-CLOUDFLARE-WORKER.md  # Guide de déploiement du worker proxy
└── GUIDE-INSTALLATION.md       # Guide d'installation
```

## Stack technique

- **Frontend** : HTML5, CSS3, JavaScript vanilla (ES6+)
- **Données** : Fichiers JSON statiques
- **Scraping** : Python + Playwright (manuel, Cloudflare bloque l'automatisation)
- **Hébergement** : Jelastic (Infomaniak)
- **CI/CD** : GitHub Actions (désactivé)

## Fonctionnalités actuelles

### Onglet "Temps limites"
- Sélecteurs : genre (H/F), bassin (25m/50m), nage, distance
- Tableau 4 colonnes : Compétition (+ temps limite), PB (💪 si qualifié), Saison, Écart
- Statuts : ✓ qualifié (vert), ⏳ à refaire (orange), +X.XXs (jaune/rouge)
- Points FINA affichés sous les temps

### Onglet "Progression"
- Résumé en 3 cartes : Qualifiés / À refaire / Objectifs
- Tableau 1 : "À refaire cette saison" (PB ok, temps saison manquant)
- Tableau 2 : "Prochains objectifs" (PB pas encore au niveau, < +100 pts)
- Section : "Qualifié cette saison"

### Header
- Logo + titre à gauche ; à droite 🔄 (sync, inactif jusqu'à la Phase 2), ⚙️ (Paramètres), avatar
- Avatar avec initiales du profil (clic → popup infos)

### Profil et Paramètres (v2, en cours – voir SPECS-V2.md)
- Mono-utilisateur : profil saisi dans l'app, stocké en localStorage (`swimtimes_profile`)
- Sans profil : écran de configuration, onglets bloqués
- ⚙️ → écran Paramètres (profil, records, données) ; plus d'onglet Profil ni de sélecteur de nageur
- Modifier le profil (Paramètres), supprimer ses données (confirmation `<dialog>`), reprise automatique du profil v1 (`swimmer_profile`)
- Temps lus depuis `swimmers-data.json` via l'ID du profil jusqu'à la Phase 3 (`TODO Phase 3`)

## Conventions de code

### JavaScript
- Fonctions async/await pour les chargements
- Nommage camelCase
- Pas de framework, vanilla JS uniquement
- Commentaires en français

### CSS
- Variables CSS pour les couleurs (--primary, --success, etc.)
- Contraste WCAG AA : cartes, champs et tableaux sur `var(--surface)` / `var(--surface-strong)` (plus sombres que le fond rouge) ; texte secondaire à opacité ≥ .9 sur une surface, 1 sur le fond ; jamais d'erreur en rouge (bordure blanche + message sur fond sombre)
- Mobile-first, responsive
- Classes BEM-like (.status-badge, .status-qualified, etc.)

### Données
- JSON avec structure : `{ swimmers: [...], _metadata: { updated: "ISO date" } }`
- Temps au format "MM:SS.cc" ou "SS.cc"
- Points FINA en entier

## Saison de natation

- Définition : 1er septembre → 31 août
- Calcul du paramètre `pbest` pour SwimRankings : mois >= 9 → année+1, sinon année courante
- Exemple : novembre 2025 → pbest=2026 (saison 2025-2026)

## Backlog / Améliorations à faire

### Priorité haute
- [ ] Solution pérenne pour le scraping (Cloudflare bloque)
- [ ] Synchronisation automatique des données

### Priorité moyenne
- [ ] PWA avec mode offline (manifest.json en place, service worker à créer)
- [ ] Notifications push pour nouveaux temps
- [ ] Historique de progression (graphiques)
- [ ] Export PDF des qualifications

### Priorité basse
- [ ] Multi-langue (FR/DE/EN)
- [ ] Thème sombre
- [ ] Comparaison entre nageurs

## Commandes utiles

```bash
# Lancer le scraping local (nécessite login manuel pour Cloudflare)
source ~/swimscraper/bin/activate
python fetch_swimmers.py
python fetch_swimmers_season.py

# Lancer les tests (Node + Python avec Playwright, voir tests/README.md)
PYTHON=~/swimscraper/bin/python tests/run_all.sh

# Déployer sur Jelastic
# Via File Manager ou git push (si configuré)
# Avant chaque déploiement qui modifie app.js : changer la version dans index.html
# (<script src="app.js?v=AAAAMMJJ">), sinon les navigateurs peuvent garder l'ancien app.js en cache
```

## Contacts / Contexte

- **Club** : Lausanne Aquatique
- **Source données** : swimrankings.net (protégé Cloudflare depuis 2026)
- **Compétitions suivies** : RSR (Romands), CS (Championnats Suisses)
