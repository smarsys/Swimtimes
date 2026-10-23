## Review : Phase 2 (+ Phase 3) – US-010 à US-018 (`git diff HEAD -- app.js index.html` + `tests/`)

> **Suivi (2026-10-23)** : bloquant 1 (anonymisation) clos par décision du product owner : les échantillons restent tels quels. Bloquant 2 corrigé : une ligne illisible fait refuser l'import (`unrecognized`). Non bloquants corrigés : copie incomplète (début ou fin), `</html>` non final accepté, Cloudflare seulement sans tableau, temps stockés illisibles, date vide, ID stocké avec les temps, code collé effacé, minuteur du ✓, Progression avec la saison seule, accessibilité (focus sur le titre, message réécrit, état de la liste en texte, « Autre appareil »), code mort, duplications, spec §2.1, tests (fuseau horaire, imports datés du jour, oracle indépendant des qualifications, cas d'erreur ajoutés). Restent : `app.js?v=` à changer au déploiement ; `swimmers-data.json` encore utilisé par les tests de la reprise v1 et par `check_anonymisation.py` (question ouverte 5).


Périmètre relu : `app.js` (2190 lignes) et `index.html` (318 lignes) dans leur état actuel, comparés à HEAD (`f6f6d84`). Tests ajoutés ou migrés dans `tests/` (`helpers.py`, `test_us011` à `test_us017_018`, `fixtures/`, tests de la Phase 1).
Référentiels : `USER-STORIES-PHASE-2.md` (critères, « Avancement », décisions), `SPECS-V2.md` §2-4, `tests/fixtures/swimrankings/README.md`, `CLAUDE.md`. J'ai aussi lu `REVIEW-PHASE-1.md` et `REVIEW-PHASE-1-PARTIE-2.md` avec leurs notes de suivi, pour ne pas revenir sur ce qui y est tranché : logs volontaires, `onclick` inline à constantes, tutoiement, `setScreen()` reporté.
Hors review (explicitement hors périmètre) : export / import JSON, transfert entre appareils, multilingue, suppression des fichiers du club (question ouverte 5).

Vérifications faites :
- `node --check app.js` : OK. Indentation à 4 espaces partout (vérifié par script). Un seul `console.log`, préexistant.
- Suite complète `PYTHON=~/swimscraper/bin/python tests/run_all.sh` : **tout passe** (15 scripts, dont 44 + 63 + 30 + 21 vérifications pour la Phase 2, et les deux audits de contraste).
- Scripts Playwright de review (`scratchpad/review-p2/t1.py` à `t3.py`) :
  - analyse de copies tronquées à 5-90 % des 4 pages nageur ;
  - commentaire après `</html>` ;
  - script Turnstile dans une page nageur ;
  - lignes non reconnues sur une page de saison ;
  - localStorage corrompu au démarrage ;
  - DOM résiduel après « Supprimer mes données » ;
  - saison importée seule, puis onglet Progression ;
  - même erreur deux fois de suite ;
  - arbre d'accessibilité (CDP) de la fenêtre ;
  - deux synchronisations à moins de 2 s d'intervalle.
- `test_us015_016_etat_aide.py` relancé avec `TZ=Pacific/Auckland` : **échec** (voir Tests).

---

### ✅ Points positifs

- **Analyse isolée et sûre.**
  - `parseSwimRankingsPage()` (`app.js:483-565`) est une fonction pure, sans accès au DOM de l'app ni à localStorage, avec des erreurs typées.
  - `DOMParser` produit un document inerte : ni script ni `onerror` exécuté, aucune image chargée. Vérifié par les tests, avec `<img onerror>` et `<script>` injectés.
  - Le nom est remis au format « Prénom Nom » par la même fonction que la reprise v1 (`toFirstLastName`, factorisée).
- **Contrôles de l'import solides** (`app.js:1031-1072`) :
  - ID comparé en nombre ;
  - saison passée refusée, avec un lien vers la bonne saison ;
  - page de meilleurs temps vide refusée, saison vide acceptée (décision documentée) ;
  - erreur de stockage affichée avec le message commun `STORAGE_WRITE_ERROR` ;
  - texte conservé et focus sur la zone après une erreur ;
  - zone vidée après un succès, et le HTML n'est jamais stocké (testé).
- **Retrait du chargement réseau propre** :
  - plus de `fetchSwimmerData`, de `swimmerDataStatus`, de jeton de chargement, de `TODO Phase 3` ni de `raw.githubusercontent.com` ;
  - `refreshDataViews()` reste le point unique de mise à jour après un import ;
  - l'initialisation est synchrone pour les temps, donc la course de la 1re review de Phase 1 disparaît par construction.
- **Saison passée** : `loadSwimmerFromStorage()` compare le libellé stocké à la saison en cours (`app.js:454`). Le 1er septembre, les temps de la saison précédente disparaissent du « Saison » sans être supprimés. Testé, popup comprise.
- **Fenêtres modales** :
  - `isAnyDialogOpen()` remplace le cas particulier de la confirmation dans `closeSettingsOnEscape` et `cancelProfileEditOnEscape` ;
  - Échap ne ferme que la fenêtre de synchronisation, et le focus revient au déclencheur (🔄 ou « Synchroniser maintenant ») : vérifié ;
  - `openSyncDialog()` ferme la popup de l'avatar avant de s'ouvrir.
- **Sécurité de l'affichage** : tout ce qui vient d'un import et passe par `innerHTML` est échappé (`timeDisplay`, `stroke`, `nation`, `eventName`), ou bien numérique (`formatTime`, points FINA calculés). Les messages de la fenêtre passent par `textContent`, y compris le nom de l'autre nageur. Les liens n'utilisent que l'ID validé par `getProfile()`, avec `encodeURIComponent`.
- **Tests de bonne qualité dans l'ensemble** :
  - l'oracle de l'analyse est une extraction **indépendante** en Python (`HTMLParser`, `helpers.py:31-73`), et non une relecture de la sortie JS ;
  - la conversion `timeMs` est vérifiée avec un calcul Python séparé (`test_us017_018_affichage.py:102-110`) ;
  - chaque cas d'erreur vérifie le message, l'absence de modification du stockage, la conservation du texte et le focus ;
  - date figée, contrôle de l'anonymisation intégré à `run_all.sh`.
- **Accessibilité soignée** : `<dialog>` nommé par `aria-labelledby`, piège de focus générique `trapDialogFocus`, liens « (nouvel onglet) », badge annoncé par l'`aria-label` de 🔄, `aria-expanded`/`aria-controls` sur « Autre appareil ». Les éléments de la liste des pages importées ont un nom exposé (« Meilleurs temps : à importer », vérifié dans l'arbre CDP).

---

### 🔧 À corriger (bloquant)

- **`tests/fixtures/swimrankings/*.html` (non versionnés) : l'anonymisation laisse des identifiants qui renvoient directement aux vrais nageurs, des mineurs, dans un dépôt public.**
  Seuls les noms et les `athleteId` ont été remplacés. Les pages gardent les identifiants de résultats et de compétitions d'origine :
  - `nageur1-meilleurs-temps.html` : 45 `resultDetail&id=…` et 25 `meetId=…` ;
  - `nageur2-meilleurs-temps.html` : 45 `resultDetail` et 31 `meetId` ;
  - `nageur1-saison.html` : 12 `resultDetail` ;
  - `nageur3-peu-de-temps.html` : 2 `resultDetail`.

  Scénario : quelqu'un ouvre `https://www.swimrankings.net/index.php?page=resultDetail&id=<id du fichier>`. La page du résultat affiche le vrai nom du nageur, né en 2010 ou en 2013 d'après les pages. Même sans ces liens, l'année de naissance, le genre, les temps exacts, les dates et les compétitions suffisent pour retrouver la personne. Le critère d'US-010 (« IDs … remplacés par des IDs fictifs partout ») n'est respecté qu'à la lettre. `check_anonymisation.py` ne contrôle pas ces identifiants.
  Les fichiers ne sont pas encore commités : c'est le moment de corriger.
  ```python
  # Problème : check_anonymisation.py ne vérifie que athleteId=, les noms et les e-mails

  # Suggestion 1 (fixtures) : remplacer les identifiants de résultats et de compétitions par des valeurs fictives,
  # par ex. re.sub(r'(resultDetail&amp;id=)\d+', r'\g<1>1', html) et re.sub(r'(meetId=)\d+', r'\g<1>1', html)
  # Suggestion 2 (contrôle) : n'accepter aucun identifiant numérique réel dans les liens
  for key in ('resultDetail&amp;id', 'meetId', 'id'):
      for value in set(re.findall(rf'[?&;]{key}=(\d{{5,}})', text)):
          problems.append(f'{name} : identifiant non fictif {key}={value}')
  ```
  À trancher par le product owner : décaler aussi les temps et les dates, ou retirer l'année de naissance, si le risque de recoupement reste jugé trop élevé.

- **`app.js:539-565` + `1048-1054` : une page de saison dont les lignes ne sont pas reconnues remplace les temps de la saison par une liste vide, avec un message de succès.**
  `parseSwimRankingsTimes()` ignore sans rien signaler toute ligne qu'elle ne reconnaît pas : classe `tr` différente, nage inconnue, format de temps inattendu. Pour une page de saison, `importSwimRankingsHtml()` accepte une liste vide et l'enregistre.
  Scénario testé (`t2.py`) : 11 temps de saison sont déjà importés. SwimRankings change la classe de ses lignes (`athleteBest0` devient `row0`). L'import affiche « ✓ Aucun temps sur la saison 2026-2027 pour l'instant : c'est enregistré », et `swimtimes_season.data` passe de 11 temps à **0**.
  Variante : si une seule nage n'est pas reconnue (`Freestyle` écrit autrement), on obtient « ✓ 7 temps … importés » et 4 temps sont perdus sans avertissement.
  C'est exactement ce que le refus des copies tronquées veut éviter (« ne jamais remplacer des données complètes par des données partielles »). Le risque est réel : le README rappelle que les pages nageur dérivent d'une capture unique.
  ```javascript
  // Problème : les lignes rejetées ne sont pas comptées
  if (!eventMatch || !SWIMRANKINGS_STROKES.includes(eventMatch[2])) return;

  // Suggestion : compter les lignes de données (≥ 7 cellules, hors « Lap ») et refuser si l'une d'elles n'est pas reconnue
  const dataRows = [...table.querySelectorAll('tr')].filter(row =>
      row.querySelectorAll('td').length >= 7 && !row.textContent.includes('Lap'));
  const times = parseSwimRankingsTimes(table);
  if (times.length !== dataRows.length) return { ok: false, error: 'unrecognized' };
  // + message : « Certains temps de cette page ne sont pas reconnus : rien n'a été importé. Signale-le au club. »
  ```
  Au minimum, refuser quand `dataRows.length > 0 && times.length === 0`. La page de saison vide (`nageur2-saison.html`) n'a que la ligne d'en-tête `<th>` : elle reste acceptée.

---

### 💡 Suggestions (non bloquant)

**Correction / robustesse**

- **`app.js:502-504` : une copie tronquée avant le tableau donne « Ce code n'est pas celui d'une page nageur » au lieu de « Le code collé est incomplet ».**
  `not-athlete` est testé avant `truncated`. Mesuré (`t1.py`) : le message est faux pour toute coupure avant environ 14 % de la page de meilleurs temps, 30 % de `nageur1-saison`, 44 % de `nageur3` et 85 % de `nageur2-saison`. Le critère d'US-014 n'est donc tenu que si la coupure tombe après le tableau. Les tests (`test_us011`, coupures à 25-99 % de la page de meilleurs temps) ne couvrent que ce cas favorable.
  Suggestion : si le tableau ou l'ID manque, renvoyer `truncated` quand la source ressemble à une page SwimRankings sans `</html>` final (titre « Swimrankings », ou `athleteId=` présent) :
  ```javascript
  if (!table || !athleteId) {
      const looksLikeSwimRankings = /swimrankings/i.test(title) || /athleteId=\d/.test(source);
      return { ok: false, error: looksLikeSwimRankings && !/<\/html>\s*$/i.test(source) ? 'truncated' : 'not-athlete' };
  }
  ```
- **`app.js:504` : le test `</html>` final est strict.** Un commentaire ou un script ajouté après `</html>` (certains serveurs PHP ou CDN le font) ferait refuser **chaque** import comme « incomplet » (vérifié : `ref + '<!-- generated -->'` → `truncated`). Les échantillons finissent tous exactement par `</html>`, sans retour à la ligne, ce qui ressemble plus à un artefact de génération qu'à une copie de « code source ». À vérifier en priorité lors de la recette réelle prévue (US-010). Variante plus tolérante : `/<\/html>\s*(<!--[\s\S]*?-->\s*)*$/i`.
- **`app.js:493` : la détection Cloudflare passe avant la recherche du tableau.** Une vraie page nageur qui inclurait un jour un widget Turnstile (`challenges.cloudflare.com`, par ex. sur un formulaire de connexion de l'en-tête) serait refusée comme « vérification Cloudflare » (vérifié en injectant le script). La détection de la connexion est déjà conditionnée à `!table` : faire de même pour Cloudflare (`if (!table && (…))`).
- **`app.js:147-149`, `429-431` et `2181` : des temps stockés corrompus bloquent le démarrage.**
  `toDisplayTime()` appelle `timeToMs(stored.time)` sans vérifier le type. Avec `time: 27.8` (un nombre), on obtient `timeStr.replace is not a function`. L'exception est levée dans `DOMContentLoaded` **avant** `showApp()`.
  Vérifié (`t1.py`) : avatar vide, sélecteur de genre non initialisé, « — » dans l'onglet Temps, et aucun message.
  Ce cas ne se produit qu'après une modification manuelle ou un futur import JSON (Phase 4). La Phase 1 a pourtant posé la règle « stockage illisible = absent » (`getProfile`).
  Suggestion : `if (typeof stored?.time !== 'string' || typeof stored.stroke !== 'string' || !Number.isInteger(stored.distance)) return null;` dans `toDisplayTime()`.
  Même logique pour `getLastSyncDate()` (`app.js:463-468`) : `updated: null` donne `new Date(null)`, soit le 1er janvier 1970, d'où « il y a 20741 jours » et un badge (vérifié). Filtrer `typeof value === 'string'` avant `new Date(value)`.
- **`app.js:372-378` : les temps stockés ne portent pas l'ID du nageur.** La cohérence après un changement d'ID repose uniquement sur `clearSyncedTimes()`, qui avale ses erreurs (`console.warn`, `app.js:403-410`). Ajouter `athleteId` dans `swimtimes_pb` / `swimtimes_season` (spec §3.1), puis ignorer dans `loadSwimmerFromStorage()` des temps d'un autre ID : défense simple, utile aussi pour l'import et l'export de la Phase 4.
- **`app.js:828-842` + `937` : après « Supprimer mes données », la fenêtre de synchronisation garde l'ancien contenu.**
  `resetToFirstLaunch()` vide les écrans, mais pas `#sync-dialog-content`. Vérifié : les liens restent avec l'ancien ID et la zone de texte contient encore le code collé, soit 66 537 caractères d'une page d'un autre nageur (nom compris) après une erreur `wrong-athlete`.
  `openSyncDialog()` reprend ensuite ce texte pour le **nouveau** profil.
  C'est le même point de confidentialité que le « DOM résiduel » de la review Phase 1 partie 2, déjà corrigé ailleurs. Ajouter `document.getElementById('sync-dialog-content').innerHTML = ''` dans `resetToFirstLaunch()`. On peut aussi vider la zone après un changement d'ID.
- **`app.js:986-995` : le ✓ de 🔄 est écourté si on synchronise deux fois en moins de 2 s.** Le minuteur du premier ✓ remet 🔄 trop tôt : vérifié, le second ✓ ne dure que 0,5 s. Mémoriser le minuteur et faire `clearTimeout` (comme `toastTimer`).
- **`app.js:1404-1406` : saison importée seule → l'onglet Progression affiche « Aucune donnée. Clique sur 🔄 pour synchroniser. »** L'utilisateur vient pourtant de synchroniser (l'ordre des collages est libre, US-013). Vérifié (`t1.py`). Message plus juste quand `swimmer` existe sans meilleurs temps : « Importe aussi ta page de meilleurs temps pour voir ta progression. »
- **`index.html:316` : `app.js?v=20261001` n'a pas changé** alors que `app.js` est presque réécrit. Le commit `f6f6d84` prévoit de changer cette version à chaque déploiement. Sinon, un navigateur qui garde l'ancien `app.js` avec le nouvel `index.html` affiche la fenêtre vide, et 🔄 renvoie l'ancien toast. À changer au moment du déploiement (après la recette réelle).

**Accessibilité**

- **`app.js:975` : le focus initial va sur la zone de texte.**
  - Sur Android et iPhone, cela ouvre aussitôt le clavier, qui masque les étapes et les liens en plein écran. Or l'utilisateur doit d'abord **sortir** de l'app pour ouvrir sa page, et sur iPhone il ne peut même pas coller de code source.
  - Avec un lecteur d'écran, il entend le nom de la fenêtre puis « Code source de la page, zone de texte », et saute les instructions.
  - Suggestion : placer le focus sur le titre `#sync-title` (`tabindex="-1"`), ou sur le premier lien.
- **`app.js:964-965` et `1024-1035` : `#sync-message` est à la fois une région live et la description de la zone de texte.** Après une erreur, le focus revient sur la zone : le message est annoncé deux fois, comme région live puis comme description. À l'inverse, si la même erreur se répète (deux clics sur « Importer » avec la zone vide), le texte ne change pas et la région live peut rester muette (vérifié : texte identique). Garder l'un des deux mécanismes. Pour la répétition : vider le message puis le remplir au prochain cycle (`LIVE_REGION_DELAY_MS` existe déjà).
- **`index.html` (`.sync-checklist li::before{content:attr(data-state)}`) et `app.js:1020` : l'état « ✓ / ○ » repose sur un `aria-label` posé sur un `li`.** Chromium l'expose, mais VoiceOver et TalkBack ignorent souvent `aria-label` sur un élément non interactif, et liraient alors « cercle blanc, Meilleurs temps ». Plus robuste : un `<span class="sr-only">` avec « importé » ou « à importer », et `content: attr(data-state) / ""` (texte alternatif vide) ou un `aria-hidden` sur une icône en `span`.
- **`app.js:921-922` : le `onclick` inline de « Autre appareil » dépend de `this.nextElementSibling`.** Il casse si on insère un élément entre le bouton et la liste. `aria-controls` nomme déjà la cible. Brancher un écouteur après le rendu, avec `document.getElementById('sync-other-devices')`, comme `bindSwimrankingsIdField`.

**Code mort / qualité**

- **Code mort** :
  - `isConfirmDialogOpen()` (`app.js:738-740`) : plus aucun appel, remplacé par `isAnyDialogOpen()` ;
  - `trapConfirmDialogFocus()` (`app.js:792-806`) fait double emploi avec le nouveau `trapDialogFocus()` (`748-764`), qui gère déjà les boutons inactifs (`button:not([disabled])`) : brancher la confirmation sur `trapDialogFocus` ;
  - CSS sans usage : `.loading` et `@keyframes spin` (`index.html:128-129`), `.header-btn[aria-disabled=true]` (`index.html:31-32`), plus aucun bouton du header n'étant inactif ;
  - `handleSyncClick()` (`app.js:1213-1215`) ne fait qu'appeler `openSyncDialog()`.
  
  `renderSoonButton` reste utile (export, Phase 4).
- **Duplication** : `getSeasonLabelFromEndYear(getCurrentSeasonEndYear())` est réécrit en `app.js:864` et `935`, alors que `getCurrentSeasonLabel()` (`445`) existe. Les fonctions de saison sont réparties entre la section « TEMPS AFFICHÉS » (`445`) et la section « SYNCHRONISATION » (`868-875`) : les regrouper.
- **`app.js:982-983`** : `STALE_SYNC_DAYS` et `SYNC_SUCCESS_FLASH_MS` sont déclarées après leur premier usage (`644`). Pas de bug, car l'appel a lieu après l'évaluation du script, mais c'est la même remarque de lisibilité qu'en Phase 1. Les regrouper en tête de section.
- **`swimmers-data.json`** : l'app ne le charge plus du tout. La reprise v1 lit localStorage, pas ce fichier. Il n'est plus utilisé que par des tests : `test_qa2_corrections.py:12` (profil v1 réel) et `fixtures/check_anonymisation.py` (liste des vrais noms et IDs). À garder en tête pour la question 5 : supprimer ce fichier casserait le contrôle d'anonymisation, qui y prend sa liste de noms interdits.
- **`SPECS-V2.md:52`** : la spec annonce toujours « en cours (spinner) / … / erreur (✗ rouge 2s) » sur 🔄, alors qu'US-015 (Avancement) a décidé l'inverse. Mettre la spec à jour pour que la QA ne le signale pas.

**Tests**

- **Dépendance au fuseau horaire** :
  - `helpers.py:103` fixe la date à `'2026-10-15T10:00:00'` en heure **locale**. Avec `TZ=Pacific/Auckland` (UTC+13 en octobre), `test_us015_016_etat_aide.py` échoue : 13 jours au lieu de 14 depuis `2026-10-01T00:00:00Z` (vérifié).
  - Suggestion : `'2026-10-15T10:00:00Z'`, ou `timezone_id='Europe/Zurich'` dans `new_context()`. Le libellé « 1 oct. 2026, 02:00 » dépend aussi du fuseau.
- **Dépendance à la date réelle dans les tests migrés** :
  - `imported_storage()` (`helpers.py:85`) date l'import du 15/10/2026 et rattache la saison à la saison **réelle**, mais sans figer la date ;
  - depuis le 23/10/2026, ces pages affichent donc le badge « plus de 7 jours ». Aucun test ne casse, mais les captures et l'audit de contraste ne montrent plus le même état ;
  - suggestion : dater `updated` de `new Date()` côté page, ou utiliser `FIXED_DATE_SCRIPT` partout.
- **Oracle faible pour « mêmes résultats qu'avec les données du club »** (US-017) : `test_us017_018_affichage.py:76` vérifie seulement qu'il y a 3 cartes dans Progression. Ajouter au moins une épreuve dont le statut est connu, calculé en Python à partir de `temps-limites.json` : par exemple « ⏳ » ou « ✓ » sur une ligne de l'onglet Temps, et les nombres des 3 cartes.
- **Cas d'erreur non couverts** :
  - coupure avant le tableau ;
  - lignes non reconnues (voir le point bloquant) ;
  - temps corrompus en localStorage ;
  - stockage plein sur la page de **saison** ;
  - page d'un autre nageur pour une page de **saison** ;
  - commentaire après `</html>`.
- **Duplication** : `fixture()` est redéfinie dans `test_us011_analyse.py:23` et `test_us012_013_014_synchronisation.py:23`, alors que `helpers.py:57` la fournit. Le gabarit `new_page` (sessionStorage `init` + profil + temps) est copié dans 3 fichiers, et `check()` dans tous. Un `new_app_page(browser, profile, entries, **context)` dans `helpers.py` réduirait chaque fichier d'une vingtaine de lignes.
- **Piège de focus** (`test_us012_013_014_synchronisation.py:84-87`) : après 8 Tab, le test vérifie seulement que le focus est **dans** la fenêtre, pas qu'il boucle du dernier au premier élément, ni avec Maj+Tab. Ajouter une vérification explicite sur les deux bords.
- Les attentes fixes (`wait_for_timeout(2300)` pour le ✓ de 2 s) sont raisonnables. `wait_for_function` est déjà utilisé là où c'était possible.

---

### 🔒 Sécurité

- **HTML collé** : analysé par `DOMParser` (document inerte : aucun script, gestionnaire `on*`, image ni `meta refresh` exécuté ou chargé), jamais inséré dans la page, jamais stocké. Les regex appliquées à la source (`app.js:487`, `493`, `504`) sont linéaires : pas de risque de ReDoS sur un collage de plusieurs centaines de Ko.
- **`innerHTML` alimentés par des données importées** : tous relus.
  - `renderPBsByPool` : `distance`, `stroke`, `timeDisplay` échappés.
  - `updateTimesDisplay` : `timeDisplay` échappé, `formatTime` numérique.
  - `updateProgressDisplay` : `eventName` et `timeDisplay` échappés, points et écarts calculés.
  - `updateSettingsData` : `nation` échappée, drapeau constant.
  - `renderSwimmerPopupContent` : `meta` échappée.
  
  Un `stroke` ou une `nation` piégés dans localStorage ne s'injectent pas : c'est testé dans `test_qa1_corrections.py`. **Aucun XSS trouvé.**
- **Données du profil** dans la fenêtre : seul l'ID est utilisé, validé par `getProfile()` (chiffres uniquement), puis passé par `encodeURIComponent` dans `href`. Les libellés de saison et les instructions par appareil sont des constantes.
- **Messages d'erreur** : `textContent` (`showSyncMessage`), y compris le nom de l'autre nageur extrait de la page. Testé avec `<img onerror>` dans le nom.
- **`onclick` inline** : `this.nextElementSibling` (`app.js:922`) n'utilise aucune donnée. Il est fragile (voir Accessibilité) mais sans risque. La remarque CSP des reviews précédentes reste valable, sans urgence.
- **Liens externes** : `target="_blank" rel="noopener"`. Correct.
- **Confidentialité** :
  - échantillons insuffisamment anonymisés (bloquant) ;
  - après une suppression, le code collé d'une page nageur reste dans le DOM de la fenêtre de synchronisation (`resetToFirstLaunch`, non bloquant).

---

### Couverture des critères d'acceptation

| US | Statut | Remarque |
|----|--------|----------|
| US-010 | ⚠️ | Échantillons conformes sur la forme ; anonymisation incomplète (`resultDetail`, `meetId`) : **bloquant**. Date de capture et recette réelle encore ouvertes (déjà notées dans Avancement). |
| US-011 | ✅ | Couvert et testé contre un oracle indépendant. Fragilité : lignes non reconnues ignorées en silence (voir point bloquant). |
| US-012 | ✅ | Couvert. Focus initial sur la zone de texte discutable sur mobile (suggestion). |
| US-013 | ⚠️ | Couvert, sauf qu'une page de saison mal reconnue remplace les données existantes par une liste vide (**bloquant**). |
| US-014 | ⚠️ | Tous les messages existent ; « copie incomplète » n'est donné que si la coupure tombe après le tableau (suggestion prioritaire). |
| US-015 | ✅ | Couvert. ✓ écourté en cas de double synchronisation (mineur). |
| US-016 | ✅ | Couvert. |
| US-017 | ✅ | Couvert. Saison passée correctement écartée. Oracle « mêmes résultats » faible dans les tests. |
| US-018 | ✅ | Plus aucune requête réseau vers GitHub (testé). CSS `.loading` et `isConfirmDialogOpen` restent à retirer. |

---

### Verdict
- [ ] ✅ Approved
- [x] 🔧 Changes requested
- [ ] 💬 Comment only

Deux points bloquants, chacun corrigé en quelques lignes :
1. **Échantillons** : remplacer les identifiants `resultDetail` et `meetId` réels des pages (mineurs, dépôt public) avant le premier commit des fixtures, et étendre `check_anonymisation.py` à ces identifiants.
2. **Analyse** : ne jamais enregistrer une page dont des lignes de temps n'ont pas été reconnues. Aujourd'hui, une saison mal reconnue efface les temps existants avec un message de succès.

Le reste du code est solide : machine d'états des fenêtres, échappement, retrait du réseau, saison passée. Il est bien couvert par des tests qui passent tous. Avant la recette réelle, je recommande de traiter aussi :
- l'ordre `not-athlete` / `truncated` ;
- la tolérance après `</html>` ;
- la robustesse au localStorage corrompu ;
- la version de `app.js` dans `index.html`.
