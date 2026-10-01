## Review : Phase 1, partie 2 – US-003, US-006, US-007, US-008, US-009 + état global (`git diff HEAD -- app.js index.html GUIDE-INSTALLATION.md`)

> **Suivi (2026-10-01)** : les 2 bloquants sont corrigés (avertissement relié au champ seulement quand il est visible ; nom v1 au format « Prénom Nom »). Les non-bloquants sont traités : DOM nettoyé après suppression, Échap filtré (`repeat`, IME), `saveProfile` simplifié, `athlete_id` brut, `isEdit` booléen, appel inutile retiré, focus après Annuler, bandeau annoncé, `fieldset` retiré, focus et conversions mis en commun, `renderProfileForm` découpé, constantes nommées, CSS mort supprimé, guide corrigé. Reportée à la Phase 2 : une fonction `setScreen()` unique pour les changements d'écran.


Périmètre relu : le diff entier dans son état actuel, `app.js` (1644 lignes), `index.html` (299 lignes) et `GUIDE-INSTALLATION.md`, comparés à HEAD (`c5145cd`).
Référentiels : `USER-STORIES-PHASE-1.md` (critères + « Avancement »), `UX-ECRAN-CONFIGURATION.md`, `SPECS-V2.md`, `CLAUDE.md`, `REVIEW-PHASE-1.md` et `QA-PHASE-1.md` avec leurs notes de suivi. Je ne reviens pas sur ce qui y est tranché : logs volontaires, `onclick` inline à constantes, tutoiement, R-03 et R-08 à R-10.
Hors review (reporté explicitement) : synchronisation (Phase 2), stockage local des temps (Phase 3), export (Phase 4), boutons « Bientôt ».

Vérifications faites :
- `node --check app.js` : OK.
- Scripts Playwright/Chromium (`scratchpad/rev2/t1.py` à `t4.py`). Le serveur local tourne sur le port 8793 et les JSON GitHub sont interceptés, ralentis si besoin.
- Scénarios testés : Échap dans la confirmation avec les Paramètres ouverts ; Échap avec la touche maintenue en édition ; changement d'ID par adresse collée ; erreurs de stockage à l'enregistrement et à la suppression ; suppression pendant un chargement lent puis recréation avec un autre ID ; édition ouverte pendant le chargement initial ; reprise v1 avec un vrai profil v1 (objet `swimmer` de `swimmers-data.json`) ; profils v2 invalides ; arbre d'accessibilité (CDP) du champ ID et de la confirmation.
- Aucune erreur JS dans ces scénarios.

---

### ✅ Points positifs

- **Correctifs de la 1re review et de la QA bien faits** :
  - le jeton `swimmerLoadId` (`app.js:1581-1602`) ignore les chargements périmés ;
  - la fin d'un chargement ne change plus d'écran (`refreshDataViews`, `app.js:1605-1611`) ;
  - les données en cache ne sont plus modifiées (copie dans `fetchSwimmerData`, `app.js:399`) ;
  - `getProfile()` valide via `PROFILE_VALIDATORS` ;
  - délai maximal de 8 s avec `AbortController` (`app.js:349-359`), et les deux fichiers sont chargés en parallèle ;
  - les écouteurs `pointerup`/`pointercancel` sont retirés ensemble grâce à un `AbortController` (`app.js:1379-1389`) ;
  - le clic extérieur de la popup n'est écouté que si elle est encore ouverte (`app.js:632-634`).
  
  Testé : avec l'édition ouverte pendant un chargement initial de 3 s, la saisie est conservée. Après une suppression puis la recréation d'un profil avec un autre ID pendant un chargement lent, c'est le bon nageur qui s'affiche.
- **Machine d'états cohérente** :
  - chaque transition retire les écouteurs qu'elle n'utilise plus : `closeSettingsOnEscape` dans `renderProfileForm`, `cancelProfileEditOnEscape` dans `showApp` et `renderProfileForm` ;
  - les écouteurs sont des fonctions nommées, donc un ajout répété est sans effet ;
  - Échap suit le bon ordre. Popup → Paramètres : testé. Confirmation → Paramètres : testé, la confirmation se ferme, les Paramètres restent, le focus revient sur « Supprimer mes données ». Édition → Paramètres. Un écouteur ajouté pendant le traitement d'un `keydown` n'est pas appelé pour cet événement, donc il n'y a pas de double fermeture.
- **US-007** :
  - `<dialog>` natif avec `aria-labelledby` et `aria-describedby` : le nom et la description sont exposés (vérifié dans l'arbre d'accessibilité) ;
  - le focus initial est sur « Annuler » et Tab boucle sur les deux boutons ;
  - le navigateur rend le focus au bouton d'origine à la fermeture ;
  - une erreur de stockage s'affiche dans la confirmation (`role="alert"`, échappée) et est effacée à la réouverture ;
  - le jeton de chargement est incrémenté (`app.js:571`), donc un chargement en cours ne réécrit pas `swimmer`.
- **US-006** :
  - « Enregistrer » est inactif tant que les valeurs nettoyées n'ont pas changé : il redevient inactif si on revient à la valeur initiale, y compris après une erreur de stockage (testé) ;
  - avertissement en cas de changement d'ID ; `clearSyncedTimes()` n'est appelé que si l'ID change vraiment ;
  - `createdAt` est conservé (testé) ; toast et focus sur le titre.
- **US-003** :
  - l'extraction se fait sur `input` (collage et frappe), l'écouteur du champ passant avant celui du formulaire, qui revalide la valeur extraite ;
  - message dans un `role="status"` présent dès le rendu (donc bien annoncé), flash relancé par reflow ;
  - aide dépliable avec `aria-expanded` et `aria-controls` ;
  - limite à 10 chiffres partagée entre la validation et le message.
- **US-008** :
  - correspondance v1 → v2 conforme aux notes techniques, avec conversion du genre et de l'année numérique ;
  - un `swimmer_profile` corrompu est ignoré sans erreur ;
  - « Repartir de zéro » supprime les clés v1, et un enregistrement en création les supprime aussi (vérifié : il ne reste que `swimtimes_profile`) ;
  - un profil v2 invalide est repris en brouillon, `createdAt` compris, au lieu d'être perdu (testé avec `gender: "Male"` et `birthYear: 2010` numérique).
- **Sécurité** : aucune donnée utilisateur dans un attribut ni dans un `onclick`. Le formulaire est pré-rempli via `.value`. Les données externes ajoutées à l'affichage sont échappées : `pb.timeDisplay`, `pb.stroke`, `getSeasonLabel()`, `nation`, `eventName`. Ce point de la 1re review est donc traité.
- Indentation à 4 espaces partout dans le nouveau code (vérifié par script), commentaires en français, `const`/`let`, pas d'`eval`.

---

### 🔧 À corriger (bloquant)

- **`app.js:1296` + `1300`** : **le lecteur d'écran annonce « Les temps synchronisés de l'ancien ID seront supprimés » à chaque passage sur le champ ID, même à la création.**
  Un élément `hidden` désigné directement par `aria-describedby` est quand même inclus dans la description accessible (règle accname). Vérifié dans l'arbre d'accessibilité de Chromium, en mode création comme en mode édition avant toute modification. La description du champ vaut alors : « Le nombre dans l'adresse de ta page SwimRankings (ou l'adresse complète). ⚠️ Les temps synchronisés de l'ancien ID seront supprimés. »
  Scénario : un nouvel utilisateur de VoiceOver arrive sur le champ ID et entend qu'on va supprimer des temps qu'il n'a pas. Même chose pour un utilisateur qui modifie seulement son club.
  ```javascript
  // Problème (app.js:1296, 1300)
  aria-describedby="profile-swimrankingsId-hint profile-swimrankingsId-error profile-swimrankingsId-warning">
  ...
  <div class="field-warning" id="profile-swimrankingsId-warning" hidden>⚠️ Les temps synchronisés de l'ancien ID seront supprimés.</div>

  // Suggestion : ne créer l'avertissement qu'en édition, et ne le désigner que lorsqu'il est visible (dans onEdit)
  const warning = document.getElementById('profile-swimrankingsId-warning');
  const input = form.elements.namedItem('swimrankingsId');
  const idChanged = !!newId && newId !== profile.swimrankingsId;
  warning.hidden = !idChanged;
  input.setAttribute('aria-describedby', [
      'profile-swimrankingsId-hint', 'profile-swimrankingsId-error',
      idChanged ? 'profile-swimrankingsId-warning' : ''
  ].filter(Boolean).join(' '));
  ```
  (Les `.field-error` masqués ne posent pas ce problème, car leur texte est vidé quand ils sont masqués, `app.js:1494`.)

- **`app.js:284`** : **reprise v1 : le nom est pré-rempli au format SwimRankings « NOM, Prénom », et les initiales sont inversées.**
  Le profil v1 est l'objet nageur de `swimmers-data.json` (`localStorage.setItem('swimmer_profile', JSON.stringify(swimmer))` dans HEAD). Or ses 8 nageurs ont tous un `fullName` de la forme `"HEHLEN, Ava"` ou `"PENNEL, Alice Mei"`, avec `firstName` et `lastName` renseignés à côté. Le code privilégie `fullName`.
  Scénario testé (`t1.py`, T6) : avec le vrai profil v1 d'Ava, le formulaire affiche « HEHLEN, Ava ». Après « Enregistrer », l'avatar affiche **« HA »** au lieu de « AH » (CA2 d'US-004), et le nom reste en majuscules et inversé dans les Paramètres et la popup. Ce cas touche **tous** les utilisateurs v1, donc la population ciblée par US-008.
  ```javascript
  // Problème
  name: text(legacy.fullName) || [text(legacy.firstName), text(legacy.lastName)].filter(Boolean).join(' '),

  // Suggestion : « Prénom Nom » d'abord ; fullName seulement en secours, remis dans l'ordre s'il contient une virgule
  const fromParts = [text(legacy.firstName), text(legacy.lastName)].filter(Boolean).join(' ');
  const fromFull = text(legacy.fullName).split(',').map(s => s.trim()).reverse().join(' ').trim();
  name: fromParts || fromFull,
  ```
  Option : passer le nom de famille en casse de titre (« Hehlen »). Ce n'est pas indispensable, car l'utilisateur relit le formulaire.

---

### 💡 Suggestions (non bloquant)

**Correction / robustesse**

- **`app.js:570-579` et `433-436`** : après la suppression, le DOM masqué contient encore les données supprimées. Vérifié : `#settings-screen` contient toujours le nom, le club et l'ID ; `#pb-time`, `#times-table` et `#progress-content` contiennent les temps de l'ancien nageur, car `refreshDataViews()` s'arrête sans profil. Rien n'est visible, mais c'est contraire à l'esprit de « Données supprimées de cet appareil », et un futur thème ou une erreur de CSS les réafficherait. Appeler `renderSettingsScreen()` dans `confirmDeleteData()` : sa branche `if (!profile)` est aujourd'hui du **code mort**, car `openSettings()` garde déjà le cas sans profil. Vider aussi `#pb-time`, `#times-table`, `#progress-content` et `#swimmer-popup-content`.
- **`app.js:1474-1476`** : Échap en édition ne filtre ni `e.repeat` ni `e.isComposing`. Testé : un appui long (keydown puis keydown avec `repeat`) annule l'édition **puis** ferme les Paramètres, et l'utilisateur se retrouve sur l'onglet. Avec un IME (saisie japonaise ou chinoise), Échap sert à annuler la composition et ferait perdre toute l'édition. Suggestion : `if (e.key !== 'Escape' || e.repeat || e.isComposing) return;`. Appliquer la même règle à `closeSettingsOnEscape` (`app.js:524`).
- **`app.js:295-300`** : `saveProfile(profile)` relit le stockage pour retrouver `createdAt` (`getStoredProfileDraft()?.createdAt`).
  - Le repli `profile.createdAt` n'est jamais utilisé : `handleProfileSubmit` construit `newProfile` sans `createdAt`.
  - Si le profil stocké n'a ni nom, ni ID, ni genre, `getStoredProfileDraft()` renvoie `null` et `createdAt` est perdu.
  - Le paramètre `profile` masque la variable globale du même nom.
  
  Plus simple et plus prévisible : `saveProfile(data, createdAt)`, avec `createdAt = profile?.createdAt ?? invalidDraft?.createdAt` calculé par l'appelant, et un paramètre renommé `data`.
- **`app.js:285`** : `readStorage(LEGACY_KEYS.athleteId)` applique `JSON.parse` à une valeur que la v1 stockait brute (`setItem('athlete_id', athleteId)`). Cela marche pour `"5332548"`, mais un ID à zéro initial ou non numérique déclenche une exception, un `console.warn` et la perte de la valeur. Le repli n'est utilisé que si `legacy.id` manque. Lire cette clé avec `localStorage.getItem` dans un try/catch.
- **`app.js:1256`** : `isEdit = mode === 'edit' && profile` vaut l'objet profil et non un booléen. Sans conséquence aujourd'hui, mais trompeur. Écrire `mode === 'edit' && !!profile`.
- **`app.js:748-749`** : `updateTimesDisplay()` appelle encore `updateHeaderAvatar()` (« demande #5 »). C'est inutile depuis que `showApp()` et `confirmDeleteData()` le font : à retirer avec son commentaire périmé.

**Accessibilité**

- **`app.js:1469-1472`** : après « Annuler », ← ou Échap en édition, le focus va sur ← Retour des Paramètres (`openSettings()`), et non sur « Modifier le profil », le bouton qui a ouvert l'édition. Le motif habituel est de rendre le focus au déclencheur. Suggestion : `openSettings({ focus: 'edit' })` ou un `id` sur ce bouton. Après un enregistrement, ← Retour reste un choix acceptable.
- **`app.js:1276-1282` et `1424-1437`** : le bandeau « 👋 On a retrouvé ton profil » (et le bandeau de profil invalide) est inséré **avec** son contenu dans un `role="status"`. Les lecteurs d'écran n'annoncent en général que les changements d'une région live déjà présente. Quand le brouillon est entièrement valide, le focus n'est pas déplacé non plus (vérifié : `activeElement` = `body` en T6 et T12). Suggestion : comme en édition, placer le focus sur `#setup-heading` quand aucun champ n'est en erreur, et rattacher le bandeau au titre (`aria-describedby="profile-notice"`) ou le remplir après le rendu.
- **`app.js:1314-1317`** : `<fieldset>`/`<legend>` **et** `role="radiogroup"` avec `aria-labelledby` sur la même légende : certains lecteurs annoncent « Genre, groupe » puis « Genre, groupe de boutons radio ». C'est voulu pour `aria-required` et `aria-describedby` (1re review) ; alternative : retirer `aria-labelledby` du `div` ou remplacer le `fieldset` par un `div`. Mineur.

**Qualité / conventions**

- **Duplication, focus sur le premier champ invalide** : `app.js:1433-1436` et `1528-1535` (même ternaire `gender ? input[name="gender"] : namedItem(key)`). Extraire `focusFirstInvalid(form, keys, { scroll })`, qui sert aussi à valider tous les champs (`Object.keys(PROFILE_VALIDATORS).filter(key => !validateProfileField(form, key))`, répété en `1427` et `1527`).
- **Duplication, conversion du genre v1** : `app.js:268` et `282` (`Object.keys(GENDER_TO_APP).find(...)`). Ajouter un `GENDER_FROM_APP = { Female: 'F', Male: 'M' }` à côté de `GENDER_TO_APP`. De même, la normalisation texte de `app.js:265` et `281` peut être une seule fonction `toText()`.
- **États d'écran dispersés** : `body` change de classe (`setup-active`, `settings-active`), `aria-pressed` et écouteurs Échap dans 4 fonctions : `openSettings`/`closeSettings` (`499-522`), fin de `renderProfileForm` (`1416-1422`) et `showApp` (`1614-1624`). Le comportement est correct aujourd'hui (vérifié), mais chaque nouvel écran (sync en Phase 2) devra penser à tout retirer. Une fonction `setScreen('setup' | 'settings' | 'tabs')` qui pose les classes, `aria-pressed` et le bon écouteur Échap rendrait la machine d'états explicite.
- **`app.js:1255-1440`** : `renderProfileForm` fait environ 185 lignes et 6 choses : choix du brouillon, gabarit, pré-remplissage, état « modifié » de l'édition, validation au blur et au pointeur, changement d'écran et focus. Découper en `getProfileFormHtml(isEdit, notice)`, `fillProfileForm(form, initial)`, `bindProfileValidation(form)` et `bindEditState(form)`, sur le modèle de `bindSwimrankingsIdField`, déjà extraite.
- **Constantes** : `600` (`app.js:1568`, durée de « ✓ C'est parti ! » fixée par l'UX), `3000` (`app.js:1465`), `10` (`app.js:632`) et `1920` (`app.js:228`) gagneraient à être nommées, comme `FETCH_TIMEOUT_MS`. La limite de 10 chiffres apparaît dans la regex et dans le message (`app.js:222`) : une constante `MAX_ID_DIGITS` éviterait qu'ils divergent.
- **CSS mort** (`index.html`) : `.help-box h4` (72, plus aucun `h4`), `.swimmer-info-*` (77-81), `.comp-name` (94), `.diff-pending` (106), `.objective-*` et `.progress-bar*` (122-130), aucun n'étant utilisé dans `app.js` ni `index.html`. La plupart sont antérieurs, mais le diff a retouché l'opacité de `.objective-current`, `.objective-fina` et `.objective-target` (contraste) : autant les supprimer. Règles en double : `.times-table th:nth-child(2/3)` (90 et 109) et `td:nth-child(2)` (92 et 110). `.setup-intro p{opacity:1}` (180) ne fait rien.
- **`renderSoonButton`** (`app.js:422-429`) : toujours utilisé (2 appels, `462-463`), à garder jusqu'aux Phases 2 et 4.
- **`GUIDE-INSTALLATION.md:37-38`** (lignes non modifiées, mais voisines de la seule ligne changée) : « Hors connexion : L'app fonctionne même sans internet » est faux (aucun service worker, et sans réseau l'app affiche « Impossible de charger les temps »). « Synchronisées automatiquement chaque jour » est faux aussi (workflows désactivés, cf. `CLAUDE.md`). À corriger dans le même passage.

---

### 🔒 Sécurité

- Tous les `innerHTML` du diff ont été relus :
  - données du profil : nom, club, ID, année et initiales passent par `escapeHtml`, `.value` ou `textContent` ;
  - données du JSON externe : `timeDisplay`, `stroke`, `distance`, `nation`, libellé de saison et `eventName` sont échappés ; `lastUpdated` passe par `textContent` ; `timeMs` n'est utilisé que dans des calculs (au pire `NaN`) ;
  - messages d'erreur : `err.message` est échappé dans les deux `.error-box` (`app.js:565`, `1552`) ;
  - le reste est constant (messages d'état, drapeaux, `getDataStateMessage()`) ou vient de `temps-limites.json`, servi par l'app elle-même.
  
  **Aucun XSS trouvé.**
- Les `onclick` et `onkeydown` inline ajoutés (`openDeleteDialog()`, `closeDeleteDialog()`, `confirmDeleteData()`, `trapDeleteDialogFocus(event)`, `renderProfileForm('edit')`) n'utilisent que des constantes. La remarque CSP de la 1re review reste valable, sans urgence.
- Lien externe (`app.js:1305`) : `target="_blank" rel="noopener"`, correct. On peut ajouter `noreferrer` pour ne pas transmettre l'URL de l'app à swimrankings.net, mais ce n'est pas nécessaire.
- La suppression ne touche que les clés SwimTimes v2 et v1 (vérifié : `localStorage` est vide après suppression, et les autres clés sont conservées par construction). Voir plus haut le DOM résiduel après suppression (confidentialité, non bloquant).

---

### Couverture des critères d'acceptation

| US | Statut | Remarque |
|----|--------|----------|
| US-003 | ✅ | Couvert. L'extraction se fait aussi à la frappe, pas seulement au collage (mieux). |
| US-006 | ✅ | Couvert, avec les compléments UX et QA. Point a11y bloquant sur l'avertissement d'ID. |
| US-007 | ✅ | Couvert. Confirmation `<dialog>`, focus piégé, erreur de stockage gérée. DOM résiduel (non bloquant). |
| US-008 | ⚠️ | Critères couverts sur la forme, mais le nom repris est « NOM, Prénom » pour tous les profils v1 réels, ce qui inverse les initiales (bloquant). |
| US-009 | ✅ | États chargement / aucune donnée / erreur, délai de 8 s, `TODO Phase 3` présent. |

---

### Verdict
- [ ] ✅ Approved
- [x] 🔧 Changes requested
- [ ] 💬 Comment only

Deux points bloquants, chacun corrigé en quelques lignes :
1. l'avertissement de changement d'ID est annoncé en permanence par les lecteurs d'écran (`app.js:1296`) ;
2. la reprise v1 pré-remplit « NOM, Prénom » et inverse les initiales de tous les utilisateurs v1 (`app.js:284`).

Le reste de la machine d'états (jeton de chargement, écouteurs Échap, confirmation, bouton Enregistrer) est correct et a été vérifié par des tests. Les suggestions de factorisation (`setScreen`, découpage de `renderProfileForm`) sont à faire avant la Phase 2, qui ajoutera des écrans et des états.
