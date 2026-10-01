# QA – Phase 1, partie 2 (US-003, US-006, US-007, US-008, US-009)

> **Suivi (2026-10-01)** : BUG-13 à BUG-16 sont corrigés et couverts par des tests automatiques. Pour BUG-13, le double tap a été rejoué sur 4 tailles d'écran, à la souris et au tactile. R-16 à R-24 et R-26 sont traités (R-16 : confirmation d'abandon, décision A). Pour R-27, les marqueurs `TODO Phase 3` sont ajoutés. R-25 (fond cliquable) n'est pas retenu : la confirmation d'une action destructrice ne se ferme qu'explicitement.


Date : 2026-10-01 · Rôle : QA (`.claude/agents/qa.md`) · Version testée : working tree (`git diff HEAD -- app.js index.html`, `app.js` 1644 lignes, `index.html` 299 lignes)
Outil : Playwright/Chromium avec un serveur HTTP local. Les JSON GitHub sont interceptés et servis depuis les fichiers locaux. Le réseau lent, bloqué ou en erreur est simulé en remplaçant `window.fetch`, avec respect de `AbortSignal`. Le stockage bloqué est simulé en remplaçant `Storage.prototype.setItem` / `removeItem`. Le double tap est rejoué avec un écran tactile émulé (`has_touch`, `is_mobile`).
Scripts et captures : `scratchpad/qa3/` (`t_us003.py`, `t_us006.py`, `t_us007.py`, `t_dbl_delete.py`, `t_dialog_extra.py`, `t_us008.py`, `t_a11y_resp.py`, `t_nonreg.py`, `audit_contrast_qa3.py`, `out_*.txt`, `shots/`). Ces scripts sont indépendants de ceux du développeur.

Les points déjà tranchés dans `QA-PHASE-1.md` (BUG-01 à BUG-12, R-01 à R-15, tutoiement) ne sont pas rapportés à nouveau.

## Synthèse

**Verdict : ⚠️ VALIDÉ SOUS RÉSERVE. La livraison est conditionnée à la correction de BUG-13.**

Les 24 critères d'acceptation de US-003, US-006, US-007, US-008 et US-009 passent. La non-régression est complète : critères de US-001, 002, 004 et 005, et cas TC-001 à TC-022.

Le test exploratoire a trouvé **1 bug majeur**. Un double tap sur « Supprimer mes données » efface toutes les données sans passer par la confirmation, sur les tailles d'iPhone les plus courantes (BUG-13). Il a aussi trouvé **3 bugs mineurs** : le dialog est mal placé sur tablette et ordinateur, la migration v1 reprend le nom au format « NOM, Prénom », et le piège de focus a une faille.

| Sévérité | Nombre |
|----------|--------|
| Bloquant | 0 |
| Majeur | 1 (BUG-13) |
| Mineur | 3 (BUG-14, BUG-15, BUG-16) |
| Écart à un CA | 0 |

Points solides vérifiés :
- **Extraction de l'ID** : fonctionne en http et https, quel que soit l'ordre des paramètres, avec `athleteId`, `athleteid` ou `ATHLETEID`, avec des espaces autour. Elle marche avec `fill`, avec un vrai collage (`Meta+V` depuis le presse-papiers) et avec une frappe caractère par caractère. Une erreur déjà affichée s'efface.
- **Édition** :
  - « Enregistrer » est inactif tant que rien ne change, et redevient inactif quand on revient aux valeurs initiales, y compris après une erreur de validation ou de stockage.
  - Un double-clic ne fait qu'un seul `setItem`.
  - `createdAt` est conservé et `updatedAt` est mis à jour.
- **Changement d'ID** :
  - `swimtimes_pb` et `swimtimes_season` sont supprimés, les autres clés sont conservées, et les temps du nouvel ID sont chargés.
  - Avec le même ID, ou un retour à l'ancien ID avant l'enregistrement, rien n'est supprimé.
- **Changement de genre** : Temps (`select-gender` = Male, 301 pts FINA) et Progression (0 / 0 / 5) donnent les mêmes valeurs qu'un profil créé directement en H.
- **Suppression pendant un chargement réseau** : les anciennes données ne réapparaissent jamais (jeton `swimmerLoadId`).
- **Dialog** :
  - L'arbre a11y expose `dialog "Supprimer mes données ?"` avec la description complète, `modal: true`.
  - Le focus initial est sur Annuler.
  - Échap ferme le dialog sans fermer Paramètres, et le focus revient à « Supprimer mes données ».
- **Écouteurs du document** : aucun ne reste après les enchaînements édition / Échap / dialog.
- **Échappement XSS** : un nom ou un club malveillant venant de la v1 ou de la v2 est affiché comme du texte.
- **Contraste AA** : l'audit sur les pixels rendus ne trouve aucun échec, à 375 et 1200 px. Il couvre le dialog, l'avertissement d'ID, l'aide, l'ID extrait et le bandeau de reprise v1.
- **Erreurs JS** : aucune dans l'ensemble des scénarios.

---

## Checklists de validation

### Validation US-003 : Aide « Comment trouver mon ID ? »

#### Critères d'acceptation
- [x] CA1 : le lien « ⓘ Comment trouver mon ID ? » est sous le champ ID. C'est un `<button type="button">` de 44 px de haut, avec `aria-controls="profile-id-help"` → ✅
- [x] CA2 : un clic déplie l'aide sans quitter le formulaire. Le nom et l'ID saisis sont conservés, aucune erreur n'est déclenchée, et `aria-expanded` passe de false à true puis à false → ✅
- [x] CA3 : l'aide donne les 4 étapes (swimrankings.net ↗, recherche, page nageur, nombre après `athleteId=`) avec l'exemple `…athleteId=5332548` surligné → ✅
- [x] CA4 : une adresse collée est remplacée par l'ID, avec le message « ✓ ID extrait de l'adresse » (`role="status"`, effacé après 3 s) → ✅ (cas limites : R-20)

#### Tests additionnels
- [x] Clavier : Tab va de ID à l'aide, puis au lien (si l'aide est dépliée), puis au genre. Entrée et Espace déplient et replient l'aide
- [x] Lien externe : il s'ouvre dans un nouvel onglet (`rel="noopener"`) et la saisie est conservée (accessibilité : R-21)
- [x] Limite de 10 chiffres : `1234567890` et `0` sont acceptés, `12345678901` est refusé, y compris quand il vient d'une adresse
- [x] Création complète avec une adresse collée : le profil est stocké avec `swimrankingsId: "5332548"`
- [x] Responsive 320 / 375 / 1200 : l'aide dépliée ne provoque pas de défilement horizontal
- [x] `GUIDE-INSTALLATION.md` est mis à jour

### Validation US-006 : Modification du profil

#### Critères d'acceptation
- [x] CA1 : ⚙️ → « Modifier le profil » ouvre le formulaire pré-rempli (nom, ID, F, 2010, club) → ✅
- [x] CA2 : le titre est « Modifier le profil », avec Annuler et ← (« Annuler et revenir aux paramètres »). Le focus est sur le titre → ✅
- [x] CA3 : les validations sont les mêmes qu'en création. Nom vide, ID `53a` ou à 11 chiffres, années 1919 et 2027 : message d'erreur, focus sur le champ, rien n'est enregistré → ✅
- [x] CA4 : après l'enregistrement, les changements apparaissent sans recharger la page. Avatar « LM », popup « Léa Müller / Red Fish • SUI », Paramètres, et Temps et Progression pour le genre → ✅
- [x] CA5 : Annuler, ← et Échap n'enregistrent rien, et le formulaire rouvert est identique → ✅
- [x] CA6 : `createdAt` est conservé et `updatedAt` est mis à jour → ✅
- [x] CA7 : quand l'ID change, l'avertissement s'affiche sous le champ (et figure dans `aria-describedby`) ; à l'enregistrement, `swimtimes_pb` et `swimtimes_season` sont supprimés → ✅ (R-18)

#### Tests additionnels
- [x] Enchaînement modifier → Échap → modifier → enregistrer : toast « ✓ Profil mis à jour », focus sur ← des Paramètres, puis ← ramène à l'onglet d'origine (Progression)
- [x] Échap quand l'aide ID est dépliée (focus sur le lien) : l'édition est annulée (comportement à discuter : R-16). Un 2e Échap ferme Paramètres
- [x] Échap pendant un chargement réseau : retour aux Paramètres avec « Chargement des temps… ». Un changement d'ID annulé pendant le chargement n'a aucun effet
- [x] Édition ouverte pendant le chargement : la saisie est conservée à la fin du chargement, puis l'enregistrement affiche les records (34)
- [x] Changement d'ID puis retour à l'ancien (saisi tel quel, avec espaces ou via une adresse) : avertissement masqué et Enregistrer inactif
- [x] Changement d'ID enregistré puis retour à l'ancien : les temps de chaque ID sont rechargés
- [x] Erreur de validation : Enregistrer reste actif ; il redevient inactif si on revient aux valeurs initiales et se réactive après correction
- [x] Erreur de stockage : `.error-box`, bouton réactivé, profil en mémoire inchangé (avatar « AH ») ; un nouvel essai réussit (message obsolète : R-19)
- [x] Entrée dans un champ inchangé : rien ne se passe
- [x] Double-clic sur Enregistrer : un seul `setItem` (autres double-clics : R-17)
- [x] Popup de l'avatar ou dialog pendant l'édition : impossible, car le header est masqué. Une popup ouverte au clavier avant « Modifier le profil » se ferme au clic
- [x] Échap en mode création : sans effet
- [x] Responsive 320 / 375 / 768 / 1200 avec aide, avertissement et erreur : pas de défilement horizontal ; ←, aide, Enregistrer et Annuler font au moins 44 px
- [x] Clavier : titre → Nom → ID → aide → genre → année → club → (Enregistrer s'il est actif) → Annuler. Maj+Tab depuis le titre va sur ←

### Validation US-007 : Suppression de mes données

#### Critères d'acceptation
- [x] CA1 : la confirmation s'affiche dans l'app avec un texte explicite (tutoiement documenté) et les boutons « Annuler » / « 🗑️ Supprimer » → ✅ (contournée par un double tap : BUG-13)
- [x] CA2 : la confirmation supprime `swimtimes_profile`, `swimtimes_pb`, `swimtimes_season`, `swimmer_profile` et `athlete_id`. Les autres clés du navigateur sont conservées → ✅
- [x] CA3 : l'écran de configuration initial s'affiche, vierge (club par défaut, sans bandeau v1), avec le focus sur le titre, le toast « ✓ Données supprimées de cet appareil », le header réduit et l'avatar vide → ✅
- [x] CA4 : Annuler (clic ou Entrée) et Échap ne suppriment rien → ✅
- [x] CA5 : Tab et Maj+Tab bouclent sur Annuler et Supprimer → ✅ (faille quand le focus est sur le conteneur : BUG-16)

#### Tests additionnels
- [x] Lecteur d'écran : rôle `dialog`, nom « Supprimer mes données ? », description complète, `modal: true`, erreur dans un `role="alert"`
- [x] Clic sur le fond : la confirmation reste ouverte et rien n'est supprimé (R-25)
- [x] Échap puis Échap : le 1er ferme le dialog, le 2e ferme Paramètres
- [x] Suppression pendant un chargement (3 s) : rien ne réapparaît à la fin du chargement (`swimmer` = null, écran de configuration)
- [x] Suppression puis nouveau profil (5284006, 999, ou même ID pendant un réseau bloqué) : les données affichées sont celles du nouveau profil, et rien ne change après rechargement
- [x] Stockage bloqué (`removeItem` lève une `SecurityError`) : « ✗ Impossible de supprimer les données de cet appareil. » s'affiche dans le dialog, rien n'est supprimé et le focus reste piégé. À la réouverture, l'erreur est effacée (suppression partielle : R-26)
- [ ] Double clic ou double tap sur « Supprimer mes données » : voir **BUG-13**
- [x] Bottom sheet mobile (320, 375) : collé en bas, pleine largeur, boutons de 48 et 56 px
- [ ] Rendu à 768 et 1200 px : voir **BUG-14**

### Validation US-008 : Migration du profil existant

#### Critères d'acceptation
- [x] CA1 : un `swimmer_profile` v1 réel (l'objet nageur complet de `swimmers-data.json`) pré-remplit nom, ID, genre (Female → F), année (nombre → « 2010 ») et club → ✅ (format du nom : BUG-15)
- [x] CA2 : message « 👋 On a retrouvé ton profil. Vérifie tes infos et enregistre. » (tutoiement documenté) → ✅
- [x] CA3 : à l'enregistrement, le profil v2 est créé et `swimmer_profile` et `athlete_id` sont supprimés → ✅
- [x] CA4 : « Repartir de zéro » donne un formulaire vierge (club par défaut), supprime les clés v1 et met le focus sur le titre. Au clavier aussi. Après rechargement, le formulaire reste vierge → ✅
- [x] CA5 : un `swimmer_profile` corrompu (`{oops`, `[1,2]`, `"Ava"`, `null`, `{}`) donne un formulaire vierge sans erreur → ✅

#### Tests additionnels
- [x] `id` et `yearOfBirth` en nombres : convertis
- [x] Genre absent ou invalide (`X`, `F`, `male`) : erreur sur le genre, avec le focus dessus
- [x] `firstName` / `lastName` sans `fullName` : « Ava Hehlen »
- [x] Profil sans `id` mais avec `athlete_id` : l'ID est repris
- [x] ID `53a` et année 1900 : erreurs affichées d'emblée, focus sur l'ID
- [x] `athlete_id` seul : formulaire vierge, et la clé est supprimée à la création (R-23)
- [x] v2 valide + v1 : l'app s'affiche avec le profil v2 (les clés v1 restent : R-23)
- [x] v2 invalide + v1 : le profil v2 est prioritaire, le bandeau « incomplet » s'affiche, et à l'enregistrement le `createdAt` v2 est conservé et la v1 est supprimée
- [x] v2 en tableau ou corrompu + v1 : reprise de la v1
- [x] Rechargement sans enregistrer : le pré-remplissage revient, et les clés v1 sont conservées
- [x] XSS (`fullName` `<img onerror>`, club `"><b>`) : valeurs injectées par `.value`, rien n'est exécuté
- [x] Responsive 320 / 375 / 1200 : pas de défilement horizontal, « Repartir de zéro » fait 44 px
- [ ] Focus et annonce du bandeau dans le cas nominal : R-22

### Validation US-009 : Affichage des temps pendant la transition

#### Critères d'acceptation
- [x] CA1 : avec les ID 5332548 et 5284006, les PB, les temps de saison, les points FINA et Progression sont identiques à la v1 (34 et 39 PB, 8 et 23 temps de saison) → ✅
- [x] CA2 : avec l'ID 999, le message 6.2 s'affiche dans Temps, Progression, la popup (« — ») et Paramètres → ✅
- [x] CA3 : nom et club viennent du profil (« Prénom Test », « Mon Club ») et non du JSON (« HEHLEN, Ava ») ; seule la nation (SUI) vient du JSON → ✅

#### Tests additionnels
- [x] États chargement, erreur réseau et délai de 8 s : voir TC-018 et TC-019
- [ ] Marqueurs `TODO Phase 3` : voir R-27

---

## Bugs

### BUG-13 [Majeur] : un double tap sur « Supprimer mes données » supprime tout, sans confirmation

Cause : sur mobile (≤ 480 px), la confirmation est un bottom sheet dont le bouton « 🗑️ Supprimer » occupe le bas de l'écran. Quand Paramètres tient sans défilement, « Supprimer mes données » se trouve lui aussi en bas de l'écran. Le premier tap ouvre le dialog. Le second tombe sur « 🗑️ Supprimer », qui agit immédiatement. Cette action est irréversible.

**Étapes**
1. Profil existant, écran de 375×812 (iPhone X/11 Pro/12 mini) ou 390×844 (iPhone 12 à 15, et notamment l'app installée sur l'écran d'accueil, `apple-mobile-web-app-capable`).
2. ⚙️, puis double tap (ou double-clic) sur « 🗑️ Supprimer mes données ».

**Attendu** : la confirmation reste affichée et rien n'est supprimé.
**Obtenu** : toutes les clés SwimTimes sont supprimées, et l'écran de configuration vierge s'affiche avec le toast « ✓ Données supprimées ».

Mesures (`t_dbl_delete.py`, souris et tactile) :

| Viewport | 320×568 | 375×667 | **375×812** | **390×844** | 414×896 | 768×1024 | 1200×800 |
|---|---|---|---|---|---|---|---|
| Données supprimées | non | non | **oui** | **oui** | non (2e tap sur Annuler) | non | non |

Pistes :
- ignorer les clics sur les boutons du dialog pendant 300 à 500 ms après `showModal()` ;
- ou placer Annuler en bas du bottom sheet (Supprimer au-dessus), ce qui est l'ordre habituel des feuilles d'action iOS ;
- ou exiger que `pointerdown` et `click` aient lieu tous deux dans le dialog.

### BUG-14 [Mineur, à corriger avant livraison] : au-delà de 480 px, la confirmation est collée en haut à gauche

Cause : le reset global `*{margin:0}` annule le `margin:auto` que le navigateur applique à `dialog:modal` pour le centrer. Seule la règle mobile (`@media(max-width:480px){margin:auto 0 0}`) rétablit une marge.

**Étapes** : à 768 ou 1200 px de large, ⚙️ → « Supprimer mes données ».
**Attendu** : la confirmation est centrée dans l'écran.
**Obtenu** : la boîte de 400 px est collée au coin supérieur gauche (`x=0`, `y=0`), sur le logo, avec le dégradé assombri à côté (`shots/768_dialog.png`, `shots/1200_dialog.png`).
Piste : ajouter `margin:auto` sur `.dialog`.

### BUG-15 [Mineur, UX] : la migration v1 reprend le nom au format SwimRankings « NOM, Prénom »

Le `swimmer_profile` v1 est l'objet nageur de `swimmers-data.json`, dont `fullName` vaut toujours « HEHLEN, Ava ». C'est le cas des 8 nageurs du fichier. La correspondance `fullName` → `name` donne donc :
- le formulaire pré-rempli avec « HEHLEN, Ava » (`shots/375_migration_v1.png`) ;
- après enregistrement, l'avatar « **HA** » au lieu de « AH » (règle d'US-004 : première lettre du premier et du dernier mot) ;
- le nom affiché en majuscules avec une virgule dans la popup et Paramètres.

**Étapes** : `swimmer_profile` = `swimmers.5332548` de `swimmers-data.json`, ouvrir l'app, puis Enregistrer.
**Attendu** : « Ava Hehlen » et l'avatar « AH », sans ressaisie (« sans friction »).
**Obtenu** : « HEHLEN, Ava » et l'avatar « HA ». L'utilisateur doit corriger lui-même un nom qu'on lui présente comme « retrouvé ».

Le comportement est conforme à la note technique (`fullName` → `name`), mais il touche 100 % des utilisateurs migrés. Piste : préférer `firstName + ' ' + lastName` (casse « Hehlen » à normaliser), ou retourner « NOM, Prénom » en « Prénom Nom ».

### BUG-16 [Mineur, a11y] : le focus peut sortir de la confirmation par Maj+Tab

**Étapes** : ouvrir la confirmation, cliquer sur son titre ou son texte (le focus passe sur le `<dialog>` lui-même), puis appuyer sur Maj+Tab.
**Attendu** : le focus reste dans la confirmation (CA5).
**Obtenu** : le focus quitte la page (`document.activeElement` = `<body>`, vers l'interface du navigateur). Il ne revient dans le dialog qu'au Maj+Tab suivant. `trapDeleteDialogFocus()` ne traite que le cas où le focus est sur le premier ou le dernier bouton.
Piste : si `document.activeElement` n'est pas l'un des boutons, envoyer le focus sur le premier (Tab) ou sur le dernier (Maj+Tab).

---

## Remarques (non bloquantes, hors bug)

- **R-16, Échap en édition** : Échap annule toute l'édition sans confirmation, même avec des modifications non enregistrées et quand le focus est dans l'aide ID dépliée. L'utilisateur peut chercher à refermer l'aide et perdre sa saisie. On peut faire en sorte qu'Échap replie d'abord l'aide si le focus y est, ou demander confirmation si le formulaire a été modifié.
- **R-17, autres double-clics de navigation** : ces cas ont la même cause que BUG-13 (un nouvel écran apparaît sous le pointeur), sans perte de données.
  - Un double-clic sur ← en édition ramène directement à l'onglet, en sautant Paramètres.
  - Un double-clic sur Annuler déclenche un bouton « Bientôt » des Paramètres, avec un toast.
  - Un double-clic sur « Modifier le profil » met le focus dans le champ ID, ce qui ouvre le clavier sur mobile.
- **R-18, avertissement de changement d'ID** : il s'affiche aussi pour une valeur invalide (`abc`), en même temps que l'erreur une fois le champ quitté. De plus, il apparaît pendant la frappe sans région live : un lecteur d'écran ne l'annonce que si l'on revient sur le champ. Pistes : n'afficher l'avertissement que pour un ID valide, et l'annoncer via `aria-live="polite"`.
- **R-19, erreur de stockage en édition** : le message « ✗ Impossible d'enregistrer… » reste affiché après un retour aux valeurs initiales, alors qu'Enregistrer est redevenu inactif. Il ne disparaît qu'au prochain envoi.
- **R-20, extraction de l'ID, cas rares** :
  - Une adresse **tapée** au clavier est réduite à l'ID dès le premier chiffre qui suit `athleteId=`. Si d'autres paramètres suivent (`…athleteId=5332548&pbest=2026`), ils restent collés à l'ID, qui devient invalide. Le collage n'est pas concerné.
  - Avec plusieurs `athleteId`, c'est le premier qui est retenu.
  - Une adresse encodée (`athleteId%3D…`) n'est pas reconnue.
  - Une adresse de plus de 300 caractères est tronquée par `maxlength` avant l'extraction, et l'ID est alors perdu.
- **R-21, lien externe** : « swimrankings.net ↗ » s'ouvre dans un nouvel onglet sans que ce soit indiqué au lecteur d'écran. On peut ajouter un texte masqué « (nouvel onglet) ».
- **R-22, reprise v1 au lecteur d'écran (cas nominal)** : quand le profil v1 est complet (le cas le plus fréquent), le focus reste sur `<body>`. Le bandeau `role="status"` est présent dès le rendu et risque de ne pas être annoncé. C'est le même constat que R-14, qui n'a été corrigé que lorsqu'un champ est en erreur. Piste : focaliser le titre ou le bandeau.
- **R-23, clés v1 résiduelles** :
  - Si un profil v2 valide existe, `swimmer_profile` (l'objet complet avec 34 PB) et `athlete_id` restent indéfiniment, jusqu'à « Supprimer mes données ».
  - Un `athlete_id` seul n'est pas repris. Ce cas n'est pas produit par la v1, qui écrivait les deux clés ensemble.
- **R-24, « Repartir de zéro »** : il supprime définitivement le profil v1, sans confirmation, en un clic sur un lien discret. Si le stockage refuse la suppression, le bandeau 👋 réapparaît aussitôt, sans message d'erreur.
- **R-25, clic sur le fond de la confirmation** : il ne ferme pas la confirmation. C'est défendable pour une action destructrice, mais sur mobile un bottom sheet se ferme habituellement au tap hors du panneau. C'est à trancher côté UX. Si le fond devient cliquable, il faudra tenir compte de BUG-13.
- **R-26, suppression partielle** : si `removeItem` échoue sur une clé intermédiaire (cas théorique), `swimtimes_profile` est déjà supprimé mais le profil reste affiché, tandis que les temps et les clés v1 restent dans le stockage. Au rechargement, on obtient un formulaire vierge. Piste : supprimer `swimtimes_profile` en dernier.
- **R-27, US-009** : un seul marqueur `// TODO Phase 3` (`loadSwimmerForProfile`). Le reste du pont temporaire n'est pas marqué : `fetchSwimmerData`, `createJsonLoader`, `SWIMMERS_*_URL` et la ligne « Temps affichés ».

---

## Non-régression

- **US-001, US-002, US-004, US-005** : tous les critères rejoués passent (`t_nonreg.py`).
- **TC-001 à TC-022** : tous ✅. Deux comportements ont changé, comme le prévoient les nouvelles US :
  - TC-003 : une adresse complète est désormais acceptée, l'ID étant extrait (US-003) ;
  - TC-022 : la clé v1 seule pré-remplit le formulaire (US-008). Avec v1 + v2, le profil v2 est utilisé.

| TC | Résultat |
|---|---|
| TC-001 | écran de configuration, sans onglets ni actions du header, club par défaut, aucun genre |
| TC-002 | 3 erreurs, focus sur Nom, `aria-invalid` ; espaces, tabulation et NBSP refusés |
| TC-003 | `05332548` et ` 5332548 ` acceptés ; `533 2548`, `-5`, `5.3`, `１２３` refusés |
| TC-004 | 1920 et 2026 acceptés ; 1919, 2027, `20a0` et `0201` refusés |
| TC-005 / TC-008 | « ✓ C'est parti ! », un seul `setItem` malgré double-clic + Entrée |
| TC-006 | ID 999 → « Aucune donnée… » ; HTTP 500 → « Impossible de charger… » |
| TC-007 | aucune exécution, aucun `<img>` injecté |
| TC-009 | quota plein : `.error-box` et valeurs conservées ; `SecurityError` : le formulaire s'affiche |
| TC-010 / TC-011 | `[1,2]` et `{}` donnent un formulaire vierge (BUG-11 tenu) ; `Male` donne le bandeau « doit être vérifié » (BUG-10 tenu) |
| TC-012 | profil conservé après rechargement, `createdAt` inchangé |
| TC-013 | popup, Échap, clic extérieur, ✕ ; le focus revient à l'avatar (BUG-12 tenu) |
| TC-014 / TC-015 / TC-017 / TC-018 / TC-019 | conformes ; avec un réseau bloqué, l'app s'affiche en 0,64 s et l'erreur apparaît à 8,04 s |
| TC-016 | ordre conservé ; seuls Synchroniser et Exporter sont « Bientôt » ; Supprimer est actif |
| TC-020 | pas de défilement horizontal à 320, 375, 768 et 1200 px ; boutons de 44×44 ; titre masqué à 320 px seulement |

- **Contraste** : l'audit sur 14 écrans, à 375 et 1200 px, donne 0 échec (`audit_contrast_qa3.py`).
- **Captures regardées une à une** :
  - configuration avec l'aide dépliée ;
  - reprise v1 à 375 et 1200 px ;
  - édition à l'ouverture, et avec aide, avertissement et erreur à 320 px ;
  - Paramètres avec toast à 320 et 1200 px ;
  - confirmation à 320, 375, 768 et 1200 px, avec et sans erreur ;
  - écran après suppression.

  Aucun chevauchement ni texte coupé, à part BUG-14. Le header qui apparaît au milieu des captures pleine page vient du mode `sticky`, pas de l'app.

---

## Cas de test

### TC-023 : Aide « Comment trouver mon ID ? »
**Préconditions** : écran de configuration (ou d'édition).
**Étapes** : 1. Saisir un nom et un ID. 2. Cliquer « ⓘ Comment trouver mon ID ? ». 3. Cliquer à nouveau. 4. Refaire au clavier (Tab depuis l'ID, Entrée, puis Espace).
**Résultat attendu** : l'aide se déplie et se replie, avec `aria-expanded` synchronisé ; elle contient les 4 étapes, le lien swimrankings.net (nouvel onglet) et l'exemple `…athleteId=5332548` ; la saisie est conservée ; aucune erreur n'est affichée ; l'ordre de tabulation est ID → aide → lien (si l'aide est dépliée) → genre.

### TC-024 : Extraction de l'ID depuis une adresse
**Étapes** : coller (presse-papiers réel) chaque adresse dans le champ ID.
**Données de test** :
- `https://www.swimrankings.net/index.php?page=athleteDetail&athleteId=5332548` → `5332548` ;
- même chose en `http` → `5332548` ;
- `…?athleteId=5332548&page=athleteDetail&pbest=2026` → `5332548` ;
- `athleteid=`, `ATHLETEID=`, avec des espaces autour → `5332548` ;
- `…athleteId=` (sans chiffre) → inchangé, puis erreur une fois le champ quitté ;
- `…athleteId=12345678901` → `12345678901`, puis erreur « 10 au maximum ».

**Résultat attendu** : « ✓ ID extrait de l'adresse » est annoncé (`role="status"`) puis disparaît après 3 s ; une erreur déjà affichée s'efface.

### TC-025 : Longueur de l'ID
**Données de test** : `0` ✅ ; `1234567890` ✅ ; `12345678901` ❌ « L'ID ne contient que des chiffres (10 au maximum) ». Un profil stocké avec un ID de plus de 10 chiffres ouvre le formulaire de correction.

### TC-026 : Ouverture de l'édition
**Préconditions** : profil Ava Hehlen, 5332548, F, 2010, Lausanne Aquatique ; onglet Progression.
**Étapes** : ⚙️ → « Modifier le profil ».
**Résultat attendu** : titre « Modifier le profil » focalisé ; champs pré-remplis, avec F coché ; Enregistrer inactif ; Annuler et ← présents ; header sans 🔄, ⚙️ ni avatar ; pas d'avertissement d'ID.

### TC-027 : État d'Enregistrer en édition
**Étapes** : 1. Modifier le nom. 2. Revenir au nom initial. 3. Saisir l'année `19`, puis Enregistrer. 4. Remettre `2010`. 5. Saisir `2011`.
**Résultat attendu** : 1 → actif ; 2 → inactif ; 3 → erreur, toujours actif ; 4 → inactif et erreur effacée ; 5 → actif. Entrée dans un champ inchangé ne fait rien.

### TC-028 : Enregistrement d'une modification
**Étapes** : nom « Léa Müller », club « Red Fish », puis Enregistrer.
**Résultat attendu** :
- retour aux Paramètres, avec le focus sur ← et le toast « ✓ Profil mis à jour » (2 s) ;
- l'avatar affiche « LM », la popup et Paramètres sont à jour ;
- `createdAt` est inchangé et `updatedAt` est mis à jour ;
- `swimtimes_pb` est conservé (même ID) ;
- ← ramène à l'onglet d'origine.

### TC-029 : Annulation (bouton, ←, Échap) et enchaînements
**Étapes** : Modifier → saisir → Annuler ; Modifier → saisir → Échap ; Modifier → saisir → ← ; Modifier → enregistrer.
**Résultat attendu** : chaque annulation ramène aux Paramètres (focus sur ←) sans rien enregistrer ; le formulaire rouvert est identique au profil ; un Échap supplémentaire ferme Paramètres ; aucun écouteur `keydown` ne reste.

### TC-030 : Changement d'ID
**Préconditions** : `swimtimes_pb`, `swimtimes_season` et une clé tierce présents.
**Étapes** :
1. Saisir `5284006`.
2. Revenir à `5332548`.
3. Saisir `5284006` et enregistrer.
4. Remettre `5332548` et enregistrer.

**Résultat attendu** :
- 1 → « ⚠️ Les temps synchronisés de l'ancien ID seront supprimés. » ;
- 2 → avertissement masqué, Enregistrer inactif ;
- 3 → `swimtimes_pb` et `swimtimes_season` supprimés, clé tierce conservée, temps de ROCHAT affichés (39 PB) ;
- 4 → temps de HEHLEN (34 PB).

Une modification qui ne touche pas l'ID ne supprime rien.

### TC-031 : Changement de genre
**Étapes** : profil F → Modifier → Homme → Enregistrer → ← → Progression.
**Résultat attendu** : `select-gender` = Male, 301 pts FINA dans Temps ; Progression = 0 qualifié, 0 à refaire, 5 objectifs, comme un profil créé directement en H.

### TC-032 : Erreur de stockage en édition
**Étapes** : modifier le nom, `setItem` lève `QuotaExceededError`, Enregistrer ; rétablir le stockage, puis Enregistrer.
**Résultat attendu** : `.error-box` ; valeurs conservées ; bouton actif ; profil en mémoire et avatar inchangés ; au second essai, enregistrement et toast.

### TC-033 : Édition pendant un chargement réseau
**Préconditions** : JSON GitHub retardés de 3 s.
**Étapes** : Modifier → saisir → Échap ; Modifier → saisir → attendre la fin du chargement → Enregistrer ; Modifier → ID 999 → Échap.
**Résultat attendu** : retour aux Paramètres avec « Chargement des temps… » ; la saisie survit à la fin du chargement ; les records (34) apparaissent après l'enregistrement ; l'ID annulé n'a aucun effet.

### TC-034 : Confirmation de suppression, contenu et accessibilité
**Étapes** : ⚙️ → « 🗑️ Supprimer mes données ».
**Résultat attendu** : dialog modal « Supprimer mes données ? » ; texte « Ton profil et tes temps seront supprimés de cet appareil. Cette action est irréversible. » ; focus sur Annuler ; arbre a11y = `dialog` avec nom, description et `modal` ; le reste de la page est inerte.

### TC-035 : Clavier dans la confirmation
**Étapes** : Tab ×3, Maj+Tab ×3 ; clic sur le texte puis Tab et Maj+Tab ; Échap ; Échap.
**Résultat attendu** : le focus boucle sur Annuler et Supprimer et ne quitte jamais le dialog (non-régression de BUG-16) ; le 1er Échap ferme le dialog et rend le focus à « Supprimer mes données », sans rien supprimer ; le 2e Échap ferme Paramètres.

### TC-036 : Suppression confirmée
**Préconditions** : `swimtimes_profile`, `_pb`, `_season`, `swimmer_profile`, `athlete_id` et une clé tierce présents.
**Étapes** : Supprimer → « 🗑️ Supprimer ».
**Résultat attendu** : seule la clé tierce reste ; écran de configuration vierge (club par défaut, sans bandeau) ; focus sur « Configuration du profil » ; toast « ✓ Données supprimées de cet appareil » ; header réduit ; popup fermée ; Échap sans effet.

### TC-037 : Suppression pendant un chargement
**Préconditions** : JSON retardés de 3 s.
**Étapes** : ⚙️ → Supprimer → confirmer dans la 1re seconde, puis attendre 4 s.
**Résultat attendu** : l'écran de configuration reste affiché ; `swimmer` = null ; aucun ancien temps n'est réaffiché ; aucune erreur JS.

### TC-038 : Suppression puis nouveau profil
**Étapes** : supprimer, puis créer « Leane Rochat » 5284006 (ou ID 999), puis recharger.
**Résultat attendu** : avatar « LR », 39 PB et 23 temps de saison (ou « Aucune donnée » pour 999), Paramètres à jour, état identique après rechargement.

### TC-039 : Suppression avec un stockage bloqué
**Étapes** : `removeItem` lève une `SecurityError`, puis confirmer.
**Résultat attendu** : le dialog reste ouvert avec « ✗ Impossible de supprimer les données de cet appareil. » (`role="alert"`) ; aucune clé supprimée ; focus piégé ; à la réouverture, le message est effacé ; une fois le stockage rétabli, la suppression fonctionne.

### TC-040 : Double clic ou double tap sur « Supprimer mes données » (non-régression de BUG-13)
**Préconditions** : viewports 375×812 et 390×844, souris et tactile.
**Étapes** : ⚙️ → double tap sur « 🗑️ Supprimer mes données ».
**Résultat attendu** : la confirmation est ouverte et **aucune** donnée n'est supprimée.

### TC-041 : Rendu de la confirmation
**Étapes** : ouvrir la confirmation à 320, 375, 768 et 1200 px.
**Résultat attendu** : bottom sheet pleine largeur collé en bas jusqu'à 480 px ; au-delà, boîte de 400 px **centrée** (non-régression de BUG-14) ; pas de défilement horizontal ; boutons d'au moins 44 px.

### TC-042 : Reprise d'un profil v1 réel
**Préconditions** : `swimmer_profile` = `swimmers.5332548` de `swimmers-data.json`, `athlete_id` = `5332548`, pas de `swimtimes_profile`.
**Étapes** : ouvrir l'app, puis Enregistrer.
**Résultat attendu** :
- à l'ouverture : bandeau 👋 et « Repartir de zéro » ; nom « Ava Hehlen » (après correction de BUG-15), 5332548, Femme, 2010, Lausanne Aquatique ; aucune erreur ;
- après Enregistrer : profil v2 stocké, `swimmer_profile` et `athlete_id` supprimés, avatar « AH », temps affichés.

### TC-043 : Formes variées de `swimmer_profile`
**Données de test** :

| `swimmer_profile` | Résultat attendu |
|---|---|
| `{fullName, id: 5332548, yearOfBirth: 2010, gender: "Female"}` | pré-rempli, nombres convertis |
| genre absent, `X`, `F` ou `male` | erreur sur le genre et focus dessus |
| `{firstName, lastName}` | « Ava Hehlen » |
| sans `id`, avec `athlete_id` | ID repris |
| `id: "53a"`, `yearOfBirth: 1900` | 2 erreurs, focus sur l'ID |
| `{oops`, `[1,2]`, `"Ava"`, `null`, `{}` | formulaire vierge, sans erreur |
| `athlete_id` seul | formulaire vierge |
| nom ou club avec `<img onerror>` | texte brut, rien d'exécuté |

### TC-044 : Profils v1 et v2 simultanés
**Données de test** :

| Situation | Résultat attendu |
|---|---|
| v2 valide + v1 | l'app s'affiche avec le profil v2 |
| v2 invalide (`gender: "X"`) + v1 | formulaire de correction v2, sans bandeau 👋 ; à l'enregistrement, `createdAt` v2 conservé et clés v1 supprimées |
| v2 `[1,2]` ou `{oops` + v1 | reprise de la v1 |

### TC-045 : « Repartir de zéro »
**Étapes** : clic, ou Entrée au clavier, sur « Repartir de zéro », puis recharger.
**Résultat attendu** : formulaire vierge (club par défaut), sans bandeau ; focus sur le titre ; `swimmer_profile` et `athlete_id` supprimés ; formulaire toujours vierge après rechargement.

### TC-046 : Rechargement sans enregistrer
**Étapes** : profil v1 pré-rempli, modifier le nom, puis recharger.
**Résultat attendu** : le pré-remplissage v1 revient (saisie non conservée) ; les clés v1 sont toujours présentes.

### TC-047 : Temps pendant la transition (US-009)
**Données de test** : profil « Prénom Test », « Mon Club », avec les ID 5332548, 5284006 et 999.
**Résultat attendu** : avec 5332548, 34 PB / 8 temps de saison, Progression 8 / 0 / 10 ; avec 5284006, 39 / 23, Progression 25 / 5 / 4 ; avec 999, « Aucune donnée. Clique sur 🔄 pour synchroniser. » partout et « — » dans la popup. Le nom et le club affichés sont toujours ceux du profil, jamais « HEHLEN, Ava ».

---

## Priorités proposées

1. **BUG-13** avant toute livraison : une perte de données irréversible, en un geste courant sur les iPhone les plus répandus.
2. **BUG-14** : une ligne de CSS, visible par tous les utilisateurs sur tablette et ordinateur.
3. **BUG-15** : touche chaque utilisateur v1 au moment de la migration, à faire avant la mise en ligne de la v2.
4. BUG-16, puis les remarques R-16 à R-27 selon le temps disponible.

---

## Re-test des corrections (2026-10-01)

Version testée : working tree (`app.js` 1844 lignes, `index.html` 280 lignes, `node --check` OK). Même outillage que plus haut (Playwright/Chromium, serveur local, JSON GitHub interceptés, `fetch` simulé, écran tactile émulé). Les clics dans la confirmation sont faits 450 ms après l'ouverture, sauf quand le délai de 400 ms est justement testé.
Scripts et sorties : `scratchpad/qa4/` (`t_bug13.py`, `t_bug17_survey.py`, `t_fixes.py`, `t_decisionA.py`, `t_regress.py`, `t_shots.py`, `out_*.txt`, `shots/`). Les scripts de la QA précédente ont été rejoués dans `qa4/nr/` après mise à jour des identifiants (`confirm-*`), et leurs sorties comparées à celles de `qa3/`.

### Verdict

**⚠️ VALIDÉ SOUS RÉSERVE. La livraison est conditionnée à la correction de BUG-17.**

BUG-13 à BUG-16, les 2 bloquants de la review et les remarques annoncées sont corrigés. Les décisions A et B sont conformes. La non-régression est complète.
Mais le déplacement d'« Annuler » en bas du bottom sheet a déplacé le problème de BUG-13 sur d'autres iPhone. Sur 414×896 (iPhone XR / 11 / 11 Pro Max) et 402×874 (iPhone 16 Pro), le bouton « 🗑️ Supprimer » de la confirmation se trouve exactement sous « Supprimer mes données ». Deux taps espacés de 450 ms effacent donc tout (BUG-17, majeur). Le double tap rapide (< 400 ms), lui, est bien neutralisé partout.

| Sévérité | Nouveaux |
|---|---|
| Bloquant | 0 |
| Majeur | 1 (BUG-17) |
| Mineur | 1 (BUG-18) |

### Points re-testés

| Point | Verdict | Preuve |
|---|---|---|
| **BUG-13** double tap sur « Supprimer mes données » | ✅ (voir BUG-17) | 7 tailles du rapport (320×568 → 1200×800) × souris et tactile, double tap à 120 ms et dblclick : rien n'est supprimé, la confirmation reste ouverte. À 375×812 et 390×844, le 2e tap tombe sur Annuler et il est ignoré (délai de 400 ms). Taps espacés de 250 ms : idem. |
| **BUG-14** position au-delà de 480 px | ✅ | 481, 768, 1200 px : boîte de 400 px centrée (écart au centre 0/0 px). ≤ 480 px : bottom sheet collé en bas. Pas de défilement horizontal. Boutons de 56 et 48 px. |
| **BUG-16** Maj+Tab depuis le dialog lui-même | ✅ | Clic sur le titre, le texte, la marge ou le message d'erreur, puis Tab ou Maj+Tab : le focus reste sur Supprimer ou Annuler. La boucle Tab / Maj+Tab ×3 est correcte. |
| **BUG-15** / bloquant review, nom v1 | ✅ | Les 8 nageurs de `swimmers-data.json` donnent « Ava Hehlen », « Alice Mei Pennel », « Jamie Alexander Pennel », etc. Après Enregistrer : avatar « AH » et « AP », même nom dans la popup et les Paramètres. Avec `fullName` seul : « DUPONT-ROCHE, Jean Marc » → « Jean Marc Dupont-Roche », « O'NEIL, Sean » → « Sean O'Neil », « MÜLLER, Zoé » → « Zoé Müller ». Un nom de famille déjà en casse mixte (« McDonald ») n'est pas modifié. |
| `athlete_id` en texte brut | ✅ | `0123456` est repris tel quel, sans `console.warn`. `abc` est repris puis signalé en erreur. |
| Bloquant review, avertissement d'ID | ✅ | Arbre a11y : en création, à l'ouverture de l'édition et après une modification du club, la description du champ ne contient que l'aide. Avec `5284006` : l'avertissement est ajouté à `aria-describedby` et la région est `aria-live="polite"`. Au retour à l'ancien ID, il est retiré (hauteur 0). Remarque R-28. |
| R-18, avertissement pour un ID invalide | ✅ | Avec `abc`, seule l'erreur est affichée et décrite, sans avertissement. |
| Échap : répétition et IME | ✅ | En édition sans modification, un appui long ramène aux Paramètres sans les fermer. Dans les Paramètres, un appui long ne ferme qu'une fois. Un `keydown` Échap avec `isComposing` n'a aucun effet. |
| Échap dans l'aide ID dépliée | ✅ | Focus sur le lien ou sur le bouton : l'aide se replie et le focus va sur « Comment trouver mon ID ? ». L'édition reste ouverte et aucune confirmation ne s'affiche. L'Échap suivant applique la décision A. |
| DOM après suppression | ⚠️ | Paramètres vidés, `#pb-time` = « — », tableaux Temps et Progression vides. **Mais** `#swimmer-popup-content` garde le nom, le club, la nation, l'ID et les compteurs (BUG-18). |
| R-26, profil supprimé en dernier | ✅ | Avec `removeItem` qui échoue sur `swimtimes_season` : erreur dans la confirmation, `swimtimes_profile` est conservé et le profil reste affiché. Après rechargement, l'app s'ouvre normalement. |
| R-24, « Repartir de zéro » | ✅ | Confirmation « Repartir de zéro ? » (Annuler / Repartir de zéro), avec le focus sur Annuler. Annuler ne supprime rien. Stockage refusé : « ✗ Impossible d'effacer l'ancien profil sur cet appareil. » et clés conservées. À la réouverture, l'erreur est effacée. Une fois confirmé : formulaire vierge, focus sur le titre, clés supprimées, état conservé après rechargement. Fonctionne aussi au clavier. |
| R-23, clés v1 au lancement | ✅ | Avec un profil v2 valide et une v1, il ne reste que `swimtimes_profile`, `_pb`, `_season` et la clé tierce. Avec un profil v2 invalide, la v1 est conservée (TC-044 inchangé). |
| R-22, bandeau v1 | ✅ | `#profile-notice` est vide au rendu et rempli à 100 ms (`role="status"`). Le focus est sur « Configuration du profil ». |
| R-19, erreur de stockage | ✅ | Le message disparaît dès la saisie suivante, y compris au clic sur un genre. |
| R-20, extraction de l'ID | ✅ | Collage immédiat. Adresse tapée : elle reste entière pendant la frappe et est réduite à la sortie du champ, `&pbest=2026` compris. Adresse encodée (`%3D`) et adresse de plus de 300 caractères : `5332548`. Plusieurs `athleteId` : le premier est retenu (non annoncé, inchangé). |
| R-21, nouvel onglet | ✅ | Nom accessible du lien : « swimrankings.net ↗ (nouvel onglet) ». Le texte n'est pas visible à l'écran. |
| Genre sans `fieldset` | ✅ | `radiogroup` « GENRE * », `required`, description de l'erreur et `invalid=true` en cas d'erreur. Plus aucun `fieldset` ni `legend`. |
| R-27, `TODO Phase 3` | ✅ | 4 marqueurs : `fetchSwimmerData`, `createJsonLoader`/URL, `loadSwimmerForProfile` et la ligne « Temps affichés ». |
| CSS mort, `renderProfileForm` découpé | ✅ | Les sélecteurs signalés sont absents. Le formulaire passe par `renderProfileFormHtml`, `fillProfileForm`, `bindProfileFormEvents` et `bindSwimrankingsIdField`. |
| Focus après Annuler / ← / Échap / Enregistrer | ✅ | Le focus va sur « Modifier le profil » dans tous les cas. Toast « ✓ Profil mis à jour » après Enregistrer. |
| R-25 (fond cliquable) | — | Non retenu, comme annoncé. Un clic sur le fond laisse la confirmation ouverte. |
| R-17 (autres double-clics) | — | Non annoncé. Avec des modifications, un double-clic sur Annuler ou ← ouvre la confirmation et le 2e clic est ignoré (4 tailles, souris et tactile). Sans modification, le comportement d'origine reste. |

### Décision A : abandon des modifications

✅ Conforme (`t_decisionA.py`) :
- **Sans modification** : Annuler, ← et Échap ramènent directement aux Paramètres, sur l'onglet d'origine, avec le focus sur « Modifier le profil ». C'est aussi le cas après une modification annulée à la main, ou un ID remplacé par une adresse équivalente.
- **Avec modifications** : Annuler, ← et Échap ouvrent « Abandonner les modifications ? ».
  - Arbre a11y : `dialog` modal, avec le nom et la description « Tes modifications du profil ne seront pas enregistrées. ».
  - Boutons « Abandonner » / « Continuer la modification », avec le focus sur « Continuer la modification ».
- **« Continuer la modification »** (clic ou Échap natif) : la saisie est conservée et l'aide reste dans son état. Le focus revient au déclencheur : Annuler, ←, ou le champ pour Échap.
- **« Abandonner »** (clic ou clavier) : retour aux Paramètres, avec le focus sur « Modifier le profil ». Le stockage est inchangé et le formulaire rouvert est identique au profil.
- **Écouteurs** : `cancelProfileEditOnEscape` ou `closeSettingsOnEscape` selon l'écran, jamais les deux. Aucun ne reste en place.
- Un Échap maintenu avec des modifications ouvre la confirmation, puis la répétition de la touche la referme (Chromium). On reste en édition sans rien perdre, ce qui est acceptable.

### Décision B : `GUIDE-INSTALLATION.md`

✅ Les lignes « Hors connexion » et « synchronisées automatiquement chaque jour » sont retirées. La ligne « Première utilisation » décrit le formulaire et ⚙️ Paramètres. Il ne reste aucune affirmation fausse dans le guide.

### Régressions recherchées

| Scénario | Résultat |
|---|---|
| Erreur de suppression → Annuler → édition → abandon | ✅ L'erreur est effacée. Titre, texte et bouton « Abandonner » sont corrects, et l'action exécutée est bien l'abandon : aucune clé n'est supprimée. |
| Abandon → suppression aussitôt après | ✅ Le contenu de la suppression est correct. Échap ferme la confirmation (focus sur « Supprimer mes données »), puis un 2e Échap ferme les Paramètres. |
| Repartir de zéro : erreur → Échap → réouverture | ✅ L'erreur est effacée. |
| Entrée ou Espace juste après l'ouverture (< 400 ms) | ✅ La 2e frappe est ignorée sans rien supprimer ni abandonner. Après 450 ms, Entrée sur Annuler ou « Continuer » ferme normalement. Entrée maintenue 1 s sur « Supprimer mes données » : rien n'est supprimé. Une frappe très rapide est donc perdue en silence (acceptable). |
| Suppression au clavier (Espace, Maj+Tab, Entrée) | ✅ Données supprimées, focus sur « Configuration du profil ». |
| Popup avatar et Paramètres | ✅ ⚙️ ferme la popup. Échap dans la popup ouverte depuis les Paramètres ne ferme que la popup. La popup est à jour après Enregistrer (« Léa Müller », « LM »). Un clic sur « Supprimer mes données » ferme la popup. |
| Adresse tapée puis Entrée sans quitter le champ | ✅ En création : ID `5284006` stocké, « ✓ ID extrait », temps de ROCHAT affichés. En édition : avertissement affiché pendant la frappe, ID enregistré, `_pb` et `_season` supprimés. `…athleteId=` sans chiffre : erreur, rien n'est enregistré. |
| Suppression pendant un chargement de 3 s (TC-037) | ✅ Écran de configuration, `swimmer` = null, aucun temps réaffiché. |
| Nouveau profil après suppression | ✅ « LR », 39 PB, 23 temps de saison, popup à jour. |
| Erreurs JS | ✅ Aucune dans l'ensemble des scénarios. |
| Rendu (captures regardées à 375 et 1200 px) | ✅ Confirmations de suppression (avec et sans erreur), d'abandon et de repartir de zéro ; édition avec aide et avertissement ; reprise v1 ; Paramètres. Bottom sheet à 375 px, boîte centrée à 1200 px. Aucun chevauchement ni texte coupé. Le texte « (nouvel onglet) » est invisible. |
| Contraste AA | ✅ 0 échec sur 34 écrans à 375 et 1200 px, dont les 3 confirmations et la confirmation en erreur (`out_contrast.txt`). |

### Non-régression

- **US-001 à US-009** : tous les critères passent. Les sorties sont identiques à la QA précédente, en dehors des changements voulus suivants :
  - TC-022 et R-23 : les clés v1 sont supprimées quand un profil v2 valide existe.
  - TC-029 : avec des modifications, Annuler, ← et Échap passent par la confirmation (décision A). Le focus revient sur « Modifier le profil » et non plus sur ←.
  - TC-035 : la boucle commence par « 🗑️ Supprimer » (Annuler est en bas). Le focus initial est toujours sur Annuler.
  - TC-042 : le nom est « Ava Hehlen » et l'avatar « AH ».
  - TC-043 : un genre v1 `"F"` est désormais accepté tel quel (`X`, `male` et genre absent restent en erreur). C'est sans conséquence, car la v1 écrit `Female`/`Male`.
  - TC-045 : « Repartir de zéro » demande une confirmation.
- **TC-001 à TC-047** : tous ✅. **TC-040 ✅** sur les tailles prévues (375×812 et 390×844), mais voir BUG-17 pour 402×874 et 414×896. TC-041 ✅ (BUG-14).

### Nouveaux bugs

#### BUG-17 [Majeur] : deux taps espacés de 450 ms sur « Supprimer mes données » suppriment tout, sur iPhone 11 / XR / 16 Pro

Cause : la protection de 400 ms ne couvre que le double tap rapide. Avec Annuler désormais en bas, c'est « 🗑️ Supprimer » qui se retrouve sous le déclencheur quand les Paramètres tiennent à l'écran sans défilement. Sur 414×896, cette taille était protégée avant la correction, car le 2e tap tombait alors sur Annuler.

**Étapes**
1. Profil existant, écran de 414×896 (iPhone XR, 11, 11 Pro Max et XS Max ; en particulier l'app installée sur l'écran d'accueil, que recommande le guide) ou 402×874 (iPhone 16 Pro).
2. ⚙️, puis deux taps sur « 🗑️ Supprimer mes données », espacés de 450 à 700 ms.

**Attendu** : la confirmation reste ouverte. Une action irréversible ne doit pas pouvoir être confirmée par un tap au même endroit que celui qui l'a ouverte.
**Obtenu** : toutes les données sont supprimées, avec le toast « ✓ Données supprimées ».

Mesures (`t_bug17_survey.py`, tactile, 2 taps à 450 ms) :

| Viewport | 375×812 | 390×844 | 393×852 | **402×874** | 412×915 | **414×896** | 428×926 | 430×932 | **480×900** |
|---|---|---|---|---|---|---|---|---|---|
| Sous le 2e tap | Annuler | Annuler | Annuler | **Supprimer** | marge | **Supprimer** | texte | texte | **Supprimer** |
| Recouvrement du déclencheur par « Supprimer » | 0 % | 9 % | 23 % | 95 % | 32 % | 66 % | 12 % | 2 % | 59 % |
| Données supprimées | non | non | non | **oui** | non | **oui** | non | non | **oui** |

Le résultat dépend de la hauteur du contenu des Paramètres. Il peut donc changer avec le nom, le club ou la présence de records.

Pistes, à combiner :
- délai de garde réservé au bouton destructeur et plus long (environ 800 à 1000 ms, le temps de lire la question), avec un état visuellement inactif pendant ce délai ; Annuler reste immédiat ;
- ou ignorer un clic sur « Supprimer » dont la position tombe dans le rectangle du déclencheur, tant que le pointeur n'a pas été relâché ailleurs dans la confirmation ;
- vérifier ensuite toutes les hauteurs de 360 à 480 px avec 2 taps à 450 et 700 ms (TC-048).

#### BUG-18 [Mineur, confidentialité] : la popup de l'avatar garde les données du profil supprimé

**Étapes** : profil existant ; ouvrir une fois la popup de l'avatar ; ⚙️ → « Supprimer mes données » → « 🗑️ Supprimer » ; inspecter `#swimmer-popup-content`.
**Attendu** : plus aucune donnée de l'ancien profil dans la page (annoncé dans le suivi de la review, qui citait `#swimmer-popup-content`).
**Obtenu** : le contenu masqué contient toujours le nom (« Léa Müller »), le club, la nation, « ID: 5332548 » et les compteurs de PB. Rien n'est visible à l'écran : le contenu est réécrit à la prochaine ouverture et l'avatar est masqué.
Piste : `document.getElementById('swimmer-popup-content').innerHTML = ''` dans `resetToFirstLaunch()`.

### Remarques

- **R-28, avertissement d'ID réécrit à chaque frappe** : `updateEditState` réaffecte `textContent` à chaque `input` de **n'importe quel** champ. Mesuré : 7 mutations de la région live en tapant l'ID, puis 5 en tapant dans Nom et Club une fois l'ID changé. Selon le couple navigateur / lecteur d'écran, « Les temps synchronisés de l'ancien ID seront supprimés » risque d'être relu à chaque frappe. Ce point n'a pas été vérifié avec un vrai lecteur d'écran. Piste : n'écrire le texte que s'il change.
- **R-29, `getLegacyName`, cas extrêmes** : « HEHLEN, » reste « HEHLEN, », et « A, B, C » donne « B A ». Aucun profil v1 réel n'a cette forme, donc aucune action n'est nécessaire.

### Nouveaux cas de test

- **TC-048 (BUG-17)** : viewports de 360 à 480 px de large et de 800 à 960 px de haut, tactile. ⚙️ → 2 taps sur « Supprimer mes données », espacés de 120, 450 et 700 ms. **Attendu** : aucune suppression, la confirmation reste ouverte.
- **TC-049 (décision A)** : édition → modifier le nom → Annuler, ← et Échap (le focus étant dans le champ). **Attendu** : « Abandonner les modifications ? », avec le focus sur « Continuer la modification ». « Continuer » ou Échap conservent la saisie et rendent le focus au déclencheur. « Abandonner » ramène aux Paramètres, avec le focus sur « Modifier le profil », sans rien enregistrer. Sans modification, le retour est direct.
- **TC-050 (confirmation partagée)** : faire échouer la suppression → Annuler → éditer → Annuler. **Attendu** : confirmation d'abandon sans message d'erreur, et « Abandonner » ne supprime rien.
- **TC-051 (BUG-18)** : ouvrir la popup → supprimer les données. **Attendu** : `#swimmer-popup-content` est vide.

> **Suivi du re-test (2026-10-01)** : BUG-17 est corrigé indépendamment de la taille d'écran. Le bouton de confirmation d'une action destructrice reste visiblement inactif pendant 1 s après l'ouverture, et « Annuler » ignore les clics pendant 400 ms. Testé avec des taps espacés de 450, 700 et 900 ms à 414×896, 402×874, 480×900, 375×812 et 390×844 : aucune suppression. Le piège du focus ne compte que les boutons actifs. BUG-18 (popup vidée après suppression) et R-28 (avertissement réécrit seulement quand il change) sont corrigés.

## Re-test BUG-17, BUG-18, R-28 (2026-10-01)

Version testée : working tree (`app.js` 1853 lignes, `index.html` 282 lignes). Même outillage (Playwright/Chromium, serveur local, JSON GitHub interceptés, `fetch` simulé, écran tactile émulé).
Scripts et sorties : `scratchpad/qa5/` : `t_bug17_gaps.py` (dérivé de `qa4/t_bug17_survey.py`), `t_side.py`, `t_hold.py`, `t_shots.py`, `out_*`, `shots/`. Les scripts `qa4/nr/` et `qa4/t_*.py` ont été rejoués sans modification dans `qa5/`, et leurs sorties comparées à celles de `qa4/` (`diff_*.txt`).

### Verdict

**✅ VALIDÉ. La Phase 1 peut être livrée.**

BUG-17, BUG-18 et R-28 sont corrigés. Aucune suppression n'a lieu avec deux taps espacés de moins de 1 s, quelle que soit la taille d'écran, à la souris comme au tactile. La non-régression est complète.
Un nouveau bug mineur (BUG-19) a été trouvé. Il ne bloque pas la livraison : le délai de 1 s porte sur le moment où le doigt se relève, pas sur celui où il touche l'écran.

| Sévérité | Nouveaux |
|---|---|
| Bloquant | 0 |
| Majeur | 0 |
| Mineur | 1 (BUG-19) |

### BUG-17 : deux taps sur « Supprimer mes données »

✅ **Corrigé.** Protocole d'origine : ⚙️, puis deux taps (ou deux clics) au centre de « Supprimer mes données », sans délai pour faire défiler. L'écart est mesuré dans la page entre les deux `pointerdown` (écart réel à ±10 ms). 17 tailles × 9 écarts × 2 modes, soit 306 essais.

Données supprimées (tactile / souris identiques, sauf à 1000 ms, voir la note) :

| Viewport | Sous le 2e tap | 100 | 120 | 250 | 450 | 700 | 900 | 1000 | 1100 | 1500 |
|---|---|---|---|---|---|---|---|---|---|---|
| 320×568 | texte | non | non | non | non | non | non | non | non | non |
| 360×640 | texte | non | non | non | non | non | non | non | non | non |
| 360×800 | texte | non | non | non | non | non | non | non | non | non |
| 375×667 | texte | non | non | non | non | non | non | non | non | non |
| 375×812 | Annuler | non | non | non | non ¹ | non ¹ | non ¹ | non ¹ | non ¹ | non ¹ |
| 390×844 | Annuler | non | non | non | non ¹ | non ¹ | non ¹ | non ¹ | non ¹ | non ¹ |
| 393×852 | Annuler | non | non | non | non ¹ | non ¹ | non ¹ | non ¹ | non ¹ | non ¹ |
| **402×874** | **Supprimer** | non | non | non | non | non | non | oui ² | oui ³ | oui ³ |
| 412×915 | marge | non | non | non | non | non | non | non | non | non |
| 414×736 | texte | non | non | non | non | non | non | non | non | non |
| **414×896** | **Supprimer** | non | non | non | non | non | non | souris oui, tactile non ² | oui ³ | oui ³ |
| 428×926 | texte | non | non | non | non | non | non | non | non | non |
| 430×932 | texte | non | non | non | non | non | non | non | non | non |
| 440×956 | texte | non | non | non | non | non | non | non | non | non |
| **480×900** | **Supprimer** | non | non | non | non | non | non | non ² | oui ³ | oui ³ |
| 768×1024 | fond du dialog | non | non | non | non | non | non | non | non | non |
| 1200×800 | fond du dialog | non | non | non | non | non | non | non | non | non |

1. Le 2e tap tombe sur Annuler : ignoré avant 400 ms, puis il ferme la confirmation sans rien supprimer.
2. À 1000 ms, le résultat dépend de quelques millisecondes : suppression si le 2e tap arrive à 1001-1003 ms, aucune à 995-1001 ms. C'est la limite attendue.
3. **Remarque, pas un bug.** Au-delà de 1 s, le bouton est visiblement actif (rouge plein, voir les captures). Un tap à cet endroit est un geste volontaire, et la confirmation a été affichée au moins 1 s.

Contrôles complémentaires :
- À 414×896 en tactile, un tap à 950 ms ne supprime rien et un tap à 1050 ms supprime : le seuil est bien de 1 s.
- `t_bug13.py` (qa4) rejoué : 0 suppression sur l'ensemble des cas. Les 4 suppressions de qa4 (414×896 et 402×874, écarts de 450 et 700 ms) ont disparu.
- `nr/t_dbl_delete.py` est identique à qa4 : double clic et double tap à 120 ms neutralisés sur les 7 tailles.
- La déclaration du développeur (« aucune suppression à 450, 700 et 900 ms ») est confirmée pour des taps brefs. Pour un 2e tap qui dure plus de 100 ms, voir BUG-19.

### Effets de bord du délai de 1 s

| Point | Verdict | Preuve |
|---|---|---|
| Les 3 confirmations | ✅ | Suppression, « Abandonner les modifications ? » et « Repartir de zéro ? » : `#confirm-ok` est `disabled` à l'ouverture et devient actif à 1000-1001 ms (MutationObserver). Le focus initial est sur Annuler / « Continuer la modification ». Une fois le bouton actif, la confirmation au clavier (Maj+Tab, Entrée) exécute la bonne action : clés supprimées et focus sur « Configuration du profil » ; abandon, avec le focus sur « Modifier le profil » ; reprise à zéro, avec les clés v1 supprimées. |
| Tab / Maj+Tab pendant la 1re seconde | ✅ | Tab ×2 et Maj+Tab ×2 laissent le focus sur Annuler. Le focus ne sort pas du dialog et le bouton grisé n'est jamais atteint. |
| Tab / Maj+Tab après 1 s | ✅ | La boucle reprend sur les 2 boutons : Supprimer → Annuler → Supprimer… dans les deux sens, pour les 3 confirmations. |
| Entrée / Espace sur le bouton grisé | ✅ | Le bouton grisé ne peut pas recevoir le focus. Un clic dessus à 450 ms met le focus sur le dialog lui-même. Entrée et Espace n'ont alors aucun effet, Tab ramène sur Annuler, et rien n'est supprimé. |
| Entrée sur Annuler à 200 ms | ✅ | Ignorée (garde de 400 ms). La confirmation reste ouverte. |
| Entrée / Espace maintenus 2 s sur « Supprimer mes données » | ✅ | Aucune suppression. Avec Entrée, la répétition ouvre et ferme la confirmation via Annuler, et le focus finit sur « Supprimer mes données ». Avec Espace, la confirmation reste ouverte avec le focus sur Annuler. |
| Échap | ✅ | Échap à 100 ms (avant la garde d'Annuler) et à 600 ms ferme la confirmation. Le focus revient sur « Supprimer mes données ». Le comportement est inchangé une fois le bouton actif. |
| Lecteur d'écran | ✅ | Arbre a11y : `button "🗑️ Supprimer" [disabled]` à l'ouverture, puis l'état désactivé est retiré à 1,1 s. Même chose pour « Abandonner » et « Repartir de zéro ». Le passage à l'état actif n'est pas annoncé. C'est acceptable, car le focus est sur Annuler et l'état est relu dès que l'utilisateur atteint le bouton. Non vérifié avec un vrai lecteur d'écran. |
| Réouverture rapide | ✅ | (a) Ouverture, Échap à 300 ms, réouverture à 600 ms : grisé à +500 ms de la 2e ouverture, actif à +1001 ms. L'ancien timer n'active pas le bouton à +400 ms. (b) Fermeture à 900 ms et réouverture aussitôt : grisé à +200 et +900 ms, actif à +1001 ms. (c) Réouverture après 1,5 s, une fois le bouton actif : grisé de nouveau. (d) Suppression fermée à 450 ms, puis confirmation d'abandon : « Abandonner » grisé à +400 ms, actif à +1001 ms. |
| Erreur de stockage puis nouvel essai | ✅ | Le message d'erreur s'affiche, le bouton reste actif avec le focus dessus, et les clés sont conservées. Un nouvel essai pendant le blocage affiche la même erreur, sans erreur JS. Une fois le stockage débloqué, un nouvel essai immédiat supprime (pas de nouveau délai : c'est un geste volontaire, sur un bouton déjà actif). Annuler puis réouverture : l'erreur est effacée, le bouton est grisé pendant 1 s, puis la suppression aboutit. |
| Contraste et rendu | ✅ | Captures regardées : `qa5/shots/375_suppr_grise.png`, `375_suppr_actif.png`, `375_suppr_actif_focus.png`, `1200_suppr_grise.png`, `1200_suppr_actif.png`. Grisé : `opacity .45`, curseur `not-allowed`, texte blanc sur rouge éteint, soit 3,29:1. C'est lisible, et un contrôle inactif est exempté du critère 1.4.3. Actif : blanc sur `#E31E24` = 4,69:1 (AA). Contraste du bouton actif avec le fond du dialog : 3,55:1. Anneau de focus visible. La différence entre grisé et actif est nette à 375 et 1200 px. Aucun chevauchement. |
| Erreurs JS | ✅ | Aucune dans l'ensemble des scénarios. |

### BUG-18 : popup de l'avatar

✅ **Corrigé.** Popup ouverte puis suppression : `#swimmer-popup-content` est vide (`""`). La recherche de résidus (« Léa », « Müller », « 5332548 ») dans `body` ne trouve plus que l'exemple d'ID statique de l'aide du formulaire (`profile-id-help`), déjà présent en qa4 et sans lien avec le profil. Après création d'un nouveau profil, la popup affiche « Leane Rochat », « LR », 39 PB, 23 temps de saison et « ID: 5284006 » (TC-051 ✅).

### R-28 : avertissement d'ID

✅ **Corrigé.** Une seule mutation de la région live en tapant les 7 chiffres de `5284006` (contre 7 avant), au moment où l'ID devient valide et différent. Aucune mutation en tapant ensuite dans Nom et Club (contre 5 avant). Le texte, `aria-describedby`, `aria-live="polite"` et le retrait au retour à l'ancien ID sont identiques à qa4.

### Non-régression

Rejeu de `nr/` (8 scripts) et de `t_fixes.py`, `t_regress.py`, `t_decisionA.py` et `t_bug13.py`. Les sorties sont identiques à qa4, à l'exception des horodatages et des changements voulus suivants, tous expliqués par le délai de 1 s :
- `t_us007` / `t_fixes` / `t_dialog_extra` (TC-034, TC-035, BUG-16) : l'arbre a11y montre `[disabled]` sur « 🗑️ Supprimer », et la boucle Tab / Maj+Tab mesurée à 450 ms ne passe que par Annuler. Après 1 s, la boucle sur les 2 boutons a été revérifiée (voir plus haut).
- `t_regress` P3 et C7, `t_decisionA` « Abandonner au clavier » : ces scripts font Maj+Tab puis Entrée à 450 ms. Ils tombent désormais sur Annuler / Continuer, donc rien n'est supprimé ni abandonné. Rejoués à 1,1 s dans `t_side.py` : suppression, abandon et reprise à zéro au clavier fonctionnent.
- `t_bug13` : les 4 suppressions de BUG-17 ont disparu.

**US-007** (critères d'acceptation, `nr/t_us007.py` et `t_side.py`) :
- CA confirmation avant suppression, avec titre, texte et 2 boutons → ✅
- CA Annuler ne supprime rien (clic, Échap) → ✅
- CA suppression de `swimtimes_profile`, `_pb` et `_season`, clés tierces conservées → ✅
- CA retour à l'écran de configuration, toast « ✓ Données supprimées de cet appareil », focus sur le titre → ✅
- CA erreur de stockage affichée, données conservées → ✅
- CA clavier et lecteur d'écran (`dialog` modal nommé et décrit, focus initial sur Annuler, focus piégé) → ✅
- TC-036 à TC-041, TC-048 (BUG-17), TC-050 et TC-051 → ✅

US-001 à US-006, US-008 et US-009 : sorties identiques à qa4 (`t_nonreg`, `t_us003`, `t_us006`, `t_us008`, `t_a11y_resp`).

### Nouveaux bugs

#### BUG-19 [Mineur] : le délai de 1 s porte sur le relâchement du doigt, pas sur l'appui

Le bouton est grisé pendant 1 s, mais le `click` est émis au relâchement. Un 2e tap qui **commence** sur le bouton encore grisé et se **termine** après 1 s confirme donc la suppression. Mesures (`t_hold.py`, 414×896, appui sur « Supprimer mes données » puis 2e appui au même endroit) :

| Début du 2e appui \ durée | 80 ms | 120 ms | 150 ms | 200 ms | 300 ms | 450 ms |
|---|---|---|---|---|---|---|
| 600 ms | non | non | non | non | non | **oui** |
| 800 ms | non | non | non | **oui** | **oui** | **oui** |
| 850 ms | non | non | **oui** | **oui** | **oui** | **oui** |
| 900 ms | non | **oui** | **oui** | **oui** | **oui** | **oui** |
| 950 ms | **oui** | **oui** | **oui** | **oui** | **oui** | **oui** |

Le résultat est identique en tactile (CDP `touchStart` / `touchEnd`) et à la souris. Un tap réel dure environ 80 à 150 ms. La protection effective est donc d'environ 850 à 900 ms après l'ouverture, et non de 1 s. Un 2e tap à 900 ms peut supprimer, contrairement à ce qu'annonce le suivi.
- **Étapes** : 414×896, profil existant, ⚙️, tap sur « Supprimer mes données », puis 2e tap au même endroit à environ 900 ms, le doigt restant posé environ 120 ms.
- **Attendu** : rien n'est supprimé, puisque le bouton était grisé quand le doigt l'a touché.
- **Obtenu** : « ✓ Données supprimées de cet appareil ».
- **Pourquoi mineur** : la plage de BUG-17 (450-700 ms) reste protégée pour tout tap de moins de 300 ms. Le cas exige un 2e tap tardif et appuyé. Le bouton est devenu actif sous le doigt, mais le doigt le masque. Mesuré dans Chromium uniquement : à vérifier sur iOS Safari.
- **Piste** : n'accepter la confirmation que si le `pointerdown` a eu lieu après l'activation. Par exemple, mémoriser `performance.now()` du dernier `pointerdown` sur `#confirm-dialog` et l'ignorer dans `handleConfirmDialogOk` s'il est antérieur à l'ouverture + 1000 ms. Le clavier n'est pas concerné, car le bouton grisé ne peut pas recevoir le focus.

### Remarques

- **R-30** : au-delà de 1 s, un 2e tap au même endroit supprime à 402×874, 414×896 et 480×900. Le bouton est alors visiblement actif : c'est considéré comme volontaire, conformément à la décision. Aucune action n'est nécessaire.
- **R-31** : un tap sur le bouton grisé place le focus sur le dialog lui-même, sans retour visuel ni message. C'est sans conséquence (Tab ramène sur Annuler, Entrée et Espace sont sans effet). Un `aria-describedby` temporaire du type « Disponible dans un instant » n'est pas jugé nécessaire.
- **R-32** : la confirmation d'abandon (« Abandonner ») est aussi grisée pendant 1 s, alors qu'elle n'efface pas de données stockées. C'est cohérent (une saisie est perdue) et peu gênant.

### Nouveaux cas de test

- **TC-052 (BUG-17, délai)** : pour chaque confirmation, `#confirm-ok` est `disabled` de 0 à 1000 ms après chaque ouverture, réouverture rapide comprise, et actif ensuite. Tab / Maj+Tab restent sur Annuler pendant ce délai.
- **TC-053 (BUG-19)** : 414×896, 2e appui commençant à 900 ms et relâché à 1050 ms. **Attendu** : aucune suppression.

> **Suivi BUG-19 (2026-10-01)** : corrigé. Une confirmation au doigt ou à la souris dont l'appui a commencé avant que le bouton soit actif est ignorée. Le clavier n'est pas concerné. Testé : appuis commencés à 600, 850, 900 et 950 ms puis maintenus au-delà de la seconde, à la souris et au doigt (aucune suppression) ; confirmation volontaire après activation à la souris, au doigt, avec Entrée et avec Espace (fonctionne) ; appui pendant une réouverture (ignoré). Le test échoue sur le code sans correctif.
