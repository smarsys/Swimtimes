## Review : Phase 1 – US-001, US-002, US-004, US-005 (`git diff HEAD -- app.js index.html`)

> **Suivi (2026-10-01)** : le point bloquant (course au chargement initial) est corrigé avec un jeton de chargement ; la fin d'un chargement ne change plus d'écran. Les points non bloquants sont corrigés, sauf : Échap et bouton ← en édition (reportés à US-006), styles inline des onglets Temps et Progression (code antérieur), `.help-box` conservé pour US-003. Les logs volontaires restent.

Périmètre relu : `app.js` (1327 lignes) et `index.html` (253 lignes) dans leur état actuel, comparés à HEAD (`c5145cd`).
Référentiels : `USER-STORIES-PHASE-1.md` (critères + sections « Avancement »), `UX-ECRAN-CONFIGURATION.md`, `SPECS-V2.md`, `CLAUDE.md`.
Hors review (reporté explicitement) : US-003, US-006 complète (bouton désactivé tant que rien ne change, toast, avertissement changement d'ID), US-007, US-008, US-009, Phases 2 à 4.

Vérifications faites : `node --check app.js` OK ; recherche des références à l'ancien flux (`swimmer_profile`, `athlete_id`, `loadSwimmerSelector`, `handleSwimmerSelect`, `renderProfileTab`, `refreshProfile`, `tab-profile`) : plus aucune dans `app.js` ni `index.html`.

---

### ✅ Points positifs

- **Stockage (US-001)** propre : `readStorage()` / `getProfile()` / `saveProfile()` / `clearAllData()` encapsulent chaque accès à localStorage dans un try/catch ; un JSON corrompu ou un profil sans `name`/`swimrankingsId` renvoie `null` ; `createdAt` est figé, `updatedAt` mis à jour ; l'erreur d'écriture remonte un message affichable (`app.js:220-235`).
- **Sécurité du formulaire** : aucune valeur utilisateur n'est injectée dans le HTML du formulaire, le pré-remplissage passe par `.value` (`app.js:1144-1150`), conformément à la note UX. Dans les Paramètres et la popup, nom, club, ID, année et nation sont échappés via `escapeHtml()` (`app.js:344-368`, `470-490`). Le message d'erreur de stockage est échappé (`app.js:1269`). Les initiales passent par `textContent` (`app.js:450`).
- **Validation** fidèle à l'UX : au `blur` seulement si le champ a été touché, tout au clic sur Enregistrer, focus et défilement vers le premier champ en erreur, `aria-invalid` + `aria-describedby`, respect de `prefers-reduced-motion` (`app.js:1059-1072`, `1159-1184`, `1243-1254`). Le report de la validation pendant un clic (`pointerdown`/`pointerup`) évite le clic perdu par décalage de mise en page : bonne attention au détail.
- **Anti double-envoi** via `profileFormBusy` + bouton désactivé (`app.js:1236`, `1256-1257`).
- **Listeners de document** nommés (`closeSettingsOnEscape`, `closePopupOnClickOutside`, `closePopupOnEscape`) : `addEventListener` déduplique les ajouts répétés, et chaque fermeture les retire. Pas d'accumulation après plusieurs ouvertures.
- **Interaction Échap** bien pensée entre popup et Paramètres : la popup se ferme d'abord, l'écran ensuite (`app.js:420-424`).
- **Header (US-004)** : vrais `<button type="button">`, `aria-label`, cibles de 44×44 px, `focus-visible`, 🔄 en `aria-disabled` avec tooltip + toast, titre masqué sous 340 px. Zoom réactivé dans le `viewport` (WCAG 1.4.4), `.form-hint` passé à `.75`.
- **Ancien flux supprimé proprement** : sélecteur multi-nageurs, `refreshProfile`, `clearProfile`, onglet Profil et ses styles `.profile-stats*` retirés, sans référence orpheline.
- Commentaires des nouveaux blocs en français, nommage camelCase, `const`/`let` partout, pas d'`eval`.

---

### 🔧 À corriger (bloquant)

- **`app.js:1315-1327` (+ `395-396`, `1303-1305`)** : **course à l'initialisation quand un profil existe**. Pendant que `DOMContentLoaded` attend `appReady` puis `loadSwimmerForProfile()` (fetch de `swimmers-data.json` et `swimmers-season.json` sur `raw.githubusercontent.com`, plusieurs secondes en 4G), le bouton ⚙️ est déjà visible et actif (`.header-actions` n'est masqué que par `.setup-active`, et `openSettings()` ne vérifie que `profile`, déjà chargé de façon synchrone).
  Scénario qui casse : ouvrir l'app sur mobile → cliquer ⚙️ → « Modifier le profil » → commencer à taper. À la fin du chargement initial, `showApp()` vide `#setup-screen` et retire `setup-active` : **le formulaire en cours d'édition disparaît et la saisie est perdue**, l'utilisateur se retrouve sur l'onglet Temps.
  Variante : si l'utilisateur a le temps d'enregistrer un nouvel ID avant la fin du chargement initial, le premier `loadSwimmerForProfile()` (ancien ID) peut se résoudre **après** le second et réécrire `swimmer` avec les temps de l'ancien ID.
  ```javascript
  // Problème (app.js:1323-1326)
  if (profile) {
      await loadSwimmerForProfile();
      showApp();               // écrase le formulaire d'édition ouvert entre-temps
  }

  // Suggestion 1 : ignorer les résultats périmés dans loadSwimmerForProfile
  let swimmerLoadId = 0;
  async function loadSwimmerForProfile() {
      const loadId = ++swimmerLoadId;
      const id = profile?.swimrankingsId;
      let data = null;
      if (id) {
          try { data = await fetchSwimmerData(id); } catch (err) { /* aucune donnée */ }
      }
      if (loadId !== swimmerLoadId) return false; // un chargement plus récent a eu lieu
      swimmer = data ? { ...data, gender: GENDER_TO_APP[profile.gender] } : null;
      return true;
  }

  // Suggestion 2 : ne pas quitter un écran ouvert par l'utilisateur
  if (profile) {
      updateHeaderAvatar(); // avatar visible tout de suite
      const isCurrent = await loadSwimmerForProfile();
      if (isCurrent && !document.body.classList.contains('setup-active')) showApp();
  }
  ```
  Alternative plus simple : garder ⚙️ et l'avatar inactifs (classe `app-loading` sur `body`) tant que le chargement initial n'est pas terminé.

---

### 💡 Suggestions (non bloquant)

**Correction / robustesse**

- **`app.js:1296` et `297-299`** : mutation du cache. `fetchSwimmerData()` renvoie l'objet de `swimmersData.swimmers[id]` et y écrit `seasonBests` ; `loadSwimmerForProfile()` y écrit en plus `gender`. Sans effet visible aujourd'hui (le genre est réécrit à chaque chargement), mais le cache ne reflète plus le JSON et tout futur consommateur (comparaison entre nageurs, backlog) lira un genre issu du profil. Retourner une copie : `return { ...swimmerData, seasonBests: ... }` et `swimmer = { ...data, gender }` (voir suggestion ci-dessus).
- **`app.js:212-216`** : `getProfile()` accepte un profil partiel ou invalide tant que `name` et `swimrankingsId` sont présents (ex. `gender: "Female"` d'un ancien format, `name: "   "`, ID non numérique). Conséquences : genre par défaut `Female` silencieux dans `showApp()` (`app.js:1306`) et `updateProgressDisplay()` (`app.js:737`), donc **temps limites potentiellement faux sans avertissement** ; avatar « ? ». Suggestion : réutiliser `PROFILE_VALIDATORS` dans `getProfile()` (sur `String(value).trim()`) et renvoyer `null` (ou ouvrir le formulaire en mode édition pré-rempli) si un champ requis est invalide.
- **`app.js:497-500`** : l'ajout de `closePopupOnClickOutside` est différé de 10 ms. Un double-clic rapide sur l'avatar (ouvrir puis fermer en moins de 10 ms, ou `hideSwimmerPopup()` appelé par `openSettings()` juste après) laisse le listener attaché alors que la popup est fermée. Inoffensif (il ne fait que rappeler `hideSwimmerPopup`), mais c'est une fuite. Mémoriser le timer et faire `clearTimeout` dans `hideSwimmerPopup()`, ou ajouter le listener sans délai en ignorant l'événement d'ouverture (`e.target === avatar`).
- **`app.js:1170-1174`** : à chaque rendu du formulaire, `flushPending` (nouvelle closure) est attaché au `document` pour `pointerup` **et** `pointercancel` avec `once` ; seul l'un des deux se déclenche, l'autre reste attaché et retient le formulaire détaché après `showApp()`. Fuite minime ; la retirer dans `flushPending` (`document.removeEventListener('pointercancel', flushPending)` et inversement).
- **`app.js:1185-1188` / `1139`** : en mode édition, `.setup-active` masque tout le header (⚙️, avatar) et Échap n'a pas d'effet : la seule sortie est « Annuler » en bas du formulaire. Le wireframe UX prévoit un bouton retour ← en tête ; à prévoir avec la fin d'US-006 (réutiliser `.screen-header` / `.btn-back` des Paramètres) et brancher Échap sur Annuler.
- **`app.js:1323-1325`** : `loadTimeStandards()` (local) et `loadSwimmerForProfile()` (réseau) sont enchaînés alors qu'ils sont indépendants ; `Promise.all([appReady, loadSwimmerForProfile()])` raccourcit le chargement initial (et la fenêtre de la course ci-dessus).

**Sécurité (défense en profondeur, données externes)**

- **`app.js:436-437`** (`renderPBsByPool`, désormais affiché dans les Paramètres) : `pb.timeDisplay` et `pb.stroke` viennent du JSON scrapé et sont injectés sans échappement. **`app.js:487`** : idem pour `getSeasonLabel()` dans la popup. Le JSON est servi par le dépôt du club (confiance raisonnable) et ce motif préexiste dans `updateTimesDisplay`/`updateProgressDisplay`, mais puisque la Phase 2 alimentera ces données depuis du HTML parsé côté client, autant prendre l'habitude d'échapper (`escapeHtml(pb.timeDisplay)`, etc.).

**Accessibilité**

- **`app.js:372` → `1084`** : après « Modifier le profil », le bouton cliqué est détruit et le focus retombe sur `body`. Idem après « ✓ C'est parti ! » (`app.js:1282`, le formulaire est vidé). Placer le focus sur le titre du formulaire (`tabindex="-1"`) ou le premier champ, et sur le contenu de l'onglet Temps après création.
- **`index.html:212` / `app.js:493`** : la popup a `role="dialog"` mais le focus n'y entre pas à l'ouverture ; un utilisateur clavier doit tabuler à travers toute la page pour l'atteindre. Déplacer le focus sur le bouton Fermer à l'ouverture (le retour sur l'avatar à Échap est déjà fait).
- **`app.js:1114-1121`** : `aria-describedby` sur un `<fieldset>` est mal restitué par plusieurs lecteurs d'écran, et le caractère requis du genre n'est exposé qu'au visuel (`*`). Ajouter `role="radiogroup" aria-required="true" aria-describedby="profile-gender-error"` sur `#profile-gender`.

**Qualité / conventions**

- **`app.js:1083`** : commentaire périmé, « 'edit' depuis l'onglet Profil » → « depuis les Paramètres ».
- **`app.js:1015-1022`** : la bannière `INIT` est vide et suivie d'une autre bannière ; l'initialisation réelle est en fin de fichier (`app.js:1315`), sous « CONFIGURATION DU PROFIL ». Déplacer la bannière `INIT` juste avant le `DOMContentLoaded`.
- **`app.js:1050-1057`** : l'état global `profile`, `appReady`, `profileFormBusy` et `NO_DATA_MESSAGE` sont déclarés après les fonctions qui les utilisent (`renderSettingsScreen`, `updateTimesDisplay`, etc.). Pas de bug (appel après évaluation du script), mais lisibilité : regrouper avec `swimmer`, `swimmersData`… en tête de fichier (`app.js:6-11`).
- **`app.js:304`** : le message « Ajoutez cet ID dans athletes.txt et relancez le workflow GitHub » n'est plus affiché nulle part (seul un `console.log` générique en `app.js:1298`). Le simplifier ou le supprimer ; garder le `// TODO Phase 3` comme repère.
- **`app.js:356-392`** : nombreux styles inline dans `renderSettingsScreen()` alors que des classes ont été créées pour le reste de l'écran (`.settings-row`, `.card-title`). Cohérent avec le style historique du fichier, mais des classes (`.settings-profile`, `.settings-profile-name`…) faciliteraient le thème sombre du backlog.
- **`index.html` CSS** : `.help-box` (réservé à US-003, OK) et `.btn-icon` ne sont plus utilisés ; supprimer `.btn-icon`.
- **`app.js:1054`** : « Clique sur 🔄 » (tutoiement de l'UX) diffère du texte littéral de la spec 6.2 et du critère d'US-002 (« Cliquez »). Choix cohérent avec le reste de l'interface : mettre à jour la spec plutôt que le code, pour que la QA ne le signale pas.
- **Logs** : `console.warn` / `console.error` / `console.log` ajoutés (`app.js:206`, `231`, `242`, `1298`). Ils sont volontaires et alignés sur le style existant (emoji + message) : pas un oubli, mais à garder en tête si une politique « pas de console.log » est appliquée (checklist reviewer).
- **Doc** : `.claude/agents/reviewer.md` exige une « Indentation cohérente (2 spaces) », alors que tout `app.js` (et le nouveau code) est en **4 espaces**. Le nouveau code est cohérent avec l'existant ; c'est la checklist qu'il faut corriger (« 4 espaces »), pas le code.

---

### 🔒 Sécurité

- Données saisies par l'utilisateur (nom, club, ID, année) : **toutes échappées** ou passées par `.value` / `textContent`. Pas d'attribut `value="${...}"`, pas d'`onclick` inline construit à partir de données. Aucun XSS trouvé depuis le profil, y compris un profil modifié à la main dans localStorage (l'âge passe par `Number()`, l'année est échappée).
- Les `onclick` inline ajoutés (`openSettings()`, `closeSettings()`, `renderProfileForm('edit')`, `showToast('Bientôt disponible')`) n'utilisent que des constantes. Ils empêcheraient une future CSP stricte (`script-src` sans `'unsafe-inline'`) : à garder en tête, pas urgent.
- Données externes (JSON) non échappées dans `renderPBsByPool` et `getSeasonLabel()` : voir suggestions. À traiter au plus tard en Phase 2, quand ces données viendront de HTML parsé côté client.
- Pas de donnée sensible stockée ; pas d'`eval` ni de `Function()`.

---

### Couverture des critères d'acceptation

| US | Statut | Remarque |
|----|--------|----------|
| US-001 | ✅ | Tous les critères couverts. |
| US-002 | ✅ | Couvert ; libellé 6.2 tutoyé (voir suggestions). |
| US-004 | ✅ | Couvert ; popup sans gestion du focus d'entrée (a11y). |
| US-005 | ✅ | Couvert (suppression et export « Bientôt », comme indiqué dans Avancement) ; mobile en plein écran. |

---

### Verdict
- [ ] ✅ Approved
- [x] 🔧 Changes requested
- [ ] 💬 Comment only

Un seul point bloquant : la course à l'initialisation (`app.js:1315-1327`), qui peut faire perdre une saisie en mode édition et afficher les temps d'un ancien ID. Le correctif est local (jeton de chargement + garde avant `showApp()`, ou ⚙️ inactif pendant le chargement). Les autres points peuvent être traités maintenant ou avec US-006 / US-007.
