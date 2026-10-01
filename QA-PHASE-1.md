# QA – Phase 1 « Profil utilisateur » (US-001, US-002, US-004, US-005)

Date : 2026-10-01 · Rôle : QA (`.claude/agents/qa.md`) · Version testée : working tree (`git diff HEAD -- app.js index.html`)
Outil : Playwright/Chromium. Le serveur HTTP est local. Les JSON GitHub sont interceptés et servis depuis les fichiers locaux, ou bien ralentis, bloqués ou mis en échec.
Scripts et captures : `scratchpad/qa/` (`explore_storage.py`, `explore_form*.py`, `explore_nav.py`, `explore_slow*.py`, `explore_resp.py`, `explore_a11y.py`, `shots/`).

> **Suivi (2026-10-01)** : les 7 bugs sont corrigés et couverts par des tests automatiques (BUG-01 à BUG-07). R-01 est tranché : tutoiement conservé, spec 6.2 et critère alignés. R-04 (focus dans la popup) est corrigé. R-02 est reporté à US-006. R-03 et R-08 à R-12 sont en attente.

## Synthèse

**Verdict : ✅ VALIDÉ avec réserves.** Les 28 critères d'acceptation de US-001, US-002, US-004 et US-005 passent. Les tests n'ont trouvé aucun bug bloquant ni majeur.
Le test exploratoire a trouvé **7 bugs mineurs**. Ils concernent les cas limites : réseau lent, profil corrompu, saisies exotiques, contraste. On peut livrer la Phase 1 en l'état et les traiter avant la Phase 2. BUG-01 et BUG-02 sont à corriger en priorité, car ils touchent tous les utilisateurs mobiles avec une connexion lente.

| Sévérité | Nombre |
|----------|--------|
| Bloquant | 0 |
| Majeur | 0 |
| Mineur | 7 |
| Écart à un CA | 0 strict (1 écart de formulation, voir R-01) |

Points solides vérifiés :
- échappement XSS : nom, club, année et ID malveillants dans localStorage sont affichés comme du texte, sans exécution ;
- `getProfile()` ne lève jamais d'erreur (JSON corrompu, `null`, tableau, chaîne) ;
- les erreurs de stockage sont gérées, que le quota soit réellement plein ou que localStorage lève une `SecurityError` ;
- le double-clic et Entrée répétée ne donnent qu'un seul `setItem` ;
- un refresh pendant le « ✓ C'est parti ! » est sans conséquence ;
- l'ancienne clé `swimmer_profile` est ignorée sans erreur et conservée ;
- aucune erreur JS dans tous les scénarios.

---

## Checklists de validation

### Validation US-001 : Stockage du profil en localStorage

#### Critères d'acceptation
- [x] CA1 : `saveProfile()` stocke le profil sous `swimtimes_profile`, au format JSON de la spec 1.2 → ✅
- [x] CA2 : `getProfile()` retourne l'objet profil → ✅
- [x] CA3 : `getProfile()` retourne `null` sans lever d'erreur si le profil est absent ou corrompu. Cas testés : `{oops`, `null`, `[1,2]`, `"Ava"`, ID vide, localStorage qui lève une erreur → ✅ (voir BUG-03 pour les profils syntaxiquement valides mais incohérents)
- [x] CA4 : `clearAllData()` supprime `swimtimes_profile`, `swimtimes_pb` et `swimtimes_season`, et conserve les autres clés → ✅
- [x] CA5 : si localStorage est indisponible, un message explicite s'affiche dans une `.error-box`. Le formulaire garde ses valeurs et le bouton est réactivé. Testé avec le quota réellement saturé et avec un accès qui lève une `SecurityError` → ✅
- [x] CA6 : `createdAt` est figé (conservé sur 2 sauvegardes successives) et `updatedAt` est mis à jour → ✅

#### Tests additionnels
- [x] Données invalides (JSON corrompu) : OK. Profil partiel ou incohérent accepté : voir BUG-03
- [x] localStorage indisponible : OK
- [x] Performance : OK

### Validation US-002 : Configuration du profil au premier lancement

#### Critères d'acceptation
- [x] CA1 : sans profil, l'écran « Configuration du profil » s'affiche → ✅
- [x] CA2 : les onglets sont inaccessibles. Ils sont masqués et ne reçoivent pas le focus clavier. `showTab()` et `openSettings()` forcés en console n'affichent rien → ✅
- [x] CA3 : le formulaire contient Nom*, ID*, Genre* (F/H, sans valeur par défaut), Année et Club (pré-rempli « Lausanne Aquatique ») → ✅
- [x] CA4 : un champ requis vide ou ne contenant que des espaces, une tabulation ou un NBSP affiche une erreur sous le champ et rien n'est enregistré → ✅
- [x] CA5 : les ID non numériques sont refusés : `533 2548`, `-5`, `5.3`, chiffres pleine chasse `１２３`, URL complète (l'extraction relève d'US-003) → ✅
- [x] CA6 : l'année doit être comprise entre 1920 et 2026. 1919 et 2027 sont refusées, 1920 et 2026 acceptées, `20a0` refusée → ✅
- [x] CA7 : avec un formulaire valide, le profil est stocké, les onglets se débloquent et l'onglet Temps s'affiche → ✅
- [x] CA8 : sans données (ID 999, ou réseau en 500, coupé ou JSON invalide), le message 6.2 s'affiche dans Temps et Progression → ✅ (formulation, voir R-01)
- [x] CA9 : les accents et caractères spéciaux sont conservés : « Zoé Müller-Ŝtraße », « Chloé d'Arc O'Neil », « Élise Özil » → ✅ (initiales avec émoji, voir BUG-04)
- [x] CA10 : le formulaire est utilisable au clavier (ordre Nom → ID → Genre (flèches) → Année → Club → Enregistrer), chaque champ a un `<label for>` ou une `<legend>`, et les cibles font au moins 44 px (Femme/Homme 144×44, champs ≥ 51, bouton 46) → ✅

#### Tests additionnels
- [x] Responsive 320 / 375 / 768 / 1200 px : pas de défilement horizontal
- [x] Gestion des erreurs : le focus va au premier champ en erreur, `aria-invalid` et `aria-describedby` sont présents
- [x] Double-clic : un seul enregistrement
- [x] Refresh pendant l'enregistrement : le profil est déjà sauvé et l'app s'affiche au rechargement
- [ ] Connexion lente ou absente : voir BUG-02
- [ ] Focus après création : voir BUG-06

### Validation US-004 : Nouveau header

#### Critères d'acceptation
- [x] CA1 : structure logo + titre à gauche, puis 🔄 ⚙️ avatar à droite → ✅
- [x] CA2 : initiales du premier et du dernier mot, en majuscules (« Ava Hehlen » → AH, « Ava » → A) → ✅ (cas limites, voir BUG-04)
- [x] CA3 : un clic sur l'avatar ouvre la popup (nom, club, âge si l'année est connue, ID) ; elle se ferme avec ✕, Échap (le focus revient à l'avatar) ou un clic extérieur ; `aria-expanded` est synchronisé → ✅
- [x] CA4 : ⚙️ ouvre Paramètres → ✅
- [x] CA5 : 🔄 est visible, avec `aria-disabled` et le tooltip, et affiche un toast au clic ou à Entrée → ✅
- [x] CA6 : 🔄, ⚙️ et l'avatar sont masqués sur l'écran de configuration → ✅
- [x] CA7 : le sélecteur multi-nageurs n'existe plus : `loadSwimmerSelector` et `handleSwimmerSelect` sont absents → ✅
- [x] CA8 : le header reste lisible à 375 px (à 320 px le titre est masqué, sans débordement), les 3 boutons font 44×44 et ont un `aria-label` → ✅

#### Tests additionnels
- [x] Responsive 320 / 375 / 768 / 1200 : OK
- [ ] Données longues dans la popup : voir BUG-05
- [ ] Profil incohérent (âge négatif, etc.) : voir BUG-03

### Validation US-005 : Écran Paramètres

#### Critères d'acceptation
- [x] CA1 : ⚙️ affiche Paramètres (`aria-pressed=true`, focus sur Retour), et un second clic le referme → ✅
- [x] CA2 : l'ordre est respecté : profil + « Modifier le profil » → dernière synchro « Jamais synchronisé » → « Synchroniser maintenant » (Bientôt) → « Exporter » (Bientôt) → « Supprimer » dans une zone séparée → ✅. Le bouton Supprimer est sombre plutôt que rouge, conformément à la décision documentée dans l'Avancement.
- [x] CA3 : Retour ou Échap ramène à l'onglet précédent (testé depuis Progression). Avec la popup ouverte, le 1er Échap ferme la popup et le 2e ferme Paramètres → ✅
- [x] CA4 : sur mobile, l'écran est en plein écran : il remplace le contenu et masque la barre d'onglets → ✅

#### Tests additionnels
- [x] Responsive 375 / 768 / 1200 : OK
- [x] Clavier : Tab parcourt Modifier → records → boutons Bientôt → Supprimer → header
- [ ] Ouverture pendant le chargement initial : voir BUG-01

---

## Bugs

### BUG-01 [Mineur] : la fin du chargement initial écrase l'écran ouvert (formulaire perdu, Paramètres périmés)

Cause : `DOMContentLoaded` appelle `showApp()` après `loadSwimmerForProfile()`, sans tenir compte de ce que l'utilisateur a ouvert entre-temps. Or ⚙️ est cliquable dès le premier rendu.

**Étapes (variante A, saisie perdue)**
1. Partir d'un profil existant et d'un réseau lent : les JSON GitHub mettent plus de 4 s à répondre. Les 2 fichiers sont chargés l'un après l'autre.
2. Pendant le chargement, cliquer ⚙️ puis « Modifier le profil », et commencer à modifier le nom.
3. Attendre la fin du chargement.

**Attendu** : le formulaire reste affiché avec la saisie.
**Obtenu** : le formulaire disparaît (`setup-screen` vidé, `setup-active` retiré), l'onglet Temps s'affiche et la saisie est perdue.

**Étapes (variante B, Paramètres périmés)**
1. Mêmes conditions. Ouvrir ⚙️ pendant le chargement.
2. Attendre la fin du chargement.

**Attendu** : « Temps affichés » et « Mes records personnels » se mettent à jour.
**Obtenu** : l'écran reste à « Aucune donnée », sans records, jusqu'à sa fermeture.

Script : `explore_slow2.py` (cas 3 et 4).

### BUG-02 [Mineur] : aucun état de chargement ni délai maximal pour les JSON GitHub

**Étapes**
1. Partir sans profil, avec une requête vers `raw.githubusercontent.com` qui ne répond jamais. Le cas est simulé par une promesse `fetch` jamais résolue.
2. Remplir le formulaire et cliquer « Enregistrer ».

**Attendu** : après quelques secondes, l'app s'affiche avec le message « Aucune donnée » ou un message d'erreur réseau.
**Obtenu** : le bouton reste bloqué sur « ✓ C'est parti ! » (désactivé) pendant au moins 15 s, sans issue. Après un rechargement, les onglets s'affichent mais l'avatar reste absent indéfiniment, car `showApp()` n'est jamais appelé.

Avec un réseau simplement lent (5 s par fichier), la création prend 10 s sous « ✓ C'est parti ! », parce que `loadSwimmersData()` et `loadSwimmersSeasonData()` sont attendus l'un après l'autre. Au démarrage, rien n'indique le chargement : le bloc PB affiche « — », l'avatar est absent, et `#select-gender` affiche « Femme » même pour un profil masculin tant que `showApp()` n'a pas été appelé (capture `shots/slow_start_pendant.png`).

Pistes : `AbortController` avec un délai de 8 à 10 s, `Promise.all` sur les deux fichiers, et appliquer le genre et l'avatar avant le chargement.

### BUG-03 [Mineur] : `getProfile()` accepte un profil incohérent, et le genre retombe sur « Femme » sans avertissement

`getProfile()` ne vérifie que la présence de `name` et `swimrankingsId`. Résultats avec des profils injectés dans localStorage (`explore_storage.py`) :

| Profil stocké | Résultat |
|---|---|
| `gender: "X"`, `"Male"` (format v1) ou absent | L'app s'affiche avec **les temps limites féminins** (`select-gender` = Female, `swimmer.gender` = undefined → 'Female' dans Progression). Un nageur masculin verrait de faux statuts de qualification. |
| `birthYear: "3000"` | La popup affiche **« -974 ans »** |
| `birthYear: "abc"` | Paramètres affiche « né·e en abc » |
| `name: "   "` | Avatar « ? », nom vide dans la popup et dans Paramètres |
| `name: {a:1}` | « [object Object] », initiales « [O » |
| `swimrankingsId: "abc<b>"` | Accepté (affiché échappé), « Aucune donnée » |

**Attendu** : un profil invalide est traité comme absent, ou bien le formulaire s'ouvre pour correction. Il ne doit jamais y avoir de calcul avec un genre par défaut.
**Obtenu** : voir le tableau. Pas d'erreur JS. En mode édition, la validation détecte bien le problème au clic sur Enregistrer.

Gravité limitée : ces profils ne peuvent être produits que par une manipulation ou une corruption du stockage, ou par une future migration (US-008) mal faite. Le cas `"Male"`/`"Female"` est à garder en tête pour US-008. Piste : réutiliser `PROFILE_VALIDATORS` dans `getProfile()`.

### BUG-04 [Mineur] : initiales cassées avec un émoji ou certains caractères Unicode

`getInitials()` prend `word[0]`, c'est-à-dire une unité UTF-16 et non un caractère.

**Étapes** : créer le profil « 🏊 Ava Hehlen ».
**Attendu** : « 🏊H » ou « AH ».
**Obtenu** : « �H », un demi-surrogate `\uD83C` (capture `shots/name_emoji_debut.png`). Même chose pour « Ava 🏊 », qui donne « A� ».

Autres cas :
- « ß ß » donne « SSSS » (4 lettres dans un cercle de 44 px) ;
- un nom fait d'un espace insécable étroit ou d'un ZWSP (`​`) passe la validation (`trim()` ne le retire pas) et l'avatar devient un rond vide.

Piste : `Array.from(word)[0]` ou `Intl.Segmenter`, ignorer les mots sans lettre (`/\p{L}/u`) et utiliser `toLocaleUpperCase().slice(0,1)`.

### BUG-05 [Mineur] : un club long sans espace déborde de la popup de l'avatar

**Étapes** : créer un profil avec le club `"X" × 80` (maxlength autorisé), puis ouvrir la popup à 375 px.
**Attendu** : le texte passe à la ligne, comme pour le nom (`overflow-wrap:anywhere`).
**Obtenu** : `.swimmer-popup-meta` déborde hors de la carte (scrollWidth 700 px pour 301 px visibles) et le texte est coupé au bord de l'écran (capture `shots/popup_club_long.png`). Paramètres n'est pas touché.

Piste : `overflow-wrap:anywhere` sur `.swimmer-popup-meta`.

### BUG-06 [Mineur, a11y] : le focus clavier est perdu après la création du profil

**Étapes** : remplir le formulaire au clavier et valider avec Entrée.
**Attendu** : le focus est placé sur un élément de l'app, par exemple le 1er onglet ou le titre.
**Obtenu** : `document.activeElement` = `<body>`, car le bouton focalisé a été supprimé du DOM. Un lecteur d'écran n'annonce rien. Le même problème se produit à l'ouverture de « Modifier le profil » depuis Paramètres (relève d'US-006).

### BUG-07 [Mineur, a11y] : le contraste du texte secondaire est sous le seuil WCAG AA

Calcul sur le haut du dégradé (`#E31E24`), là où se trouve le formulaire sur mobile :

| Élément | Opacité | Contraste | AA (4,5:1) |
|---|---|---|---|
| Blanc pur sur fond | 1 | 4,69 | ✅ |
| Blanc pur sur `.card` | 1 | 4,27 | ❌ |
| `.form-hint`, `.card-title`, `.setup-privacy`, libellés `.settings-row` | .75 | 2,96 à 3,12 | ❌ |
| `.form-label` (12 px, majuscules) | .7 | 2,75 à 2,87 | ❌ |
| Placeholder | .5 | 2,0 | ❌ |
| `.badge-soon` | 1 sur fond .2 | 3,35 | ❌ |

Le document UX affirme que `.75` suffit, ce qui est faux sur `#E31E24` : ce seuil n'est atteint qu'en bas du dégradé (`#B01519`). Le problème vient en grande partie de la charte existante, mais les composants ajoutés en Phase 1 le reproduisent. Piste : texte secondaire à opacité 1 et taille ou graisse pour la hiérarchie, ou un fond de carte plus sombre (`rgba(0,0,0,.15)`).

---

## Remarques (non bloquantes, hors bug)

- **R-01, écart de formulation (US-002 CA8)** : le CA cite « Aucune donnée. **Cliquez** sur 🔄 pour synchroniser. » alors que l'app affiche « **Clique** sur 🔄… ». Le tutoiement est cohérent avec l'UX : il faut mettre à jour le CA ou la spec 6.2. Le message invite par ailleurs à cliquer sur un bouton désactivé, ce qui est attendu et documenté.
- **R-02, US-006 (pas encore faite)** : pas de toast « ✓ Profil mis à jour » après l'édition, pas d'Échap dans le formulaire d'édition, le header est entièrement masqué en édition (la maquette prévoit « ← Modifier le profil »), et le focus est perdu à l'ouverture. À couvrir dans US-006.
- **R-03, onglets sans nom accessible sous 400 px** (régression pré-existante, `.nav-tab span{display:none}`) : un lecteur d'écran annonce « bouton, image » sans libellé. Il manque aussi `role="tab"` et `aria-selected`. Piste : utiliser `aria-label` ou une classe visually-hidden au lieu de `display:none`.
- **R-04, popup avatar** : `role="dialog"` sans déplacement du focus ni `aria-modal`. L'ordre DOM fait que Tab y mène, ce qui est acceptable pour une popover, mais `aria-haspopup="dialog"` promet davantage.
- **R-05, âge** : calculé sur l'année seule, donc il peut y avoir 1 an d'écart avant l'anniversaire. Si le nageur est né l'année courante, l'âge 0 s'affiche « — ».
- **R-06, année de naissance** : `maxlength="4"` tronque un collage avec espace (« ␣2010 » devient « ␣201 », refusé). C'est un cas rare.
- **R-07, ancienne clé `swimmer_profile`** : elle est ignorée (formulaire vide) et conservée, y compris par `clearAllData()`. C'est conforme à l'Avancement, en attendant US-007 et US-008.
- **R-08, `temps-limites.json` absent** (pré-existant) : `alert()` natif, puis tableau vide sans message.
- **R-09, logo** : la moitié haute « LAUSANNE » du logo, rouge sur fond rouge, est presque invisible (pré-existant).
- **R-10, données** : « Temps affichés : Données du club du 03.02.2026 » indique que le JSON du club a 8 mois. Ce n'est pas un bug, mais la Phase 2 est attendue.
- **R-11, un ID de 200 chiffres ou `0`** est accepté. C'est conforme au CA, mais une borne raisonnable (≤ 10 chiffres) pourrait être ajoutée avec US-003.

---

## Cas de test

### TC-001 : Premier lancement sans profil
**Préconditions** : localStorage vide.
**Étapes** : 1. Ouvrir l'app.
**Résultat attendu** : écran « Configuration du profil » ; pas d'onglets ; 🔄, ⚙️ et l'avatar sont masqués ; Club pré-rempli « Lausanne Aquatique » ; aucun genre sélectionné.

### TC-002 : Validation des champs requis
**Préconditions** : écran de configuration.
**Étapes** : 1. Cliquer « Enregistrer » sans rien saisir. 2. Saisir « ␣␣␣ » dans Nom, puis « Enregistrer ».
**Résultat attendu** : 3 messages d'erreur (nom, ID, genre) ; focus sur Nom ; `aria-invalid="true"` ; `swimtimes_profile` absent.
**Données de test** : Nom = `"   "`, `"\t"`, `" "` → refusé.

### TC-003 : Validation de l'ID SwimRankings
**Étapes** : saisir chaque valeur, remplir le reste correctement, puis « Enregistrer ».
**Données de test** : `5332548` ✅ ; `␣5332548␣` ✅ (stocké `5332548`) ; `05332548` ✅ (zéro conservé) ; `533 2548`, `-5`, `5.3`, `１２３`, URL complète → ❌ « L'ID ne contient que des chiffres ».

### TC-004 : Validation de l'année de naissance
**Données de test** : vide ✅ (non stocké) ; `1920` ✅ ; `2026` ✅ ; `1919` ❌ ; `2027` ❌ ; `20a0` ❌ ; `0201` ❌ → « Année invalide (ex. 2010) ».

### TC-005 : Création réussie
**Préconditions** : écran de configuration, `swimmers-data.json` disponible.
**Étapes** : 1. Saisir « Ava Hehlen », `5332548`, Femme, `2010`. 2. Cliquer « Enregistrer ».
**Résultat attendu** : le bouton affiche « ✓ C'est parti ! » environ 600 ms, puis l'onglet Temps s'affiche avec les PB ; l'avatar affiche « AH » ; `#select-gender` = Femme ; le profil est stocké avec `createdAt` = `updatedAt`, sans clé `club` vide.

### TC-006 : Profil sans données
**Étapes** : créer un profil avec l'ID `999`, ou avec les JSON GitHub en erreur 500, en échec réseau ou au JSON invalide.
**Résultat attendu** : Temps et Progression affichent « Aucune donnée. Clique sur 🔄 pour synchroniser. » ; la popup affiche 0 PB ; aucune erreur JS.

### TC-007 : Accents, apostrophes et XSS
**Données de test** : « Zoé Müller-Ŝtraße » → initiales ZM, nom intact ; « Chloé d'Arc O'Neil » → CO ; profil stocké avec `name = "<img src=x onerror=…>"` → affiché comme du texte dans la popup et dans Paramètres, aucun script exécuté.

### TC-008 : Double soumission
**Étapes** : remplir le formulaire, double-cliquer « Enregistrer » puis appuyer sur Entrée.
**Résultat attendu** : `localStorage.setItem('swimtimes_profile')` est appelé une seule fois.

### TC-009 : localStorage plein ou bloqué
**Préconditions** : (a) quota saturé ; (b) accès à `localStorage` qui lève une `SecurityError`.
**Étapes** : remplir un formulaire valide, puis « Enregistrer ».
**Résultat attendu** : `.error-box` « ✗ Impossible d'enregistrer sur cet appareil… » ; valeurs conservées ; bouton réactivé ; pas d'erreur JS. En (b), le formulaire s'affiche au démarrage sans planter.

### TC-010 : Profil corrompu au démarrage
**Données de test** : `swimtimes_profile` = `{oops` / `null` / `[1,2]` / `"Ava"` / profil avec `swimrankingsId: ""`.
**Résultat attendu** : écran de configuration vide, sans erreur JS.

### TC-011 : Profil incohérent (non-régression de BUG-03)
**Données de test** : profil valide avec `gender: "X"`, `"Male"` ou absent ; `birthYear: "3000"` ; `name: "   "`.
**Résultat attendu (après correction)** : le profil est considéré invalide, ou le formulaire s'ouvre pour correction ; jamais de temps limites féminins par défaut ; jamais d'âge négatif.

### TC-012 : Refresh pendant l'enregistrement
**Étapes** : cliquer « Enregistrer », puis recharger pendant « ✓ C'est parti ! ».
**Résultat attendu** : l'app s'affiche directement avec le profil ; `createdAt` est inchangé.

### TC-013 : Header et popup de l'avatar
**Préconditions** : profil Ava Hehlen, 2010.
**Étapes** : 1. Cliquer l'avatar. 2. Appuyer sur Échap. 3. Rouvrir et cliquer hors de la popup. 4. Rouvrir et cliquer ✕.
**Résultat attendu** : la popup affiche le nom, « Lausanne Aquatique • SUI », 16 ans, le nombre de PB et l'ID ; `aria-expanded` passe à true puis false ; après Échap, le focus revient à l'avatar ; chaque méthode ferme la popup.

### TC-014 : Bouton 🔄 inactif
**Étapes** : survoler 🔄 ; cliquer ; le focaliser et appuyer sur Entrée.
**Résultat attendu** : tooltip « Synchronisation disponible prochainement » ; toast identique ; `aria-disabled="true"` ; aucune action.

### TC-015 : Navigation dans Paramètres
**Étapes** : 1. Aller dans Progression. 2. Cliquer ⚙️. 3. Ouvrir la popup avatar. 4. Appuyer sur Échap. 5. Appuyer sur Échap.
**Résultat attendu** : 2 → Paramètres (`aria-pressed=true`, focus sur ←) ; 4 → seule la popup se ferme ; 5 → retour à Progression, focus sur ⚙️.

### TC-016 : Contenu de Paramètres
**Résultat attendu** : dans l'ordre : profil (initiales, nom, club, ID, année, nation) + « Modifier le profil » + records repliés (n) ; « Jamais synchronisé » ; « Temps affichés » ; Synchroniser et Exporter (Bientôt) ; zone séparée « Supprimer mes données » (Bientôt). Un clic sur un bouton Bientôt affiche le toast et ne supprime rien.

### TC-017 : Modifier puis annuler depuis Paramètres
**Étapes** : ⚙️ → « Modifier le profil » → Annuler → ←.
**Résultat attendu** : retour à Paramètres, puis à l'onglet d'origine ; profil inchangé.

### TC-018 : Ouverture de Paramètres ou du formulaire pendant le chargement (non-régression de BUG-01)
**Préconditions** : profil existant, JSON GitHub retardés de plus de 4 s.
**Étapes** : ⚙️ → « Modifier le profil » → saisir, puis attendre la fin du chargement.
**Résultat attendu (après correction)** : le formulaire et la saisie restent en place. Paramètres, s'il est ouvert, se met à jour avec les records.

### TC-019 : Réseau qui ne répond pas (non-régression de BUG-02)
**Préconditions** : `fetch` vers GitHub jamais résolu.
**Étapes** : créer un profil.
**Résultat attendu (après correction)** : au-delà du délai maximal, l'app s'affiche avec le message « Aucune donnée » ou une erreur réseau ; jamais de blocage sur « ✓ C'est parti ! ».

### TC-020 : Responsive
**Étapes** : écrans de configuration (avec erreurs), Temps, popup et Paramètres à 320, 375, 768 et 1200 px.
**Résultat attendu** : pas de défilement horizontal ; boutons du header 44×44 ; titre masqué à 320 px seulement ; popup contenue dans l'écran, y compris avec des données longues (non-régression de BUG-05).

### TC-021 : Clavier sur l'écran de configuration
**Étapes** : parcourir avec Tab et choisir le genre avec les flèches.
**Résultat attendu** : ordre Nom → ID → Genre → Année → Club → Enregistrer ; les flèches changent le genre ; Entrée dans un champ soumet le formulaire ; aucun élément masqué (onglets, header) ne reçoit le focus.

### TC-022 : Ancienne clé v1
**Préconditions** : `swimmer_profile` et `athlete_id` présents, pas de `swimtimes_profile`.
**Résultat attendu** : formulaire vide (en attendant US-008), clés v1 conservées, aucune erreur JS. Avec v1 et v2 présents, le profil v2 est utilisé.

---

## Re-test des corrections (2026-10-01)

Rôle : QA (`.claude/agents/qa.md`) · Version : working tree (`app.js` 1425 lignes, `index.html` 267 lignes) · Outil : Playwright/Chromium, serveur local, JSON GitHub interceptés.
Les réseaux lent ou bloqué sont simulés en remplaçant `window.fetch` (délai, promesse jamais résolue, HTTP 500), avec respect de `AbortSignal`. Les écouteurs du document sont suivis en instrumentant `addEventListener` et `removeEventListener`.
Scripts et captures : `scratchpad/qa2/` (`t_load.py`, `t_profile.py`, `t_review.py`, `t_tc.py`, `t_kbd.py`, `t_contrast.py`, `t_contrast2.py`, `t_shots.py`, `shots/`). Ces scripts sont indépendants de ceux du développeur.

### Points re-testés

| Point | Verdict | Preuve |
|---|---|---|
| BUG-01 A : formulaire ouvert pendant le chargement | ✅ | JSON retardés de 4 s, ⚙️ → Modifier → saisie. Après le chargement, `setup-active` est conservé, la saisie « Ava Hehlen-Modif » et le focus aussi. |
| BUG-01 B : Paramètres ouverts pendant le chargement | ✅ | « Temps affichés : Chargement des temps… » devient « Données du club du 03.02.2026 ». « 🇨🇭 SUI » et « Mes records personnels (34) » apparaissent sans fermer l'écran. |
| Review bloquant : changement d'ID pendant le chargement | ✅ | 5332548 → 999 donne `not-found` et aucun temps de l'ancien ID. 999 → 5332548 donne 34 PB. Le jeton écarte le résultat périmé. |
| BUG-02 : état de chargement, délai max, parallèle | ✅ | Avec un réseau bloqué, l'app s'affiche 0,65 s après « Enregistrer ». Le message « Chargement des temps… » apparaît dans Temps, Progression (spinner) et Paramètres. Après 8,06 s, il devient « Impossible de charger les temps… », avec le libellé « Impossible de charger les temps » dans Paramètres. Les 2 requêtes partent au même instant : chargement en 3,03 s pour 3 s de délai par fichier. HTTP 500 donne aussi l'erreur, et l'ID 999 donne « Aucune donnée ». |
| BUG-02 : genre et avatar avant chargement | ✅ | Rechargement d'un profil masculin avec réseau bloqué : `select-gender` = Male et avatar « AH » dès 200 ms. |
| BUG-03 : profil stocké invalide | ✅ | `gender` "X" ou absent, `birthYear` "3000" ou "abc", `name` "   " ou objet, ID "abc<b>" ou vide : le formulaire s'ouvre pré-rempli, avec le bandeau et l'erreur sur le bon champ. "Male"/"Female" sont convertis en M/F. Après correction et enregistrement, `createdAt` (2026-01-01) est conservé, `getProfile()` est valide et l'app s'affiche. Effets secondaires : voir BUG-10 et BUG-11. |
| BUG-04 : initiales | ✅ | « 🏊 Ava Hehlen » → AH ; « Ava 🏊 » → A ; « ß ß » → SS ; « Élise Özil » → ÉÖ ; « 李 小龍 » → 李小 ; « 123 Ava » → A. Les noms ZWSP, NNBSP, WJ, « 🏊 », « 123 » et « - » sont refusés (« Indique ton nom complet »). |
| BUG-05 : club long dans la popup | ✅ | À 320 et 375 px, `.swimmer-popup-meta` a un `scrollWidth` égal à son `clientWidth`, la carte reste dans l'écran et il n'y a pas de défilement horizontal (`popup_long_*.png`). |
| BUG-06 : focus | ✅ | Après création au clavier, le focus est sur l'onglet Temps actif (`:focus-visible`). À l'ouverture de « Modifier le profil », il est sur le titre `h1[tabindex=-1]` ; Annuler ou Enregistrer le ramènent sur ← des Paramètres. |
| BUG-07 : contraste | ⚠️ | Contraste mesuré sur les pixels rendus (fond réel sous chaque texte), à 375 et 1200 px. Tous les textes secondaires sont entre 4,84 et 6,7:1 : libellés, aides, `.card-title`, `.settings-row`, ligne saison (.8) à 5,0, onglet inactif à 4,86, écarts colorés de 5,4 à 5,9, `.qualification-level` à 5,2, footer à 5,3. Placeholder dans une carte : 4,88. **Reste sous AA : l'écart `.diff-far` (#fecaca) sur une ligne JO (`tr.olympic`), 4,42:1 à 1200 px et 4,51 à 375 px** (texte 600, ni grand ni gras ≥ 14 pt). Le badge « Bientôt » est à 4,45, mais il est dans un bouton `aria-disabled`, donc exempté. Focus visible sur les champs : double contour blanc (`1200_edit_focus_id.png`). |
| Review : copie du cache | ✅ | `fetchSwimmerData()` renvoie un objet différent de `swimmersData.swimmers[id]`. Le cache n'a pas de `seasonBests` et `swimmer !== cache`. |
| Review : échappement des données JSON | ✅ | `<img onerror>` injecté dans `timeDisplay` (PB et saison), `nation` et `season.label` : aucune exécution, aucun `<img>` créé, le texte brut s'affiche dans Temps, la popup, Paramètres et Progression. |
| Review : écouteurs de la popup (double-clic) | ✅ | Après un double-clic sur l'avatar, ou `show/hide/show/hide` en moins de 10 ms, il ne reste aucun `click:closePopupOnClickOutside` ni `keydown:closePopupOnEscape`. Popup ouverte puis ⚙️ : seul `closeSettingsOnEscape` reste, ce qui est attendu. |
| Review : écouteurs pointerup/pointercancel | ✅ | Après 3 clics et un `pointercancel`, il ne reste aucun écouteur `pointerup` ou `pointercancel` sur le document. |
| Review / R-04 : focus dans la popup | ✅ | Ouverture au clavier : focus sur ✕. Échap : retour à l'avatar. Effet secondaire : voir BUG-12. |
| Review : radiogroup du genre | ✅ | `role="radiogroup"`, `aria-labelledby`, `aria-required="true"`, `aria-describedby="profile-gender-error"`, `aria-invalid` synchronisé. L'arbre a11y expose `radiogroup "Genre *" [invalid]`. |
| R-01 : tutoiement | ✅ | Le CA d'US-002 et la spec 6.2 de `SPECS-V2.md` disent « Clique sur 🔄 pour synchroniser. », comme l'app. |

### Non-régression

- **US-001, US-002, US-004, US-005** : tous les critères rejoués passent (CA4 de `clearAllData`, CA6 de `createdAt` sur 2 sauvegardes, CA2 de `openSettings()` forcé sans profil, CA7 sans sélecteur multi-nageurs, etc.).
- **TC-001 à TC-022** : tous ✅, **sauf TC-010 avec `[1,2]`** ❌ (voir BUG-11). TC-018 et TC-019 sont couverts par les re-tests de BUG-01 et BUG-02, et TC-011 par BUG-03.
  - TC-005 : la création prend 0,64 s et un seul `setItem` est fait malgré double-clic + Entrée (TC-008).
  - TC-020 : pas de défilement horizontal à 320, 375, 768 et 1200 px, boutons 44×44, titre masqué à 320 px seulement.
- **Clavier, parcours complet** :
  - app : 🔄 → ⚙️ → avatar → onglets → 4 sélecteurs ;
  - Paramètres : ← → Modifier → records → 3 boutons Bientôt → header ;
  - édition : titre → champs → Enregistrer → Annuler.
  - Aucun élément masqué ne reçoit le focus.
- **Captures 375 et 1200 px**, regardées une à une : configuration (vide, erreurs, correction), Temps (chargé, chargement, erreur), Progression (chargée, chargement), popup, Paramètres, édition (`shots/375_*`, `shots/1200_*`). Les surfaces plus sombres sont homogènes et je n'ai vu ni chevauchement ni texte coupé.
- Aucune erreur JS dans l'ensemble des scénarios.

### Nouveaux bugs

#### BUG-08 [Mineur, priorité haute] : un changement de genre pendant le chargement est perdu dans Progression

Cause : `loadSwimmerForProfile()` lit `gender` au lancement et l'applique au résultat (`app.js:1366`, `1375`). `handleProfileSubmit()` ne corrige `swimmer.gender` que si `swimmer` existe déjà (`app.js:1345-1347`), ce qui n'est pas le cas pendant le chargement.

**Étapes**
1. Partir d'un profil F, ID 5332548, avec les JSON retardés de 4 s.
2. Pendant le chargement : ⚙️ → Modifier le profil → Homme → Enregistrer.
3. Attendre la fin du chargement, puis ouvrir Progression.

**Attendu** : les temps limites masculins partout.
**Obtenu** : `swimmer.gender` = "Female" alors que le profil est M.
- Temps utilise le genre masculin (`select-gender` = Male, 301 pts FINA).
- Progression utilise les temps limites féminins : 8 qualifiés et 10 objectifs, au lieu de 0 qualifié et 5 objectifs avec le genre masculin.

Les statuts de qualification restent faux jusqu'au rechargement de la page (`t_load.py`, `gender_during_load`).

Piste : appliquer `GENDER_TO_APP[profile.gender]` au moment de la résolution, ou faire lire le genre au profil dans `updateProgressDisplay()`.

#### BUG-09 [Mineur] : la popup de l'avatar n'a pas d'état de chargement et ne se met pas à jour

**Étapes** : JSON retardés de 2 s, ouvrir la popup pendant le chargement, puis attendre.
**Attendu** : un état « chargement » dans la popup, puis les compteurs réels (34 PB, 8 temps 2025-2026), comme dans Paramètres.
**Obtenu** : la popup affiche « 0 PBs · 0 Saison courante » pendant le chargement, puis ne change pas une fois les données arrivées. Il faut la fermer et la rouvrir. En cas d'erreur réseau, elle affiche aussi « 0 PBs » sans indiquer l'erreur. `refreshDataViews()` ne met pas à jour la popup.

#### BUG-10 [Mineur, UX] : bandeau « Vérifie les champs signalés » sans aucun champ signalé

**Étapes** : stocker un profil par ailleurs valide avec `gender: "Male"` (format v1), ou `birthYear: 2010`, `swimrankingsId: 5332548` ou `club: 123` en nombre, puis ouvrir l'app.
**Attendu** : soit le profil est normalisé et accepté (conversion v1, nombre → chaîne), soit le champ en cause est signalé.
**Obtenu** : l'écran de configuration s'affiche avec « ⚠️ Ton profil enregistré est incomplet. Vérifie les champs signalés… », mais aucun champ n'est en erreur, puisque la valeur convertie est valide. L'utilisateur ne sait pas quoi corriger ; un simple « Enregistrer » suffit. Le cas `"Male"`/`"Female"` est celui d'une future migration v1 (US-008).

#### BUG-11 [Mineur] : un JSON qui n'est pas un profil est traité comme un profil à corriger (régression TC-010)

**Étapes** : stocker `swimtimes_profile` = `[1,2]`, `{}` ou `{"createdAt":"…"}`, puis ouvrir l'app.
**Attendu (TC-010)** : un écran de configuration vierge, avec le club pré-rempli « Lausanne Aquatique ».
**Obtenu** : le bandeau « profil incomplet » s'affiche avec 3 erreurs d'emblée (nom, ID, genre), et le club est vide, car `getStoredProfileDraft()` accepte un tableau (`typeof [] === 'object'`) et un objet sans champ texte. `{oops`, `null` et `"Ava"` restent corrects.
Piste : ne pas créer de brouillon si `Array.isArray(stored)` ou si aucun champ de `PROFILE_FIELDS` n'est présent, et garder le club par défaut quand le brouillon n'en a pas.

#### BUG-12 [Mineur, a11y] : fermer la popup avec ✕ perd le focus

Effet de bord de la correction R-04 : le focus entre désormais dans la popup.

**Étapes** : focaliser l'avatar, Entrée (le focus va sur ✕), puis Entrée.
**Attendu** : le focus revient à l'avatar, comme avec Échap.
**Obtenu** : `document.activeElement` = `<body>`. Piste : `hideSwimmerPopup()` appelé depuis ✕ doit refocaliser `#header-avatar`.

### Remarques complémentaires

- **R-13** : Tab depuis ✕ quitte la popup (vers les onglets) sans la fermer. C'est acceptable pour une popover non modale, mais à harmoniser avec `role="dialog"` : soit fermer au `focusout`, soit utiliser `aria-modal` avec un piège de focus.
- **R-14** : sur le formulaire de correction d'un profil invalide, le focus reste sur `<body>`. Le bandeau `role="status"` est présent dès le rendu et risque de ne pas être annoncé. On peut focaliser le premier champ en erreur ou le bandeau.
- **R-15** (pré-existant, défense en profondeur) : Progression injecte `eventName` (`pb.distance` et `pb.stroke` du JSON) sans échappement. Ce n'est pas exploitable aujourd'hui, car une épreuve inconnue n'a pas de temps limite et n'est donc pas rendue. À échapper avant la Phase 2.
- **Résidu BUG-07** : `.diff-far` sur une ligne JO est à 4,42:1. On peut assombrir la teinte (par ex. `#fee2e2`, ou enlever le fond jaune) ou passer l'écart en gras 14 pt.

### Verdict du re-test

**✅ Corrections validées avec réserves.**
- Corrigés : BUG-01 à BUG-06, le point bloquant de la review, les 6 points de review annoncés et R-01.
- Partiellement corrigé : BUG-07. Il reste un seul cas de contraste sous AA, sur les lignes JO.
- Non-régression : US-001, US-002, US-004 et US-005 passent, ainsi que TC-001 à TC-022, sauf TC-010 avec `[1,2]`.
- Nouveaux bugs : 5, tous mineurs (BUG-08 à BUG-12), aucun bloquant.

**BUG-08 est à corriger avant livraison**, car il peut afficher de faux statuts de qualification. Les autres bugs peuvent être traités avec US-006 et US-008.

> **Suivi du re-test (2026-10-01)** : BUG-07 (ligne JO, contrôlée sur les 124 lignes JO de toutes les épreuves, 0 échec), BUG-08 à BUG-12, R-13, R-14 et R-15 sont corrigés et couverts par des tests automatiques.
