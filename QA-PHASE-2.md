# QA – Phase 2 (US-010 à US-018) : synchronisation et affichage des temps importés

> **Suivi (2026-10-23)** : BUG-P2-01 à BUG-P2-04 corrigés et couverts par des tests automatiques. R-P2-02, R-P2-03, R-P2-04 traités. R-P2-05 (points FINA) : bases World Aquatics 2026 intégrées, les points calculés correspondent à SwimRankings à 1 point près sur les échantillons. R-P2-01 (`app.js?v=`) : au déploiement.


Date : 2026-10-23 · Rôle : QA (`.claude/agents/qa.md`) · Version testée : working tree de la branche `phase-2-synchronisation` (`app.js` 2190 lignes, `index.html` 318 lignes, non commités)
Outil : Playwright/Chromium et un serveur HTTP local. La date de la page est fixée par script (15 octobre 2026 par défaut, puis 31 août 2026, 31 août 2027 et 1er septembre 2027). Le collage est simulé de trois façons : `fill`, `keyboard.insert_text` (insertion au curseur) et un vrai Cmd+V depuis le presse-papiers. Le stockage plein est simulé en remplaçant `Storage.prototype.setItem`. Les appareils sont simulés par le user agent et `navigator.maxTouchPoints`.
Scripts, sorties et captures : `scratchpad/qa-p2/`. Fichiers : `t_parse.py`, `t_import.py`, `t_dup.py`, `t_retry_clipboard.py`, `t_display.py`, `t_dialog.py`, `t_season.py`, `t_secu.py`, `out_*.txt`, `shots/`. Ces scripts sont indépendants de ceux du développeur ; ils ne réutilisent que `start_server`, `fixture`, `fixture_times` et `imported_storage` de `tests/helpers.py`. Pour Temps et Progression, les valeurs attendues sont recalculées en Python à partir de `temps-limites.json`.

Les points déjà tranchés dans `QA-PHASE-1.md` et `QA-PHASE-1-PARTIE-2.md` (BUG-01 à BUG-19, R-01 à R-32) ne sont pas rapportés à nouveau. Ce qui est hors périmètre n'est pas signalé : export, multilingue, transfert entre appareils.

## Synthèse

**Verdict : ⚠️ VALIDÉ SOUS RÉSERVE. Le déploiement est conditionné à la correction de BUG-P2-01 et à la recette réelle d'US-010.**

Sur les 60 critères d'acceptation, 58 passent. Le critère « date de capture » d'US-010 est incomplet ; il était déjà signalé par le développeur. La « recette réelle » d'US-010 n'est pas testable ici : seul le product owner peut la valider. La suite automatique est entièrement verte (15 scripts, voir Non-régression).

Le test exploratoire a trouvé **1 bug majeur**. Après une erreur d'import, le texte collé reste dans la zone et le curseur est placé à la fin. Si l'utilisateur recolle sa page, comme le message le lui demande, le nouveau code **s'ajoute** à l'ancien. Selon la première erreur, on obtient alors :
- une erreur Cloudflare qui revient sans fin ;
- des **doublons** (47 meilleurs temps au lieu de 39) ;
- les **temps d'une autre nageuse** importés comme les siens.

Il a aussi trouvé **3 bugs mineurs** :
- Progression affiche « Aucune donnée » quand seule la saison est importée.
- Le code collé survit à « Supprimer mes données ».
- Sur petit écran, la fenêtre s'ouvre en faisant défiler l'écran au-delà du titre et des liens.

| Sévérité | Nombre |
|----------|--------|
| Bloquant | 0 |
| Majeur | 1 (BUG-P2-01) |
| Mineur | 3 (BUG-P2-02, BUG-P2-03, BUG-P2-04) |
| Écart à un CA | 1 (US-010 : date de capture absente du README, déjà connu) |

**Avant le déploiement** :
- corriger BUG-P2-01 ;
- faire la recette réelle (US-010), en vérifiant en particulier la fin du code copié (R-P2-02) ;
- changer la version de `app.js?v=` (R-P2-01).

Points solides vérifiés :
- **Analyse** : les variantes suivantes donnent les mêmes 39 temps que l'extraction Python : espaces et retours en tête ou en fin, fins de ligne CRLF, BOM et espace insécable final, page sans doctype (sérialisation `outerHTML`). Les cas suivants sont refusés avec le bon message : code HTML échappé, texte de la page, Cloudflare, connexion, page en français, saison passée ou future, copie coupée à la fin à 4 endroits différents. Les relais (`4 x 50m`) et `100m IM` sont ignorés, et les épreuves de 25 m sont conservées.
- **Affichage (US-017)** : la vérification est indépendante, en Python. Pour 2 nageurs et 2 genres, les **36 combinaisons épreuve × bassin** de l'onglet Temps ont été comparées : PB, temps de saison, points FINA, et pour chaque compétition le temps limite, 💪, la saison et le statut ✓ / ⏳ / écart. Résultat : **0 écart**. Les 3 compteurs de Progression sont identiques au calcul attendu dans les 6 cas (2 bassins × 3 profils).
- **Saisons** : le 1er septembre 2027, les temps 2026-2027 ne sont plus présentés comme ceux de la saison en cours. Les liens passent à `pbest=2028`, et la page 2027 est refusée avec un lien vers 2027-2028.
- **Changement d'ID / suppression** : les temps de l'ancien ID disparaissent. Les liens suivent le nouvel ID, et l'ancienne page est refusée (« celle de Swimmer One Test »). Après la suppression, aucune clé ne reste et le formulaire de création s'affiche.
- **Fenêtre** :
  - Le focus est piégé : Tab et Maj+Tab bouclent.
  - Échap ne ferme que la fenêtre (les Paramètres restent ouverts), et le focus revient au bouton d'origine.
  - Le texte non importé est conservé.
  - La fenêtre affiche ✓ pendant 2 s si au moins une page a été importée.
  - Le badge apparaît au-delà de 7 jours et disparaît après un import.
  - Les instructions correspondent à l'appareil : iPhone, iPad en mode bureau, Android, Mac, Windows et Linux.
- **Sécurité** : `<script>`, `onload`, `onerror`, `<svg>`, `<iframe>`, `<base>`, `<meta refresh>` et des noms, villes, compétitions ou nation piégés ne déclenchent aucune exécution ni aucune requête réseau. Le nom piégé s'affiche comme du texte.
- **US-018** : aucune requête vers GitHub ni vers `swimmers-*.json`, et aucune requête externe.
- **Performance** : une page de 30 Mo est analysée en 2 s ; une page de 10 Mo est collée et importée en moins de 2 s.
- **Contraste AA** : aucun échec dans les états non couverts par l'audit du développeur : « Autre appareil » déplié, checklist ✓, ✓ sur 🔄, bandeau iPhone.
- **Erreurs JS** : aucune dans l'ensemble des scénarios.

---

## Checklists de validation

### Validation US-010 : Échantillons de pages SwimRankings

#### Critères d'acceptation
- [x] CA1 : 2 nageurs (F 9999001, M 9999002), avec pour chacun la page des meilleurs temps et la page de la saison 2027 en HTML complet → ✅
- [x] CA2 : un cas limite : la saison sans aucun temps (nageur 2) et la nageuse 3 avec 2 temps → ✅
- [x] CA3 : les pages Cloudflare et connexion sont présentes (inventées, ce qui est indiqué) → ✅
- [ ] CA4 : le README liste chaque fichier, avec l'ID, le type et l'origine, mais **sans la date de capture** → ❌ (écart déjà connu, mineur)
- [x] CA5 : une page réelle de référence, et l'origine de chaque fichier est indiquée → ✅
- [x] CA6 : l'anonymisation est vérifiée par `check_anonymisation.py`, qui passe → ✅
- [ ] CA7 : la recette réelle → **non testable ici** (product owner, avant le déploiement ; voir R-P2-02)

### Validation US-011 : Analyse du HTML SwimRankings

#### Critères d'acceptation
- [x] CA1 : `{ event, distance, stroke, course, time, finaPoints, date, city, meet }` donne les mêmes valeurs que la page (39 PB et 11 temps de saison, comparés à l'extraction Python) → ✅
- [x] CA2 : les lignes « Lap » sont ignorées → ✅
- [x] CA3 : l'ID, le nom (« Swimmer One Test ») et le type de page (`pb` / `season` avec l'année) sont identifiés → ✅
- [x] CA4 : une page en français est refusée (`language`), sans import partiel → ✅
- [x] CA5 : les pages Cloudflare, de connexion, les autres pages et le texte quelconque sont reconnus, sans erreur JS → ✅
- [x] CA6 : un temps `27.80 M` ou `abc` est rejeté ; un point « - » donne 0 → ✅ (une ligne rejetée l'est sans le dire : R-P2-04)
- [x] CA7 : les tests automatiques (`test_us011_analyse.py`, 44 vérifications) passent → ✅

#### Tests additionnels
- [x] Espaces, CRLF, BOM, sans doctype : import OK
- [x] Copie coupée à la fin (dans les lignes, après `</table>`, avant ou au milieu de `</html>`) : `truncated`
- [ ] Copie coupée au début : les messages sont trompeurs (R-P2-03)
- [ ] Deux pages collées l'une après l'autre : voir BUG-P2-01 et R-P2-10
- [x] Gros HTML : 2 Mo en 63 ms, 10 Mo en 386 ms, 30 Mo en 2 s ; 200 000 nœuds en 0,6 s
- [ ] Texte après `</html>` : refusé comme `truncated` (R-P2-02)

### Validation US-012 : Fenêtre de synchronisation

#### Critères d'acceptation
- [x] CA1 : 🔄 et « Synchroniser maintenant » ouvrent la fenêtre (`aria-haspopup="dialog"`, plus d'`aria-disabled`) → ✅
- [x] CA2 : les étapes sont affichées : ouvrir la page, Cloudflare et connexion, code source, tout copier, coller → ✅
- [x] CA3 : les liens sont construits à partir de l'ID (`…athleteId=9999001` et `&pbest=2027`), avec `target="_blank" rel="noopener"` et « (nouvel onglet) » masqué. L'année suit la date : `pbest=2028` le 1er septembre 2027, « 2025-2026 » le 31 août 2026 → ✅
- [x] CA4 : il y a une zone de texte et un bouton « Importer » → ✅
- [x] CA5 : la checklist « ✓ Meilleurs temps / ○ Saison » se met à jour après chaque import (et repart de zéro à chaque ouverture, comme prévu) → ✅
- [x] CA6 : la fenêtre se ferme avec ✕, Échap et Terminer, et les imports sont conservés → ✅
- [x] CA7 : clavier : le focus initial est dans la zone. L'ordre de Tab est Importer → Terminer → ✕ → lien PB → lien saison → Autre appareil → zone. Tab boucle dans les deux sens, et le focus revient à 🔄 ou à « Synchroniser maintenant ». À 375 px, la fenêtre est utilisable → ✅ (mais elle s'ouvre défilée : BUG-P2-04)

#### Tests additionnels
- [x] Responsive 320 / 375 : la fenêtre est en plein écran, sans défilement horizontal ; Terminer est atteignable (défilement automatique au focus)
- [x] Responsive 768 / 1200 : la fenêtre est centrée sur 560 px
- [ ] Position à l'ouverture sur petit écran : BUG-P2-04
- [x] Échap depuis les Paramètres : seule la fenêtre se ferme, puis un 2e Échap ferme les Paramètres
- [x] Popup de l'avatar ouverte puis 🔄 : la popup se ferme, et après Échap le focus revient à 🔄
- [x] Profil en édition : 🔄 est masqué (`.setup-active .header-actions`), donc il n'y a pas de conflit avec Échap
- [x] « Autre appareil » : `aria-expanded` passe de false à true puis à false, et la liste masquée est exclue du cycle de Tab

### Validation US-013 : Import et stockage des temps

#### Critères d'acceptation
- [x] CA1 : `swimtimes_pb` = `{ updated, nation: "SUI", data[39] }` → ✅
- [x] CA2 : `swimtimes_season` = `{ season: "2026-2027", updated, data[11] }` → ✅
- [x] CA3 : l'ordre est libre (saison puis PB, et l'inverse) → ✅ (Progression avec la saison seule : BUG-P2-02)
- [x] CA4 : un réimport remplace sans fusion : 39 puis 39, 11 puis 11 → ✅ (sauf en cas de collage concaténé : BUG-P2-01)
- [x] CA5 : messages « ✓ 39 meilleurs temps importés. » et « ✓ 11 temps de la saison 2026-2027 importés. » → ✅
- [x] CA6 : la zone est vidée après un import réussi → ✅
- [x] CA7 : le HTML n'est jamais stocké (le `localStorage` complet fait 11 Ko, sans balise) → ✅

#### Tests additionnels
- [x] Stockage plein : le message commun s'affiche, la zone est conservée, le focus est dans la zone et rien n'est écrit
- [x] ID du profil à zéros initiaux (`09999001`) : l'import de la page 9999001 est accepté
- [ ] Collage après une erreur : BUG-P2-01

### Validation US-014 : Messages d'erreur de l'import

#### Critères d'acceptation
- [x] CA1 : zone vide → « Colle d'abord le code de ta page SwimRankings. » → ✅
- [x] CA2 : Cloudflare → le message attendu → ✅
- [x] CA3 : connexion → « Connecte-toi à SwimRankings, puis recopie le code de ta page. » → ✅
- [x] CA4 : texte de la page ou HTML échappé → « Affiche le code source (Cmd+U ou Ctrl+U)… » → ✅ (sur mobile : R-P2-07)
- [x] CA5 : autre nageur → « Cette page est celle de Swimmer One Test, pas la tienne : rien n'a été importé. » → ✅
- [x] CA6 : page de meilleurs temps sans temps → « Cette page ne contient aucun temps : rien n'a été modifié. » ; une saison vide est importée → ✅
- [x] CA7 : copie incomplète → le message attendu, sans import partiel → ✅
- [x] CA8 : autre langue → « Passe SwimRankings en anglais… » → ✅
- [x] CA9 : stockage plein → même message que pour le profil → ✅
- [x] CA10 : après une erreur, le texte reste et le focus va dans la zone → ✅ ; **mais** le curseur est à la fin, ce qui provoque BUG-P2-01

### Validation US-015 : État de la synchronisation

#### Critères d'acceptation
- [x] CA1 : « Dernière synchronisation » affiche « 15 oct. 2026, 10:00 », ou « Jamais synchronisé ». La ligne est mise à jour même si la fenêtre a été ouverte depuis les Paramètres → ✅
- [x] CA2 : ✓ vert sur 🔄 pendant 2 s à la fermeture après un import ; rien sans import → ✅ (cas rare : R-P2-08)
- [x] CA3 : le badge apparaît au-delà de 7 jours (7 j : non ; 14 j et 400 j : oui), le libellé est annoncé (« … il y a 14 jours ») et les Paramètres affichent « 1 oct. 2026, 02:00 · il y a 14 jours ». Le badge disparaît après un import → ✅
- [x] CA4 : le message « Aucune donnée. Clique sur 🔄… » mène à une fenêtre fonctionnelle → ✅

### Validation US-016 : Aide selon l'appareil

#### Critères d'acceptation
- [x] CA1 : Mac → Option+Cmd+U (Chrome, Edge, Safari), Cmd+U (Firefox) ; Windows et Linux → Ctrl+U → ✅
- [x] CA2 : Android → « ajoute « view-source: » devant l'adresse » → ✅ (Android en mode « version pour ordinateur » : R-P2-07)
- [x] CA3 : iPhone et iPad en mode bureau (`Macintosh` + écran tactile) → bandeau « Safari ne permet pas… », instructions pour ordinateur déjà dépliées → ✅
- [x] CA4 : « Autre appareil » donne accès aux 3 autres instructions → ✅
- [x] CA5 : rappel « Assure-toi que SwimRankings est en anglais… » → ✅
- [x] CA6 : « 🔒 Tes données sont stockées sur cet appareil uniquement. » → ✅
- [x] CA7 : tutoiement → ✅

### Validation US-017 : Afficher les temps importés

#### Critères d'acceptation
- [x] CA1 : Temps, Progression, la popup (« 39 PBs · 11 2026-2027 ») et les records des Paramètres (39) utilisent `swimtimes_pb` et `swimtimes_season` → ✅
- [x] CA2 : la mise à jour est immédiate après l'import, y compris pour les Paramètres ouverts sous la fenêtre → ✅
- [x] CA3 : statuts, écarts et points identiques au calcul attendu : 36 combinaisons × 3 profils, 0 écart ; Progression 6/6 → ✅ (points FINA ≠ SwimRankings : R-P2-05)
- [x] CA4 : saison précédente : le 1er septembre 2027, on voit « Pas encore nagé cette saison », « — » dans la colonne Saison, et la popup affiche « 0 · 2027-2028 » → ✅ (R-P2-09)
- [x] CA5 : un profil sans import affiche « Aucune donnée. Clique sur 🔄 pour synchroniser. » → ✅
- [x] CA6 : au rechargement, l'affichage est immédiat, sans requête réseau autre que `temps-limites.json` (local) → ✅

#### Tests additionnels
- [x] Genre M et F : les temps limites et les points suivent le genre du profil (cohérence profil / page : R-P2-06)
- [x] Saison vide (nageur 2) : 0 qualifié, 28 / 32 « À refaire », conforme au calcul attendu
- [ ] Saison seule, sans PB : BUG-P2-02

### Validation US-018 : Retrait des données du club

#### Critères d'acceptation
- [x] CA1 : aucune requête vers GitHub ni vers `swimmers-*.json` dans l'ensemble des scénarios, ni d'état « chargement » ou « erreur réseau » → ✅
- [x] CA2 : la ligne « Temps affichés : Données du club… » est retirée → ✅
- [x] CA3 : `TODO` est absent de `app.js` et `index.html` → ✅
- [x] CA4 : les tests utilisent les échantillons ; seule la reprise v1 lit encore `swimmers-data.json` (décision documentée) → ✅
- [x] CA5 : la suppression des fichiers fait l'objet d'une décision séparée (question ouverte 5) → ✅

---

## Bugs

### BUG-P2-01 [Majeur] : après une erreur, le nouveau collage s'ajoute au code précédent (doublons, temps d'un autre nageur, erreur sans fin)

**Cause** : après une erreur, `importSwimRankingsHtml()` garde le texte dans la zone (US-014 CA10) et y place le focus, avec le curseur **à la fin** (sélection `[n, n]`). Le message invite à recopier la page. Si l'utilisateur colle (Cmd+V, ou appui long › Coller sur mobile) sans d'abord vider la zone, le nouveau code s'ajoute à l'ancien. L'analyse travaille alors sur deux pages réunies :
- la **première** `table.athleteBest` et le **premier** titre « Personal bests » ;
- l'ID **le plus fréquent** des deux pages ;
- le test « se termine par `</html>` » s'applique seulement à la fin du texte.

**Étapes** (reproduites avec le vrai presse-papiers, `t_retry_clipboard.py`, et par insertion au curseur, `t_import.py`) — profil 9999001, 15 octobre 2026 :

| 1er collage | Message | 2e collage : sa vraie page de meilleurs temps (Cmd+V) | Résultat |
|---|---|---|---|
| Page Cloudflare | « vérification Cloudflare » | PB 9999001 | **Même erreur Cloudflare, indéfiniment** (le motif `_cf_chl_opt` est cherché dans tout le texte). Seul un vidage manuel de la zone débloque. |
| Copie incomplète (« sélectionne tout avant de copier ») | « incomplet » | PB 9999001 | « ✓ **47** meilleurs temps importés » : 8 épreuves en double (25/50/100/200 NL en 25 m et 50 m, 400 NL 50 m). Les doublons sont visibles dans les records des Paramètres (47) et dans la popup. |
| Page de la nageuse 3 (sœur, coéquipière) | « celle de Swimmer Three Test, pas la tienne » | PB 9999001 | « ✓ **2 temps de la saison** 2026-2027 importés » : les temps de la nageuse 3 (50 NL 27.91, 400 NL 4:40.35) sont enregistrés comme la saison de la nageuse 1, alors que l'utilisateur a collé sa page de meilleurs temps. |
| Texte de la page / connexion | message attendu | PB 9999001 | Import correct (39), par chance |

**Attendu** : coller sa page après une erreur importe cette page, et seulement elle.

**Impact** : données fausses enregistrées sans avertissement (doublons, temps d'une autre personne), ou utilisateur bloqué sur un message qui ne correspond plus à ce qu'il a collé. Le parcours est probable : c'est précisément ce que les messages « recopie » et « sélectionne tout avant de copier » font faire.

**Pistes** (à combiner) :
- Après une erreur, sélectionner le contenu de la zone (`textarea.select()`) : le prochain collage le remplace, et le texte reste disponible.
- Refuser un code qui contient plusieurs pages, par exemple plus d'un `<html` ou de `</html>` : message « Tu as collé plusieurs pages : vide la zone puis colle une seule page ».
- Lire l'ID du nageur à l'intérieur de la table retenue (liens `athleteId=` des cellules `event`), pas sur toute la page.

### BUG-P2-02 [Mineur] : Progression affiche « Aucune donnée. Clique sur 🔄 pour synchroniser. » quand seule la saison est importée

**Étapes** : profil 9999001 → 🔄 → importer `nageur1-saison.html` (message « ✓ 11 temps de la saison 2026-2027 importés ») → fermer → Progression.
**Constaté** : 📈 « Aucune donnée. Clique sur 🔄 pour synchroniser. » (`shots/progress_saison_seule.png`). L'onglet Temps affiche pourtant « 2026-2027: 27.91 · 547 pts FINA », et la popup « 0 PBs · 11 ».
**Attendu** : US-013 dit que l'ordre est libre. Après un import réussi, le message ne doit pas dire qu'il n'y a aucune donnée. Il devrait par exemple indiquer « Importe aussi tes meilleurs temps pour voir ta progression ».
**Cause** : `updateProgressDisplay()` teste `!swimmer.personalBests?.length` et affiche `renderDataState()`.

### BUG-P2-03 [Mineur, confidentialité] : le code collé reste dans la zone après « Supprimer mes données »

**Étapes** : 🔄 → coller une page (par exemple celle d'un autre nageur, sans importer) → Échap → ⚙️ → Supprimer mes données → confirmer → créer un nouveau profil → 🔄.
**Constaté** : la zone contient toujours les 23 042 caractères collés avant la suppression, avec le nom et les temps d'une autre personne. Le même constat vaut après un changement d'ID.
**Attendu** : comme pour BUG-18 (popup de l'avatar), aucune donnée de l'ancien profil ne reste dans la page après la suppression. `resetToFirstLaunch()` devrait vider `#sync-dialog-content`, ou au moins `#sync-html`.

### BUG-P2-04 [Mineur, mobile] : sur petit écran, la fenêtre s'ouvre défilée jusqu'à la zone de texte, sans le titre ni les liens

**Étapes** : 375×667 (iPhone SE / 8) ou 320×568 → 🔄.
**Constaté** : le focus initial dans la zone de texte fait défiler la fenêtre (`scrollTop` 336 à 375×667, 532 à 320×568). Sont alors hors de vue : le titre « Synchroniser mes temps », l'introduction, le bandeau iPhone et l'étape 1 avec les **liens vers ses pages**, la première chose à faire (`shots/sync_375.png`, `sync_320.png`). Sur un vrai téléphone, le focus dans une zone de texte ouvre aussi le clavier, qui masque la moitié de l'écran. À 390×844 et au-delà, il n'y a pas de défilement.
**Attendu** : on voit les étapes depuis le début. Piste : sous 480 px, placer le focus sur le titre (`tabindex="-1"`) ou sur le premier lien plutôt que dans la zone. On peut aussi garder la zone et appeler `focus({ preventScroll: true })`, mais le clavier s'ouvrirait quand même.

---

## Remarques (non bloquantes, hors bug)

- **R-P2-01, version de `app.js` (à faire avant le déploiement)** : `index.html` charge toujours `app.js?v=20261001` alors que `app.js` a beaucoup changé. Le rappel figure dans `CLAUDE.md` : sans changement, un navigateur peut garder l'app de la Phase 1 avec la nouvelle page.
- **R-P2-02, texte après `</html>`, à vérifier pendant la recette réelle** : un commentaire, une adresse ou un texte copiés après `</html>` font refuser la page comme « incomplète ». Les échantillons se terminent bien par `</html>`, mais ils dérivent d'une seule capture. Pendant la recette, il faudra copier le code depuis Chrome, Firefox, Safari et Edge (vue du code source). On peut aussi tolérer ce qui suit `</html>` : chercher `</html>` avec `lastIndexOf` et vérifier que `</table>` suit la table retenue.
- **R-P2-03, copie coupée au début, messages trompeurs** (sans import partiel) :
  - Une coupe entre le titre « Personal bests » et la table donne « Passe SwimRankings en anglais ».
  - Une coupe à l'intérieur de la table donne « Ce code n'est pas celui d'une page nageur ».
  - Une coupe avant le titre est **acceptée**, ce qui est correct puisque les temps sont complets, mais `nation` vaut alors `null` et remplace « SUI » ; le nom est vide.

  Le message « incomplet » conviendrait mieux aux deux premiers cas. On pourrait aussi conserver la nation précédente.
- **R-P2-04, lignes écartées sans le dire** : une ligne au temps annoté (par exemple `27.80 M`), à 6 cellules ou à l'épreuve inconnue disparaît sans que le message le signale (« 38 meilleurs temps importés »). Si la structure réelle diffère des échantillons, l'utilisateur perd un PB sans le savoir. On pourrait ajouter « (1 ligne ignorée) » au message et la consigner en console.
- **R-P2-05, points FINA** : l'app recalcule les points avec sa propre table (`FINA_BASE_TIMES`) au lieu d'utiliser `finaPoints` lu sur SwimRankings et stocké. L'écart est souvent de 1 point, mais va jusqu'à **22** (200 m 4 nages 50 m : 619 contre 641 sur SwimRankings ; 100 m papillon : 563 contre 581 ; 400 m NL : 620 contre 630). Le CA (« comme aujourd'hui ») est respecté, mais le nageur verra deux valeurs différentes. C'est à trancher par le product owner.
- **R-P2-06, genre du profil différent de celui de la page** : la page indique le genre (`gender1.png` / `gender2.png`). Un profil « H » qui importe une page féminine n'est pas averti, et les points et temps limites sont alors calculés pour le mauvais genre : 50 NL 50 m, 426 points au lieu de 613. Un avertissement à l'import serait utile.
- **R-P2-07, instructions mobiles** :
  - Chrome Android en mode « version pour ordinateur » se présente comme Linux : il reçoit « Ctrl+U », qui n'existe pas sur mobile. La liste « Autre appareil » reste accessible.
  - Les messages d'erreur `not-html` et `truncated` citent « Cmd+U ou Ctrl+U » et « Cmd+A ou Ctrl+A », y compris sur Android et iPhone.
- **R-P2-08, ✓ sur 🔄** : deux fermetures après import à moins de 2 s d'intervalle : le minuteur de la première efface le ✓ de la seconde après 0,5 s. Le ✓ n'est pas non plus annoncé par le nom accessible, qui reste « Synchroniser mes temps ». Le message de la fenêtre l'a déjà été (`aria-live`).
- **R-P2-09, nouvelle saison** : le 1er septembre, les temps de saison disparaissent sans explication. En 25 m, Progression passe de 18 qualifiés / 15 à refaire à 0 / 33, et seul le badge des 7 jours peut alerter. Un bandeau « Nouvelle saison 2027-2028 : importe tes temps de la saison » éviterait l'inquiétude.
- **R-P2-10, deux pages du même nageur collées d'un coup** : seule la première est importée (« 39 meilleurs temps »), sans avertissement. La checklist le montre (○ Saison). C'est à couvrir avec la correction de BUG-P2-01.
- **R-P2-11, nom très long** : une page d'un autre nageur au nom de 20 000 caractères produit un message de 20 068 caractères. Tronquer le nom à environ 60 caractères.
- **R-P2-12, défense en profondeur** : `city` et `meet` sont stockés tels qu'extraits. Un texte `<img onerror…>` (encodé en entités dans la page) est ainsi conservé en clair. Ce n'est pas exploitable aujourd'hui : ces champs ne sont pas affichés et les autres textes passent par `escapeHtml`. Il faudra les échapper le jour où ils seront affichés. Toute suite de 3 majuscules est acceptée comme nation (« XSS » → 🏊 XSS), ce qui est sans danger.
- **R-P2-13, checklist et lecteurs d'écran** : l'état est porté par `aria-label` sur des `<li>` (souvent ignoré sur un élément non interactif) et par un `::before` CSS. Ce n'est pas vérifié avec un vrai lecteur d'écran. Piste : un texte masqué « importé » / « à importer » dans le `<li>`.
- **R-P2-14, ID à zéros initiaux** (constaté à la lecture du code) : l'import compare les ID comme des nombres (`09999001` = `9999001`), mais l'édition du profil les compare comme du texte. Passer de `9999001` à `09999001` supprime donc les temps du même nageur. C'est un cas rare.

---

## Non-régression

- `PYTHON=~/swimscraper/bin/python tests/run_all.sh` : **15/15 verts**. Les tests de la Phase 1 (`test_us001` à `test_us005`, `test_us003_006_007_008_009`, `test_qa1`, `test_qa2`, `test_bug19`) et de la Phase 2 (`test_us011`, `test_us012_013_014`, `test_us015_016`, `test_us017_018`) passent. L'anonymisation est vérifiée, et les audits de contraste (AA, 124 lignes JO) passent (`scratchpad/qa-p2/run_all.txt`).
- Parcours de la Phase 1 rejoués à la main dans mes scripts, avec des temps importés : édition du profil et avertissement d'ID, Échap dans les Paramètres, popup, suppression avec la confirmation de 1 s, recréation d'un profil. La reprise v1 (US-008) est couverte par la suite, qui passe.

---

## Cas de test

### TC-101 : Variantes de collage acceptées
**Préconditions** : profil 9999001, date 15 octobre 2026. **Étapes** : importer `nageur1-meilleurs-temps.html` (a) précédé et suivi d'espaces, de tabulations et de retours, (b) en CRLF, (c) avec un BOM et une espace insécable finale, (d) sans doctype. **Attendu** : « ✓ 39 meilleurs temps importés. » dans les 4 cas, avec des données identiques à `fixture_times()`.

### TC-102 : Copie incomplète à la fin
**Étapes** : coller la page coupée dans les lignes de temps, juste après `</table>`, juste avant `</html>` et au milieu de `</html>`. **Attendu** : message « incomplet », aucun changement dans `swimtimes_pb`.

### TC-103 : Copie incomplète au début
**Étapes** : coller la page amputée de son début (a) avant le titre « Personal bests », (b) entre le titre et la table, (c) dans les lignes. **Attendu** : (a) import complet, sans perdre la nation stockée ; (b) et (c) message « incomplet » plutôt que « anglais » ou « pas une page nageur » (R-P2-03).

### TC-104 : Recoller après une erreur (BUG-P2-01)
**Préconditions** : profil 9999001. **Étapes** : coller successivement (a) `cloudflare.html`, (b) les 20 000 premiers caractères de la page PB, (c) `nageur3-peu-de-temps.html` ; cliquer Importer ; puis **Cmd+V** de `nageur1-meilleurs-temps.html` sans vider la zone, et Importer.
**Attendu** : dans les 3 cas, « ✓ 39 meilleurs temps importés. », aucun doublon dans `swimtimes_pb` et aucune écriture dans `swimtimes_season`.
**Constaté aujourd'hui** : (a) erreur Cloudflare ; (b) 47 temps, dont 8 doublons ; (c) les 2 temps de la nageuse 3 importés comme saison.

### TC-105 : Deux pages collées d'un coup
**Étapes** : coller PB + saison du même nageur, puis saison + PB, puis la page d'un autre nageur + la sienne. **Attendu** : refus explicite (« une seule page à la fois »), ou import des deux pages ; jamais les temps d'un autre nageur.

### TC-106 : Ordre libre et réimport
**Étapes** : importer la saison, puis le PB, puis réimporter les deux. **Attendu** : 11 puis 39 temps, sans doublons ; zone vidée ; checklist ✓ / ✓ ; aucune balise dans `localStorage`.

### TC-107 : Saison seule (BUG-P2-02)
**Étapes** : importer seulement la saison, puis ouvrir Progression. **Attendu** : un message qui invite à importer les meilleurs temps, pas « Aucune donnée ».

### TC-108 : Saison vide, passée, future
**Données** : `nageur2-saison.html` (0 temps), `Season 2026`, `Season 2028`, date du 15 octobre 2026. **Attendu** : saison vide → « Aucun temps sur la saison 2026-2027 pour l'instant : c'est enregistré. » ; 2026 → « Cette page montre la saison 2025-2026. Ouvre le lien « Mes temps de la saison 2026-2027 ». » ; 2028 → refus du même type. Le 31 août 2026, la page 2027 est refusée avec un lien vers 2025-2026.

### TC-109 : Passage au 1er septembre
**Préconditions** : PB et saison importés le 15 octobre 2026. **Étapes** : rouvrir l'app le 31 août 2027 à 23 h 30, puis le 1er septembre 2027 à 0 h 30. **Attendu** : le 31 août, rien ne change (« 2026-2027: 27.91 »). Le 1er septembre : « Pas encore nagé cette saison », colonne Saison à « — », statuts ⏳, popup « 0 · 2027-2028 », liens `pbest=2028`, page 2027 refusée. Un import de la page 2028 restaure l'affichage.

### TC-110 : Changement d'ID après import
**Étapes** : importer PB et saison → Paramètres → Modifier → ID 9999002 → Enregistrer. **Attendu** : il ne reste que `swimtimes_profile` ; « Jamais synchronisé » ; plus de records ; Temps « Aucune donnée » ; liens vers 9999002 ; la page 9999001 est refusée.

### TC-111 : Suppression après import (BUG-P2-03)
**Étapes** : importer, puis coller une page sans l'importer → Supprimer mes données → nouveau profil → 🔄. **Attendu** : `localStorage` vide après la suppression, et une zone de texte **vide**.

### TC-112 : ID à zéros initiaux
**Étapes** : profil `09999001`, import de la page 9999001. **Attendu** : import accepté ; liens `athleteId=09999001`.

### TC-113 : Valeurs de l'onglet Temps
**Préconditions** : temps importés des nageurs 1 (F) et 2 (M). **Étapes** : pour chaque bassin, nage et distance, lire le bloc PB et le tableau. **Attendu** : PB, temps de saison, points FINA (formule de l'app), temps limites filtrés par bassin et triés, 💪, statut ✓ / ⏳ / écart signé à 2 décimales, tous identiques au calcul attendu (36 combinaisons, 0 écart).

### TC-114 : Compteurs de Progression
**Attendu** (calcul indépendant) : nageuse 1 → 50 m : 0 / 27 / 7, 25 m : 18 / 15 / 3 ; nageur 2 → 50 m : 0 / 28 / 10, 25 m : 0 / 32 / 4 ; nageuse 1 avec un profil H → 50 m : 0 / 8 / 11, 25 m : 5 / 3 / 16.

### TC-115 : Clavier et Échap
**Étapes** : Entrée sur 🔄 → Tab × 7 → Maj+Tab depuis ✕ → Échap ; ouvrir depuis Paramètres → Échap → Échap ; ouvrir la popup de l'avatar → 🔄 → Échap. **Attendu** : focus initial dans la zone ; boucle Importer → Terminer → ✕ → liens → Autre appareil → zone ; le focus revient au bouton d'origine ; les Paramètres ne se ferment qu'au 2e Échap ; la popup est fermée ; le texte non importé est conservé.

### TC-116 : ✓ et badge
**Données** : `updated` à 7, 14 et 400 jours. **Attendu** : pas de badge à 7 jours. À 14 et 400 jours : badge jaune, `aria-label` « … il y a N jours », Paramètres « … · il y a N jours ». Un import fait disparaître le badge. La fermeture après un import affiche ✓ pendant 2 s ; une fermeture sans import ne l'affiche pas.

### TC-117 : Instructions selon l'appareil
**Données** : user agent et `maxTouchPoints` pour iPhone, iPad en mode bureau (Macintosh + 5 points), Android, Android en mode bureau, Mac, Windows, Windows tactile, Firefox Linux. **Attendu** : bandeau et instructions dépliées sur iPhone et iPad ; `view-source:` sur Android ; Option+Cmd+U / Cmd+U sur Mac ; Ctrl+U sinon ; « Autre appareil » donne les 3 autres instructions.

### TC-118 : Responsive (BUG-P2-04)
**Étapes** : ouvrir la fenêtre à 320×568, 375×667, 768×1024 et 1200×800. **Attendu** : pas de défilement horizontal ; plein écran sous 480 px, centrée sur 560 px au-delà ; **titre et liens visibles à l'ouverture** ; Terminer atteignable ; contraste AA.

### TC-119 : HTML piégé
**Données** : page PB avec `<script>`, `onload`, `<img onerror>`, `<svg onload>`, `<iframe>`, `<base>`, `<meta refresh>` vers un hôte externe, ville, compétition, temps et nation piégés ; nom piégé sur une page d'un autre ID. **Attendu** : `window.__pwn` reste indéfini ; aucune requête vers l'hôte externe ; aucun `img[onerror]` dans le DOM de l'app ; le nom s'affiche comme du texte ; la ligne au temps piégé est conservée avec `27.80`.

### TC-120 : Stockage plein
**Étapes** : `setItem` lève `QuotaExceededError` pour `swimtimes_pb` / `swimtimes_season` → Importer. **Attendu** : message « Impossible d'enregistrer sur cet appareil… », zone conservée, focus dans la zone.

### TC-121 : Gros HTML
**Données** : page PB + 2, 10 ou 30 Mo de commentaire, ou + 200 000 nœuds. **Attendu** : import correct (39), sans blocage perceptible au-delà de 2 s pour 30 Mo.

### TC-122 : Aucune requête externe (US-018)
**Étapes** : parcourir tous les scénarios en enregistrant les requêtes. **Attendu** : uniquement le serveur local (`index.html`, `app.js`, logo, `temps-limites.json`) ; aucune requête vers GitHub, `swimmers-*.json` ou `athletes.txt`.

---

## Priorités proposées

1. **BUG-P2-01**, avant le déploiement : sélectionner le texte après une erreur et refuser plusieurs pages collées.
2. **Recette réelle** (US-010 CA7), en vérifiant R-P2-02 (fin du code copié selon le navigateur) et R-P2-04 (aucune ligne écartée).
3. **R-P2-01** : changer la version de `app.js` au déploiement.
4. BUG-P2-04, BUG-P2-02, BUG-P2-03.
5. Remarques à trancher par le product owner : R-P2-05 (points FINA), R-P2-06 (genre), R-P2-09 (nouvelle saison).

---

## Re-test des corrections (2026-10-23)

Version re-testée : working tree de `phase-2-synchronisation` (`app.js` 2217 lignes, `index.html` 314 lignes, non commités ; `node --check` OK).
Scripts : `scratchpad/qa-p2-retest/`. Ce sont des copies de mes scripts du premier passage, adaptées sur deux points : le message est lu après son écriture différée de ~100 ms, et l'état de la liste est lu dans son texte. J'y ai ajouté `t_retest.py` (corrections et régressions) et `t_fina_round.py`. Sorties : `out_t_*.txt` ; captures : `shots/`.
Le collage est simulé de 4 façons :
- un vrai Cmd+V depuis le presse-papiers ;
- `keyboard.insert_text` ;
- un clic dans la zone, puis Cmd+V ;
- Maj+Tab et Tab, puis Cmd+V.

Un appareil tactile est aussi simulé (`has_touch`, tap).

### Points annoncés corrigés

| Point | Verdict | Preuve (re-test) |
|---|---|---|
| **BUG-P2-01**, collage après erreur | ✅ | J'ai testé 10 erreurs différentes : Cloudflare, connexion, fin coupée, début coupé, autre nageuse, texte de la page, saison passée, ligne illisible, plusieurs pages et page en français. Après chacune, la zone est sélectionnée `[0, n]` et le focus y est. Un Cmd+V ou `insert_text` de la page PB donne « ✓ 39 meilleurs temps importés », `swimtimes_season` reste intact : 20 cas sur 20. Après Maj+Tab puis Tab, la sélection est conservée (10/10). Sur tactile, un tap garde la sélection, et coller importe 39 temps. **Si l'utilisateur clique dans la zone avant de coller**, la sélection disparaît et le texte s'ajoute. Le filet `multiple-pages` refuse alors l'import dans 9 cas sur 10 ; le 10e cas (texte de page + code) importe correctement 39 temps. Un 3e Cmd+V, sur le texte de nouveau sélectionné, importe 39 temps. **Aucun doublon ni temps d'une autre nageuse dans aucun cas** (voir R-P2-15). |
| BUG-P2-01, `multiple-pages` | ✅ | Les cas PB+saison, saison+PB, autre nageuse+PB et la même page collée 2 fois sont tous refusés. `PB + texte` et `iframe srcdoc` (en entités) sont acceptés. Faux positifs possibles : voir R-P2-16. |
| **BUG-P2-02**, saison seule | ✅ | Progression : « Importe aussi tes meilleurs temps (🔄) pour voir ta progression. » Contraste OK à 375 et à 1200 px (`progression_saison_seule_*.png`). |
| **BUG-P2-03**, code collé après « Supprimer » ou un changement d'ID | ✅ | Après une suppression puis la création d'un profil, la zone contient 0 caractère (avant : 23 042). Après un changement d'ID vers 9999002 avec la page S3 collée sans import, la zone contient aussi 0 caractère. Seule la clé `swimtimes_profile` reste. |
| **BUG-P2-04**, ouverture sur petit écran | ✅ | À 320×568, 375×667 et 1200×800 : `scrollTop` vaut 0, le focus est sur `#sync-title`, et le titre comme le lien PB sont visibles. Ouverte au clavier, la fenêtre montre un anneau de focus sur le titre ; ouverte à la souris, aucun anneau. Maj+Tab depuis le titre mène à « Terminer », donc le piège fonctionne. À la réouverture après une erreur, le focus va aussi sur le titre, en haut. |
| Review : ligne illisible → `unrecognized` + nombre | ⚠️ | Une ligne `athleteBest*` illisible est bien refusée (« 1 ligne… » / « 2 lignes… »), et une saison avec `Free` au lieu de `Freestyle` aussi (`unrecognized 4`). **En revanche, si les lignes changent de classe, l'import réussit et la saison stockée est vidée** : le scénario même du point bloquant 2 de la review n'est pas couvert (**BUG-P2-05**). Le message renvoie en outre vers une cause impossible (**BUG-P2-07**). |
| Review : copie incomplète, début ou fin | ✅ | Coupe à 1, 5, 10, 14, 20, 30, 50, 70, 90 et 99 % : `truncated` des deux côtés (20/20). Saison coupée avant le tableau : `truncated` (avant : `not-athlete`). Coupe juste après `<html …>` : `truncated`. |
| Review : `</html>` non final | ✅ | Commentaire ou texte après `</html>` : import de 39 temps (avant : `truncated`). |
| Review : Cloudflare seulement sans tableau | ✅ | Une page nageur avec un script Turnstile ou `_cf_chl_opt` importe 39 temps. `cloudflare.html` donne `cloudflare`, `connexion.html` donne `login`. |
| Review : temps stockés illisibles, date vide | ✅ | `time` numérique : la ligne est ignorée (38 PB), sans erreur JS ; l'avatar et l'onglet Temps s'affichent. Avec `updated: null`, les Paramètres affichent « Jamais synchronisé », sans badge. Avec `data` non tableau ou un JSON invalide, l'app affiche « Aucune donnée », sans erreur. |
| Review : `athleteId` stocké avec les temps | ✅ | Les données stockées contiennent `athleteId: "9999001"`. Des PB d'un autre ID sont ignorés (0 PB affiché). `"09999001"` est accepté pour le profil 9999001, comme un stockage sans `athleteId`. Écart mineur : la « Dernière synchronisation » tient compte des temps ignorés (R-P2-17). |
| Review : minuteur du ✓ | ✅ | Pour un 2e import fermé à t+1,5 s, le bouton affiche toujours ✓ à t+2,2 s (avant : 🔄). |
| Review : message réécrit à chaque essai | ✅ | Deux clics avec la zone vide produisent les mutations `["⚠️ Colle d'abord…", "", "⚠️ Colle d'abord…"]` : le message est vidé puis réécrit. |
| Review : état de la liste en texte | ✅ | L'arbre d'accessibilité donne `listitem "Meilleurs temps : à importer"` et `"Saison 2026-2027 : à importer"`. L'icône a `aria-hidden`. |
| Review : « Autre appareil » via `aria-controls` | ✅ | `aria-controls="sync-other-devices"` ; `toggleOtherDevices(this)` lit la cible par son ID. Au clic, `aria-expanded` passe à true et la liste est visible. |
| Review : code mort | ✅ | `isConfirmDialogOpen`, `trapConfirmDialogFocus`, `handleSyncClick`, `.loading` et `@keyframes spin` ont disparu. `.btn[aria-disabled]` reste, car il sert encore à `renderSoonButton`. |
| R-P2-05, bases FINA 2026 | ✅ | Sur les 4 pages nageur (83 temps comparés), l'écart avec SwimRankings est au plus de 1 point, contre 22 avant. Il y a 45 écarts d'1 point, tous dans le même sens. **`Math.floor` donne 83/83 identiques** (`t_fina_round.py`) : SwimRankings tronque, l'app arrondit (R-P2-18). Les épreuves de 25 m n'ont pas de base : pas de points, comme avant. |

### Non-régression

- **Suite** `PYTHON=~/swimscraper/bin/python tests/run_all.sh` : **15/15 verts**, code de sortie 0 (`run_all.txt`). Détail : US-001, anonymisation, BUG-19 17, QA-1 43, QA-2 78, US-002 39, US-003… 60, US-004 30, US-005 26, US-011 52, US-012/013/014 82, US-015/016 30, US-017/018 28, contraste AA et 124 lignes JO.
- **Critères US-010 à US-018** : aucun recul. US-010 CA4 (date de capture) et CA7 (recette réelle) restent tels que notés plus haut. US-014 CA10 est respecté sous sa nouvelle forme : le texte reste, sélectionné, et le focus est dans la zone.
- **Cas de test** (mes scripts du premier passage, rejoués et comparés aux sorties d'origine) :
  - **TC-101, 102, 104 à 117 et 119 à 122** : ✅.
  - **TC-103** : (b) et (c) donnent bien « incomplet ». (a) donne aussi « incomplet » au lieu d'un import : c'est un choix prudent et accepté, d'où ✅.
  - **TC-104** : passe désormais.
  - **TC-105** : refus `multiple-pages`.
  - **TC-113 et TC-114** : 36 combinaisons × 3 profils, 0 écart ; Progression 6/6.
  - **TC-115** : l'ordre de Tab est maintenant titre → ✕ → liens → Autre appareil → zone → Importer → Terminer, en boucle.
  - **TC-118** : ✅.
  - **TC-121** : 30 Mo analysés en 2,3 s (2,0 s avant) ; le 10 Mo collé et importé en 2,2 s. Pas de blocage.
- **Sécurité** (TC-119) : identique. `window.__pwn` n'est pas défini, aucune requête externe, aucune erreur JS dans l'ensemble des scénarios.
- **Contraste** : l'audit `contrast.js` est OK à 375 et à 1200 px dans ces états : ouverture, erreur `unrecognized`, plusieurs pages, saison seule, liste ✓, ✓ sur 🔄, instructions iPhone et Android. Les captures `ouverture_*`, `erreur_*`, `double_clic_1200` et `progression_saison_seule_*` ont été regardées : le texte sélectionné reste lisible (surlignage bleu sur fond sombre).

### Nouveaux bugs

#### BUG-P2-05 [Majeur] : une page de saison dont les lignes ont une autre classe vide la saison stockée, avec un message de succès

**Cause** : `parseSwimRankingsTimes()` ne compte les lignes illisibles que parmi `tr[class^="athleteBest"]`. Une ligne de données d'une autre classe n'est ni lue ni comptée. C'est exactement le scénario du point bloquant 2 de la review (`athleteBest0` devenu `row0`), et la correction ne le couvre pas.
**Étapes** (`t_retest.py`, § 3b) : 11 temps de saison stockés → 🔄 → coller `nageur1-saison.html` en remplaçant `athleteBest0/1` par `row0/1` → Importer.
**Obtenu** : « ✓ Aucun temps sur la saison 2026-2027 pour l'instant : c'est enregistré. », et `swimtimes_season.data` passe de 11 à **0**. Pour une page de meilleurs temps, on obtient « Cette page ne contient aucun temps : rien n'a été modifié » : le PB est protégé.
**Attendu** : rien n'est importé dès qu'une ligne de données n'est pas reconnue. La review proposait de compter toutes les `tr` de `table.athleteBest` qui ont au moins 7 `td` et ne sont pas « Lap », quelle que soit leur classe. À défaut, refuser quand le tableau contient des lignes `td` mais qu'aucun temps n'est lu.
**Note** : le déclencheur est un changement futur du code de SwimRankings, mais la perte de données est alors silencieuse et touche tous les utilisateurs.

#### BUG-P2-06 [Mineur] : un double-clic sur « Importer » affiche « Colle d'abord le code… » alors que l'import a réussi

**Étapes** : coller la page PB → double-clic sur « Importer » (`double_clic_1200.png`).
**Obtenu** : 39 PB sont stockés et la liste affiche « ✓ Meilleurs temps ». Mais le message final est « ⚠️ Colle d'abord le code de ta page SwimRankings. » : le 2e clic tombe sur la zone vidée, et son message différé remplace le succès. Le focus va dans la zone, ce qui ouvre le clavier sur mobile. Au premier passage, le même script affichait « ✓ 39 meilleurs temps importés » : il s'agit probablement d'une régression. Entrée ×2 ne reproduit pas le problème, car après le succès le focus est déjà dans la zone.
**Attendu** : le message de succès reste. Piste : ignorer un clic sur « Importer » avec la zone vide pendant ~1 s après un succès, ou ne pas remplacer un succès par l'erreur `empty`.

#### BUG-P2-07 [Mineur] : le message `unrecognized` renvoie vers une cause impossible

Le message dit « … Vérifie que SwimRankings est en anglais, puis recopie le code de ta page. » Or `unrecognized` n'est renvoyé qu'après la vérification du titre anglais (« Personal bests, … »). Une page qui arrive à ce stade est donc toujours en anglais. L'utilisateur recopie la même page et retombe sur la même erreur, sans issue. C'est d'autant plus probable que la cause réelle est une ligne inconnue de l'app (voir R-P2-16).
**Attendu** : un message qui dit quoi faire, par exemple « … rien n'a été importé. Signale-le au club (la page contient un format de temps que l'app ne connaît pas). » ; et la ligne en console, pour le diagnostic.

### Remarques

- **R-P2-15, sélection après erreur** :
  - La sélection protège le parcours prévu : coller tout de suite, ou revenir par Tab ou tap. Elle disparaît si l'on clique dans la zone, ou si l'on ferme puis rouvre la fenêtre (le curseur est alors à la fin, et le focus sur le titre).
  - Dans ces cas, `multiple-pages` prend le relais et le collage suivant remplace bien le texte. Mais le message « contient plusieurs pages : colle une seule page à la fois » surprend quelqu'un qui n'a collé qu'une page. Suggestion : « Le code précédent était encore dans la zone : colle à nouveau ta page (elle remplacera le texte sélectionné). »
  - **Correction à la main** : une frappe remplace les 20 000 caractères, mais Cmd+Z les restaure, et une flèche désélectionne. Corriger à la main un code source de 70 Ko n'est pas un usage réaliste : la sélection est le bon choix.
  - **Sur un vrai mobile**, à vérifier pendant la recette : poser le focus dans la zone après une erreur ouvre le clavier, et la sélection de 70 Ko affiche ses poignées. Sur iOS, `select()` peut ne rien sélectionner (il faut parfois `setSelectionRange`), mais l'iPhone ne sert pas à coller du code source (US-016).
- **R-P2-16, faux positifs à surveiller pendant la recette réelle** :
  - **`multiple-pages`** : la recherche porte sur le texte brut. Un `'<html>'` dans une chaîne de script, un `document.write('<html…')` ou un commentaire `<!-- <html> -->`, `<!-- </html> -->` fait refuser **chaque** import de la page (vérifié). Les 5 pages nageur des échantillons, dérivées d'une capture réelle avec 9 scripts dont un beacon Cloudflare, n'en contiennent aucun. Le risque est faible mais bloquant. Piste plus robuste : compter `<!doctype` et `<html` en dehors des `<script>` et des commentaires, ou ne compter que les `</html>` suivis d'un nouveau `<!doctype`/`<html`.
  - **`unrecognized`** : sont maintenant refusées des lignes autrefois ignorées en silence :
    - `4 x 50m Freestyle`, `4x50m Medley`, `100m IM` ;
    - un temps `1:00:12.34`, `24.3` (dixièmes, chronométrage manuel ancien), `DQ`, `NT`, `27.80 M`, `24.35 *`, `24,35` ;
    - un bassin `25 m` ou `SCM`.
    
    Aucun de ces cas n'existe dans les échantillons : 83 lignes, toutes sur 7 cellules, temps `SS.cc` ou `M:SS.cc`, bassins `25m` / `50m`, épreuves individuelles ou « Lap ». Mais ceux-ci dérivent d'une seule capture. Si la vraie page d'un nageur contient une seule ligne de ce type (vieux temps manuel, relais), il ne pourra **jamais** importer cette page. Il faut donc vérifier pendant la recette réelle, sur plusieurs nageurs dont un avec de vieux temps, que l'import passe. La règle « tout ou rien » est cohérente avec la review ; le message doit simplement mener quelque part (BUG-P2-07).
- **R-P2-17, « Dernière synchronisation » et temps d'un autre ID** : `getLastSyncDate()` et le badge tiennent compte de temps stockés pour un autre ID, qui ne sont pas affichés : les Paramètres montrent une date et aucun record. Le cas n'arrive que si `clearSyncedTimes()` échoue. Filtrer par `athleteId` comme `loadSwimmerFromStorage()`.
- **R-P2-18, points FINA à 1 point près** : SwimRankings **tronque** (`Math.floor`) : 83 temps sur 83 identiques, contre 38 sur 83 avec `Math.round`. Remplacer `Math.round` par `Math.floor` dans `calculateFinaPoints()` supprimerait tout écart visible sur les échantillons. C'est au product owner de décider : cela change aussi l'oracle « < +100 pts » de Progression, à la marge.
- **R-P2-01** (`app.js?v=20261001`) est toujours à changer au déploiement. R-P2-11 (nom de 20 000 caractères, message de 20 068) n'a pas été traité et n'était pas annoncé.

### Verdict de livraison de la Phase 2 (hors recette réelle)

**⚠️ LIVRABLE SOUS RÉSERVE.**

Les 4 bugs du premier passage sont corrigés et vérifiés avec les étapes d'origine, le vrai Cmd+V compris. Les corrections de la review tiennent, à une exception près. La suite est entièrement verte, et la non-régression (TC-101 à TC-122, US-010 à US-018) ne montre aucun recul.

Avant le déploiement :
1. **Corriger BUG-P2-05** : quelques lignes dans `parseSwimRankingsTimes()`, plus un test (saison aux lignes de classe changée → refus, saison stockée intacte).
2. **Faire la recette réelle** (product owner), en vérifiant en plus R-P2-16 : aucune page réelle refusée en `multiple-pages` ou `unrecognized`, et plusieurs nageurs dont un avec de vieux temps.
3. **Changer `app.js?v=`** (R-P2-01).

BUG-P2-06 et BUG-P2-07 (mineurs) peuvent suivre, mais BUG-P2-07 est à corriger si la recette fait apparaître un refus `unrecognized`. R-P2-18 est à trancher par le product owner.


> **Suivi du re-test (2026-10-23)** : BUG-P2-05 corrigé (lignes lues quelle que soit leur classe ; refus seulement si aucune ligne n'est lue). BUG-P2-06 et BUG-P2-07 corrigés. R-P2-16 : décision A (lignes non reconnues ignorées et annoncées), « plusieurs pages » détecté par les doctypes et `</html>` seulement. R-P2-17 corrigé. R-P2-18 : décision B (arrondi vers le bas), 81/81 points identiques à SwimRankings.

## Re-test final (2026-10-23)

Version re-testée : working tree de `phase-2-synchronisation` (`app.js` 2237 lignes, `index.html` 314 lignes, non commités ; `node --check` OK).
Scripts : `scratchpad/qa-p2-final/`. Les scripts du re-test sont copiés sans modification (`t_retest.py`, `t_dblclick.py`, `t_fina_round.py`, `t_parse.py`, `t_import.py`, `t_season.py`, `t_dup.py`, `t_display.py`, `t_dialog.py`, `t_secu.py`, `t_retry_clipboard.py`). Deux scripts sont ajoutés :
- `t_final.py` : décisions A et B, variantes R-P2-16, R-P2-17, effets de bord ;
- `t_display_floor.py` : copie de `t_display.py` dont l'oracle des points FINA arrondit vers le bas (décision B).

Sorties : `out_t_*.txt` ; captures : `shots/`.

### Point par point

| Point | Verdict | Preuve |
|---|---|---|
| **BUG-P2-05**, lignes d'une autre classe | ✅ | Mêmes étapes (`t_retest.py` § 3b) : 11 temps de saison stockés, puis la page `nageur1-saison.html` avec `row0`/`row1` donne « ✓ 11 temps de la saison 2026-2027 importés. » ; la saison stockée reste à 11 (avant : 0). La page de meilleurs temps `row0`/`row1` donne 39 PB. **Variante non couverte** : des lignes à moins de 7 cellules (voir BUG-P2-08). |
| **BUG-P2-06**, double-clic sur Importer | ✅ | `t_dblclick.py` (375 px) et `t_retest.py` § 7 (1200 px) affichent tous les deux « ✓ 39 meilleurs temps importés. », 39 PB stockés. Le focus reste sur le bouton : le clavier mobile ne s'ouvre pas. Un 3e clic 1 s puis 4 s après garde le succès. Après fermeture puis réouverture, ou après une saisie effacée, la zone vide redonne « Colle d'abord… ». Double-clic sur une erreur (autre nageuse) : erreur affichée et texte sélectionné `[0, n]`. Entrée ×2 : ✓ 11 temps de saison. |
| **BUG-P2-07**, message « aucun temps lu » | ✅ | Le message devient « ⚠️ Aucun temps de cette page n'a pu être lu : rien n'a été importé. Le format de SwimRankings a peut-être changé ; signale-le aux responsables de SwimTimes. » Il ne renvoie plus vers l'anglais et dit quoi faire. La saison stockée reste intacte (11), et le texte est sélectionné, avec le focus dans la zone. |
| **Décision A**, lignes ignorées et annoncées | ✅ | Les messages sont : « ✓ 38 meilleurs temps importés · 1 ligne ignorée (non reconnue : relais, DQ…). » et « ✓ 37 meilleurs temps importés · 2 lignes ignorées (non reconnues : relais, DQ…). ». Le singulier et le pluriel sont corrects, aussi pour « 1 temps de la saison 2026-2027 importé · 1 ligne ignorée ». Une page dont toutes les lignes sont ignorées est refusée, PB et saison, y compris une saison à 1 seule ligne : rien n'est modifié. À 375 px, le message long tient sur 2 lignes, sans débordement et avec un contraste OK (`succes_2_ignorees_375.png`). L'élément a `aria-live="polite"`. **Exception** : une ligne à 6 cellules est écartée sans être annoncée (BUG-P2-08). |
| **Décision B**, points FINA arrondis vers le bas | ✅ | `t_fina_round.py` : `floor` donne 35/35, 11/11, 35/35 et 2/2, soit **83/83** identiques à SwimRankings (`round` : 38/83). Le décompte du développeur, 81/81, diffère sans doute par le périmètre (épreuves avec base). `calculateFinaPoints` utilise `Math.floor(… + 1e-9)`. |
| R-P2-16, variantes de lignes | ✅ | Dans une page de 39 PB : relais `4 x 50m Freestyle`, `100m IM`, `24.3`, `DQ`, `NT`, `27.80 M`, `SCM`, `1:00:12.34` donnent chacun 38 temps importés et `ignored = 1` (avant : refus de toute la page). |
| R-P2-16, « plusieurs pages » | ⚠️ | Ces cas sont maintenant acceptés : `'<html>'` dans un script, `<!-- <html lang="fr"> -->`, `document.write('<html…')`. Ces cas sont bien refusés : PB+S1, S1+PB1, la même page 2 fois, S1 sans doctype + PB1, un collage au milieu du code, une copie coupée puis recollée. **Ces cas sont encore refusés** : `'</html>'` dans un script, `<!-- </html> -->` et `'<!DOCTYPE html>'` dans un script (R-P2-19). |
| **R-P2-17**, dernière synchronisation | ✅ | PB d'un autre ID seul, ou PB et saison d'un autre ID : `getLastSyncDate()` vaut null, les Paramètres affichent « Jamais synchronisé », sans badge (avant : une date). PB d'un autre ID récent et saison du profil ancienne : la date est celle de la saison (1 août 2026, il y a 74 jours), et le badge est affiché. |
| Points affichés = SwimRankings | ✅ | Import par la fenêtre des 3 nageurs (`t_final.py` § B). Onglet Temps : nageuse 1, 35/35 identiques (les 4 épreuves de 25 m n'ont pas de base, donc pas de points, comme avant) ; nageur 2, 35/35 ; nageuse 3, 2/2. Avec `t_display_floor.py` : 36 épreuves × bassins × 3 profils, 0 écart ; Progression 6/6 compteurs identiques (oracle « < +100 pts » recalculé avec les points arrondis vers le bas). |

### Effets de bord de la décision A

- **Temps déjà importés** : un import remplace toujours toute la liste de la page, PB ou saison. Les temps disparus sont exactement les lignes annoncées comme ignorées : 39 → 38 avec « 1 ligne ignorée », 39 → 37 avec « 2 lignes ignorées », saison 11 → 10 avec « 1 ligne ignorée ». L'autre liste n'est jamais touchée. Une page sans aucune ligne lue ne modifie rien. **Hors annonce** : une ligne à moins de 7 cellules (BUG-P2-08).
- **Une ligne ignorée efface le PB de son épreuve** : si le PB 50 NL 50 m est noté `27.80 M`, le réimport supprime ce PB stocké, et l'onglet Temps affiche « Pas encore de temps ». Le message parle de « 1 ligne ignorée », mais ne dit pas laquelle (R-P2-20).
- **Saison avec uniquement des lignes ignorées** : la page est refusée et la saison stockée reste intacte (11). **Page PB avec uniquement des lignes ignorées** : idem, 39 PB conservés.
- Aucune erreur JS et aucune requête externe dans tous les scénarios.

### Non-régression

- **Suite** `PYTHON=~/swimscraper/bin/python tests/run_all.sh` : **15/15 verts**, code de sortie 0 (`run_all.txt`). Nouveaux décomptes : US-011 54 (au lieu de 52), US-012/013/014 86 (au lieu de 82), US-017/018 31 (au lieu de 28). Les autres sont inchangés : BUG-19 17, QA-1 43, QA-2 78, US-002 39, US-003… 60, US-004 30, US-005 26, US-015/016 30, contraste AA et 124 lignes JO.
- **TC-101 à TC-122** : ✅. Les 11 scripts du re-test ont été rejoués, et leurs sorties comparées à celles du re-test précédent. Seuls changent des points attendus :
  - **Décision B**, `t_season.py` : 559 → 558 pts. `t_display.py` compte 17, 18 et 19 « écarts », tous de −1 point. C'est l'oracle `round` de ce script qui est en cause : `t_display_floor.py` donne 0 écart.
  - **Décision A**, `t_parse.py` : `relais / 25m / IM inconnus` et `points "-" et temps annoté` étaient refusés (`unrecognized`) ; ils sont maintenant importés (39 et 38 temps).
  - **Inchangés** : `t_import`, `t_dup`, `t_dialog`, `t_secu` (TC-119, `__pwn` non défini) et `t_retry_clipboard`.
  - **TC-121** : 30 Mo analysés en 1,8 s ; le 10 Mo est importé en 0,25 s.
- **`t_retest.py`** : BUG-P2-01 : les 40 cas des 4 modes de collage aboutissent tous à 39 PB, sans saison ajoutée. En mode « clic puis Cmd+V », 8 cas passent par un refus `multiple-pages` puis un 3e Cmd+V, comme prévu ; avant, c'était 9, car la « ligne illisible » s'importe désormais dès le 1er collage (décision A). Aucun doublon, aucun temps d'une autre nageuse. BUG-P2-02, BUG-P2-03 et BUG-P2-04, la copie incomplète (20/20), Cloudflare/connexion, le stockage illisible et le focus à l'ouverture restent identiques au re-test précédent. Le contraste est OK à 375 et à 1200 px.

### Nouveaux bugs

#### BUG-P2-08 [Majeur] : une page de saison dont les lignes ont moins de 7 cellules vide la saison stockée, avec un message de succès

**Cause** : `parseSwimRankingsTimes()` saute toute ligne à moins de 7 `td` (`if (cells.length < 7) return;`) **sans la compter dans `ignored`**. Si SwimRankings retire une colonne (par exemple « Pts. »), aucune ligne n'est lue ni comptée. On a `times = []` et `ignored = 0`, donc le refus `unrecognized` ne se déclenche pas. C'est le même scénario que BUG-P2-05 (changement futur du format de SwimRankings), par une autre porte.
**Étapes** (`t_final.py` § A2) : 11 temps de saison stockés → 🔄 → coller `nageur1-saison.html` dont la cellule `<td class="code">` de chaque ligne est retirée → Importer.
**Obtenu** : « ✓ Aucun temps sur la saison 2026-2027 pour l'instant : c'est enregistré. », et `swimtimes_season.data` passe de **11 à 0**. Pour une page PB : « Cette page ne contient aucun temps : rien n'a été modifié » (PB protégé, mais le message est faux). Une **seule** ligne à 6 cellules dans une page PB est écartée sans annonce (« ✓ 38 meilleurs temps importés. ») : c'est contraire à la décision A.
**Attendu** : toute ligne de `table.athleteBest` qui contient des `td` (hors « Lap ») est soit lue, soit comptée dans `ignored`. Le cas « aucune ligne lue » donne alors `unrecognized`. Une vraie saison vide (`nageur2-saison.html`) n'a que la ligne d'en-tête en `th` : elle reste importée comme saison vide. Concrètement, remplacer `if (cells.length < 7) return;` par `if (!cells.length) return;`, après le test « Lap », et compter les lignes à moins de 7 cellules comme ignorées. Ajouter un test : saison à 6 cellules → refus, saison stockée intacte.

### Remarques

- **R-P2-19, faux positifs restants de « plusieurs pages »** : `'</html>'` ou `'<!DOCTYPE html>'` dans une chaîne de script, ou `<!-- </html> -->`, font toujours refuser chaque import de la page. Aucune des pages d'échantillon n'en contient. Le risque est faible ; il est à surveiller pendant la recette réelle, avec R-P2-16.
- **R-P2-20, quelle ligne est ignorée ?** Le message annonce le nombre de lignes, mais pas l'épreuve. Si la ligne ignorée est un PB réel (vieux temps manuel `24.3`), ce PB disparaît de l'app sans que l'utilisateur sache lequel. Suggestion : nommer les épreuves quand elles sont lisibles (« · 1 ligne ignorée : 50m Freestyle 50m (27.80 M) »), ou au moins les écrire en console pour le diagnostic.
- **R-P2-21** : si toutes les lignes sont ignorées, le message dit « Le format de SwimRankings a peut-être changé ». C'est faux pour une saison qui ne contiendrait qu'un DQ ou un relais, mais les pages « Personal bests » de SwimRankings ne listent pas ces cas. Pas d'action.
- **R-P2-01** (`app.js?v=20261001`) est toujours à changer au déploiement. R-P2-11 n'a pas été traité (non annoncé).

### Verdict de livraison de la Phase 2 (hors recette réelle et changement de `app.js?v=`)

**⚠️ LIVRABLE SOUS RÉSERVE DE BUG-P2-08.**

Les points annoncés sont corrigés et vérifiés avec les étapes d'origine :
- BUG-P2-05, 06 et 07 ;
- décisions A et B ;
- R-P2-16 pour les lignes ;
- R-P2-17.

Les points FINA affichés sont ceux de SwimRankings (83/83). La suite est entièrement verte (15/15), et TC-101 à TC-122 ne montrent aucun recul.

Seul BUG-P2-08 reste avant le déploiement. Il réclame une correction de 1 à 2 lignes dans `parseSwimRankingsTimes()`, plus un test. Il complète la protection voulue par BUG-P2-05 : ne jamais vider la saison en silence. Une fois corrigé et son test vert, la Phase 2 est **livrable**, sans nouveau re-test complet : seuls `t_final.py` § A2 et `run_all.sh` sont à rejouer.

Restent ensuite :
1. **Recette réelle** (product owner), avec R-P2-16 et R-P2-19 : aucune page réelle refusée, et plusieurs nageurs dont un avec de vieux temps ; noter les lignes ignorées annoncées.
2. **Changement de `app.js?v=`** (R-P2-01).


> **Suivi du re-test final (2026-10-23)** : BUG-P2-08 corrigé. Une ligne courte qui commence par une épreuve est comptée comme ignorée ; les lignes de détail des temps de passage (présentes dans la page réelle de la nageuse 3) ne le sont pas. R-P2-20 : le message nomme les épreuves ignorées (3 au plus). Vérifié par `t_final.py` (A2 : toutes les variantes à 6 cellules refusées, temps stockés intacts) et par `run_all.sh` (15/15). R-P2-19 (faux positifs « plusieurs pages ») : à surveiller pendant la recette réelle.
