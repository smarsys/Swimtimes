# SwimTimes v2 – User Stories Phase 2 : Synchronisation et affichage des temps importés

Référence : `SPECS-V2.md` §2 (synchronisation), §3 (stockage), §4 (parsing), §6.4 (données obsolètes)

## Périmètre

**Inclus** : récupération des temps par copier-coller du code HTML des pages SwimRankings du nageur, analyse dans le navigateur, stockage en localStorage (`swimtimes_pb`, `swimtimes_season`), états de synchronisation.

**Décision (2026-10-01)** : la synchronisation se fait par **copier-coller du code HTML** (spec §2.3). Le fetch direct, l'iframe et le proxy Cloudflare Worker sont écartés : Cloudflare bloque les requêtes automatiques, et SwimRankings n'autorise pas la lecture de ses pages depuis un autre site. L'utilisateur doit être **connecté** à SwimRankings pour passer Cloudflare.

**Décisions (2026-10-23)** :
- **Phases 2 et 3 fusionnées**, sans déploiement intermédiaire : l'utilisateur voit ses temps dès qu'il les importe (US-017, US-018).
- **Données par appareil acceptées** : pas de transfert entre appareils pour l'instant. L'aide l'indique (US-016).
- **SwimRankings en anglais uniquement** : l'aide demande de régler le site en anglais (US-016). Multilingue possible plus tard.
- **Échantillons** : générés par le product owner avec Claude web, à partir d'au moins une page réelle anonymisée (US-010).

**Hors périmètre** :
- Export / import JSON, transfert entre appareils → Phase 4
- SwimRankings dans une autre langue que l'anglais

## Vue d'ensemble

| ID | Titre | Priorité | Estim. | Dépend de |
|----|-------|----------|--------|-----------|
| US-010 | Échantillons de pages SwimRankings | Must | S | — |
| US-011 | Analyse du HTML SwimRankings | Must | M | US-010 |
| US-012 | Fenêtre de synchronisation | Must | M | — |
| US-013 | Import et stockage des temps | Must | M | US-011, US-012 |
| US-014 | Messages d'erreur de l'import | Must | S | US-011, US-013 |
| US-015 | État de la synchronisation | Should | S | US-013 |
| US-016 | Aide selon l'appareil | Should | S | US-012 |
| US-017 | Afficher les temps importés | Must | M | US-013 |
| US-018 | Retrait des données du club | Must | S | US-017 |

Ordre d'implémentation conseillé : 010 → 011 → 012 → 013 → 017 → 014 → 018 → 015 → 016

---

## US-010 : Échantillons de pages SwimRankings

**En tant que** développeur
**Je veux** de vraies pages SwimRankings enregistrées dans le dépôt
**Afin de** construire et tester l'analyse sans dépendre de Cloudflare

### Critères d'acceptation
- [x] Le dossier `tests/fixtures/swimrankings/` contient, pour au moins 2 nageurs (une nageuse, un nageur) : la page des meilleurs temps et la page de la saison (`&pbest=2027`), en HTML complet tel qu'affiché par « code source »
- [x] Au moins un cas limite : un nageur avec peu de temps (ou aucun temps sur la saison)
- [x] Les pages « parasites » qu'un utilisateur pourrait coller par erreur sont aussi enregistrées : page du défi Cloudflare, page de connexion SwimRankings
- [ ] Un fichier `README.md` dans le dossier indique pour chaque fichier : nageur (ID), type de page, date de capture *(fait, sauf la date de capture, non fournie)*
- [x] Au moins une page **réelle** (capturée sur SwimRankings) sert de référence ; les autres pages sont soit réelles, soit **dérivées** d'une page réelle (valeurs modifiées, structure inchangée). L'origine de chaque fichier est indiquée dans le `README.md`
- [x] Toutes les pages sont **anonymisées** avant d'entrer dans le dépôt public : noms remplacés par « Nageur Test 1 », « Nageur Test 2 »…, IDs nageurs remplacés par des IDs fictifs partout (liens, formulaires, scripts). Une vérification automatique (`tests/fixtures/check_anonymisation.py`) confirme qu'aucun vrai nom ni vrai ID ne subsiste
- [ ] **Recette réelle avant déploiement** : import de la vraie page SwimRankings du product owner dans l'app, temps vérifiés à l'écran

### Notes techniques
- Pages fournies par le product owner (générées avec Claude web à partir du HTML réel), déposées dans `tests/fixtures/swimrankings/`
- Vérifier sur ces pages ce que suppose le parser fourni : `table.athleteBest`, lignes `tr[class^="athleteBest"]`, 7 cellules, lignes « Lap » à ignorer

### Avancement
- 5 pages nageur réelles anonymisées (dont une saison sans aucun temps) et 2 pages d'erreur **inventées** (Cloudflare, connexion) : leur détection reste approximative. Détails dans `tests/fixtures/swimrankings/README.md`
- Le README fourni avec les fichiers contenait les vrais noms et des débuts d'IDs : il n'a pas été versionné
- Les noms fictifs sont au format SwimRankings (« TEST, Swimmer One ») plutôt que « Nageur Test 1 », ce qui teste aussi la remise en ordre « Prénom Nom »
- La recette réelle reste à faire avant le déploiement
- **Décision (2026-10-23)** : pas d'anonymisation au-delà des noms et IDs des nageurs (identifiants de résultats et de compétitions conservés : données publiques, fichiers de test). Point bloquant 1 de `REVIEW-PHASE-2.md` clos par cette décision

### Priorité : Must
### Estimation : S

---

## US-011 : Analyse du HTML SwimRankings

**En tant que** nageur
**Je veux** que l'app comprenne le code de ma page SwimRankings
**Afin de** récupérer mes temps sans les ressaisir

### Critères d'acceptation
- [x] **Given** le HTML d'une page de meilleurs temps, **When** il est analysé, **Then** chaque épreuve donne `{ event, distance, stroke, course, time, finaPoints, date, city, meet }` (format de la spec §3.1), avec les mêmes valeurs que la page
- [x] Les lignes « Lap » (temps de passage) sont ignorées
- [x] L'analyse identifie aussi : l'**ID du nageur**, son **nom**, et le **type de page** (meilleurs temps ou saison, avec l'année de saison)
- [x] Les nages et bassins sont reconnus sur la version **anglaise** de SwimRankings. Une page dans une autre langue est détectée et signalée (« Passe SwimRankings en anglais »), sans import partiel
- [x] Une page qui n'est pas une page nageur (défi Cloudflare, page de connexion, autre page, texte quelconque) est reconnue comme telle, sans erreur JS
- [x] Les temps sont validés (format `SS.cc` ou `M:SS.cc`), les points FINA sont des entiers (0 si absents)
- [x] Testé sur tous les échantillons d'US-010 (tests automatiques dans `tests/`)

### Notes techniques
- Base : le parser fourni (`DOMParser`, `table.athleteBest tr[class^="athleteBest"]`), validé avec Playwright
- `DOMParser` n'exécute pas les scripts du HTML collé. Les textes extraits restent des données externes : à échapper à l'affichage
- Fonction pure, sans accès au DOM de l'app ni à localStorage, pour être testable seule (comme la section « STOCKAGE LOCAL »)

### Avancement
- Implémentée : `parseSwimRankingsPage()` dans `app.js` (section « ANALYSE DES PAGES SWIMRANKINGS »), à partir du parser fourni. Erreurs typées : `empty`, `not-html`, `cloudflare`, `login`, `not-athlete`, `language`, `truncated`
- Ajout : une copie **incomplète** (sans `</html>` final) est refusée (`truncated`), pour ne jamais remplacer des données complètes par des données partielles
- Le nom est remis au format « Prénom Nom » (même fonction que la reprise v1)
- 44 vérifications dans `tests/test_us011_analyse.py`, comparées à une extraction indépendante en Python
- Après QA / review : une ligne de temps illisible fait refuser la page (`unrecognized`, avec le nombre de lignes) au lieu d'être ignorée en silence ; deux pages dans le même collage sont refusées (`multiple-pages`) ; une copie incomplète est détectée qu'il manque le début ou la fin (`</html>` n'a plus besoin d'être le dernier caractère) ; la détection Cloudflare ne s'applique qu'aux pages sans tableau de temps
- **Décision A (2026-10-23)** : les lignes de temps non reconnues (relais, DQ, NT, temps manuel…) sont ignorées et **annoncées** (« ✓ 39 temps importés · 2 lignes ignorées ») ; la page n'est refusée que si aucune ligne n'est lue (`unrecognized`). Les lignes sont lues quelle que soit leur classe (BUG-P2-05). Deux pages = deux doctypes ou deux `</html>` (un « <html> » dans un script n'en est pas une)
- Après re-test final : une ligne courte qui commence par une épreuve (colonne manquante) est aussi comptée comme ignorée (BUG-P2-08) ; les lignes de détail des temps de passage, que SwimRankings place parmi les lignes du tableau, ne sont pas des temps. Le message nomme les épreuves ignorées (3 au plus, R-P2-20)

### Priorité : Must
### Estimation : M

---

## US-012 : Fenêtre de synchronisation

**En tant que** nageur
**Je veux** un guide pas à pas pour synchroniser mes temps
**Afin de** savoir exactement quoi faire

### Critères d'acceptation
- [x] Le bouton 🔄 du header et « Synchroniser maintenant » dans Paramètres deviennent actifs et ouvrent la fenêtre de synchronisation
- [x] La fenêtre affiche les étapes : ouvrir sa page, passer Cloudflare et se connecter, afficher le code source (Cmd+U / Ctrl+U), tout copier, coller ici
- [x] Deux liens, construits à partir de l'ID du profil, s'ouvrent dans un nouvel onglet : « Mes meilleurs temps » et « Mes temps de la saison 2026-2027 » (année de fin de saison selon la règle du projet : mois ≥ 9 → année + 1)
- [x] Une zone de texte reçoit le HTML collé, avec un bouton « Importer »
- [x] On voit quelles pages ont déjà été importées pendant cette synchronisation (meilleurs temps ✓, saison ✓)
- [x] La fenêtre se ferme avec ✕, Échap ou « Terminer », sans perte de ce qui a déjà été importé
- [x] Accessible au clavier (focus piégé, focus rendu au bouton d'origine) et utilisable à 375 px

### Notes techniques
- S'appuyer sur la mécanique de la confirmation partagée (`<dialog>`, piège de focus), sans le délai de 1 s qui n'a pas de sens ici
- Liens `target="_blank" rel="noopener"`, avec « (nouvel onglet) » pour les lecteurs d'écran

### Avancement
- Implémentée : `<dialog id="sync-dialog">`, plein écran sous 480 px, centrée (560 px max) au-delà. Le texte collé est conservé si on ferme sans importer ; la liste « Meilleurs temps / Saison » repart de zéro à chaque ouverture
- Échap ne ferme que la fenêtre (les Paramètres restent ouverts) ; le focus revient au bouton qui l'a ouverte
- Après QA : à l'ouverture, le focus va sur le titre (plus de clavier ouvert d'emblée sur mobile, instructions visibles) ; le code collé est effacé après « Supprimer mes données » et après un changement d'ID

### Priorité : Must
### Estimation : M

---

## US-013 : Import et stockage des temps

**En tant que** nageur
**Je veux** que les temps collés soient enregistrés sur mon appareil
**Afin de** les retrouver à chaque ouverture de l'app

### Critères d'acceptation
- [x] **Given** une page de meilleurs temps valide, **When** je clique « Importer », **Then** les temps sont stockés dans `swimtimes_pb` au format de la spec §3.1 (`updated`, `data`)
- [x] **Given** une page de saison valide, **Then** ils sont stockés dans `swimtimes_season` (`season`, `updated`, `data`)
- [x] Le type de page est détecté automatiquement : l'ordre des deux collages est libre
- [x] Un import remplace les données précédentes du même type (pas de fusion ni de doublons)
- [x] Un message de confirmation résume l'import : « ✓ 34 meilleurs temps importés » / « ✓ 12 temps de la saison 2026-2027 importés »
- [x] La zone de texte est vidée après un import réussi
- [x] Le HTML collé n'est jamais stocké, seulement les temps extraits

### Notes techniques
- Fonctions `savePBs()` / `saveSeasonTimes()` de la spec §3.2, dans la section « STOCKAGE LOCAL » (erreur affichable si le stockage est plein, comme `saveProfile`)
- Les onglets continuent d'afficher les données du club jusqu'à la Phase 3 (`TODO Phase 3`)
- `clearSyncedTimes()` (US-006, changement d'ID) et `clearAllData()` (US-007) suppriment déjà ces clés

### Avancement
- Implémentée : `savePBs()`, `saveSeasonTimes()`, `getPBs()`, `getSeasonTimes()` dans la section « STOCKAGE LOCAL ». Le message « stockage plein » est désormais commun au profil et aux temps
- Les temps importés ne sont pas encore affichés dans les onglets : c'est US-017
- Après review : l'ID du nageur est stocké avec les temps (`athleteId`) ; des temps stockés pour un autre ID ne sont jamais affichés

### Priorité : Must
### Estimation : M

---

## US-014 : Messages d'erreur de l'import

**En tant que** nageur
**Je veux** comprendre pourquoi un import échoue
**Afin de** corriger mon geste sans aide

### Critères d'acceptation
- [x] Zone vide → « Colle d'abord le code de ta page SwimRankings »
- [x] Page du défi Cloudflare → « Cette page est la vérification Cloudflare. Attends qu'elle se termine (connecte-toi si elle tourne en boucle), puis copie le code de ta page nageur »
- [x] Page de connexion → « Connecte-toi à SwimRankings, puis recopie le code de ta page »
- [x] Texte qui n'est pas du HTML (par ex. le texte de la page copié au lieu du code source) → message expliquant d'utiliser « Afficher le code source »
- [x] Page d'un autre nageur (ID différent de celui du profil) → « Cette page est celle de {nom}, pas la tienne », sans rien importer
- [x] Page de meilleurs temps sans aucun temps → message explicite, sans effacer les données existantes (une saison vide est importée, voir Avancement)
- [x] Copie incomplète (page tronquée) → « Le code collé est incomplet : sélectionne tout (Cmd+A / Ctrl+A) avant de copier », sans import partiel
- [x] Page dans une autre langue que l'anglais → « Passe SwimRankings en anglais (sélecteur en haut à droite), puis recopie le code de ta page »
- [x] Stockage plein ou bloqué → même message que pour le profil
- [x] Après une erreur, le texte collé reste dans la zone pour pouvoir réessayer, et le focus est placé sur le message ou la zone

### Notes techniques
- Les cas d'erreur sont typés par l'analyse (US-011), la fenêtre ne fait que les afficher
- Échantillons « parasites » d'US-010 utilisés dans les tests

### Avancement
- Implémentée. Ajout : une page de **saison passée** (ex. `pbest=2026`) est refusée avec un lien vers la saison en cours
- **Choix** : une page de **saison sans aucun temps** est importée (liste vide, message « Aucun temps sur la saison 2026-2027 pour l'instant »), car c'est normal en début de saison ; seule une page de **meilleurs temps** vide est refusée
- Après QA : après une erreur, le texte collé reste visible mais **entièrement sélectionné**, pour qu'un nouveau collage le remplace au lieu de s'y ajouter (BUG-P2-01) ; le message est réécrit à chaque essai pour être annoncé même s'il est identique
- Après re-test : un double-clic sur « Importer » garde le message de succès (BUG-P2-06) ; le message « aucun temps lu » ne renvoie plus vers l'anglais (BUG-P2-07)

### Priorité : Must
### Estimation : S

---

## US-015 : État de la synchronisation

**En tant que** nageur
**Je veux** savoir quand j'ai synchronisé mes temps pour la dernière fois
**Afin de** savoir si je dois le refaire

### Critères d'acceptation
- [x] Paramètres → « Dernière synchronisation » affiche la date et l'heure du dernier import (ou « Jamais synchronisé »)
- [x] Le bouton 🔄 du header affiche brièvement le résultat du dernier import (✓ pendant 2 s, spec §2.1)
- [x] **Given** une dernière synchronisation de plus de 7 jours, **Then** un badge discret apparaît sur 🔄 et Paramètres indique « Dernière sync il y a X jours » (spec §6.4)
- [x] Le message des onglets sans données (« Aucune donnée. Clique sur 🔄 pour synchroniser. ») renvoie bien vers une synchronisation fonctionnelle

### Notes techniques
- Dates issues de `updated` dans `swimtimes_pb` / `swimtimes_season`
- La ligne « Temps affichés : Données du club du … » disparaît avec US-018

### Avancement
- Implémentée. ✓ affiché 2 s sur 🔄 à la **fermeture** de la fenêtre si au moins une page a été importée (pendant l'import, la fenêtre masque le header). Pas de ✗ rouge sur 🔄 : les erreurs s'affichent dans la fenêtre, et jamais en rouge (fond rouge)
- Badge jaune sur 🔄 au-delà de 7 jours, annoncé aux lecteurs d'écran ; Paramètres : « 1 oct. 2026, 02:00 · il y a 14 jours ». Pas de badge si jamais synchronisé : le message des onglets suffit

### Priorité : Should
### Estimation : S

---

## US-016 : Aide selon l'appareil

**En tant que** nageur
**Je veux** des instructions adaptées à mon appareil
**Afin de** trouver comment afficher le code source

### Critères d'acceptation
- [x] Ordinateur : raccourci adapté (Cmd+Option+U / Cmd+U sur Mac selon le navigateur, Ctrl+U sur Windows et Linux)
- [x] Android (Chrome) : instruction « ajoute `view-source:` devant l'adresse »
- [x] iPhone / iPad : message clair indiquant que Safari ne permet pas d'afficher le code source, et que la synchronisation se fait depuis un ordinateur (les temps restent ensuite sur l'appareil où ils ont été importés, voir question ouverte 2)
- [x] Les instructions des autres appareils restent accessibles (lien « Autre appareil »)
- [x] L'aide rappelle : « Assure-toi que SwimRankings est en anglais (sélecteur en haut à droite) »
- [x] L'aide rappelle : « Tes données sont stockées sur cet appareil uniquement »
- [x] Textes au tutoiement, comme le reste de l'interface

### Notes techniques
- Détection approximative via `navigator.userAgent` et `navigator.platform` : en cas de doute, afficher toutes les instructions

### Avancement
- Implémentée : détection Mac, Windows/Linux, Android, iPhone/iPad (iPadOS se présente comme un Mac : détecté par l'écran tactile). Sur Mac : Option+Cmd+U (Chrome, Edge, Safari, avec les fonctionnalités développeur activées dans Safari), Cmd+U (Firefox)
- Sur iPhone/iPad : bandeau « Safari ne permet pas d'afficher le code source… », et instructions pour ordinateur déjà dépliées

### Priorité : Should
### Estimation : S

---

## US-017 : Afficher les temps importés

**En tant que** nageur
**Je veux** voir mes temps importés dans l'app
**Afin de** suivre mes qualifications à jour

### Critères d'acceptation
- [x] **Given** des temps importés, **Then** les onglets Temps et Progression, la popup de l'avatar et les records des Paramètres utilisent `swimtimes_pb` et `swimtimes_season`
- [x] **When** un import réussit, **Then** les onglets se mettent à jour immédiatement, sans recharger la page
- [x] Statuts, écarts et points FINA calculés comme aujourd'hui (mêmes résultats qu'avec les données du club pour un même jeu de temps)
- [x] **Given** des temps de saison d'une saison précédente (ex. importés en 2025-2026), **Then** ils ne sont pas présentés comme temps de la saison en cours
- [x] **Given** un profil sans import, **Then** le message « Aucune donnée. Clique sur 🔄 pour synchroniser. » s'affiche
- [x] Au rechargement, les temps importés s'affichent tout de suite (plus d'attente réseau)

### Notes techniques
- Conversion du format stocké (§3.1 : `event`, `course` « 25m »/« 50m », `time` « 1:04.85 »…) vers le format utilisé par les onglets (`stroke`, `distance`, `poolLength`, `timeMs`, `timeDisplay`), dans une fonction testable
- Remplace le pont temporaire `loadSwimmerForProfile()` / `fetchSwimmerData()` (marqués `TODO Phase 3`)
- `getPBs()` / `getSeasonTimes()` de la spec §3.2

### Avancement
- Implémentée : `loadSwimmerFromStorage()` construit les temps des onglets à partir de `getPBs()` / `getSeasonTimes()`, via `toDisplayTime()`. Mise à jour immédiate après un import, et affichage dès l'ouverture (plus d'attente réseau)
- La nation (« SUI ») est lue sur la page SwimRankings et stockée avec les meilleurs temps (`swimtimes_pb.nation`, ajouté à la spec §3.1)
- Réalisée avec US-018 : l'affichage des temps importés remplace le chargement des données du club
- Après QA : saison importée sans les meilleurs temps → Progression invite à importer les meilleurs temps (BUG-P2-02) ; temps stockés illisibles ignorés sans bloquer le démarrage
- Points FINA : bases World Aquatics 2026 (mise à jour du 2026-10-23) ; les points calculés correspondent à ceux de SwimRankings à 1 point près sur les échantillons
- **Décision B (2026-10-23)** : points FINA arrondis vers le bas, comme SwimRankings : 81/81 identiques sur les échantillons. « Dernière synchronisation » ne compte que les temps du profil (R-P2-17)

### Priorité : Must
### Estimation : M

---

## US-018 : Retrait des données du club

**En tant que** responsable du projet
**Je veux** retirer le chargement de `swimmers-data.json` et `swimmers-season.json` depuis GitHub
**Afin que** l'app n'affiche que les temps importés par le nageur, toujours à jour

### Critères d'acceptation
- [x] L'app ne charge plus `swimmers-data.json` ni `swimmers-season.json` (plus de requête vers GitHub, plus d'état « chargement » / « erreur réseau »)
- [x] La ligne « Temps affichés : Données du club du … » des Paramètres est retirée
- [x] Les marqueurs `TODO Phase 3` ont tous disparu
- [x] Les tests automatiques ne dépendent plus de ces fichiers (ils utilisent les échantillons d'US-010)
- [x] La suppression des fichiers du dépôt (`swimmers-*.json`, `athletes.txt`, workflows, scripts Python) fait l'objet d'une décision séparée (spec §8, « optionnel »)

### Notes techniques
- Un nageur qui voyait les données du club voit « Aucune donnée » tant qu'il n'a pas importé : le message doit l'orienter vers 🔄 (US-015)

### Avancement
- Implémentée : plus aucune requête vers GitHub, plus d'états « chargement » / « erreur réseau », ligne « Temps affichés » retirée, aucun marqueur `TODO Phase 3` restant
- Tests de la Phase 1 migrés vers les échantillons : les tests de chargement réseau (lent, en panne, changement d'ID pendant un chargement) sont devenus sans objet et sont remplacés par la vérification qu'aucune requête ne part vers GitHub
- La reprise du profil v1 (US-008) et ses tests utilisent encore `swimmers-data.json`, qui reste dans le dépôt (question ouverte 5)

### Priorité : Must
### Estimation : S

---

## Questions ouvertes

1. ~~**Livraison**~~ : Phases 2 et 3 fusionnées, sans déploiement intermédiaire (US-017, US-018)
2. ~~**Nageurs sur iPhone**~~ : limite acceptée, mentionnée dans l'aide (US-016) ; export/import plus tard
3. ~~**Échantillons**~~ : fournis par le product owner via Claude web, à partir d'au moins une page réelle anonymisée ; recette réelle avant déploiement (US-010)
4. ~~**Langue**~~ : anglais uniquement, rappelé dans l'aide (US-011, US-014, US-016)
5. **Fichiers du club** : supprimer du dépôt `swimmers-*.json`, `athletes.txt`, les workflows et les scripts Python, ou les garder ? (spec §8 ; hors périmètre d'US-018)
