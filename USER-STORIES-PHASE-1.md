# SwimTimes v2 – User Stories Phase 1 : Profil utilisateur

Référence : `SPECS-V2.md` (sections 1, 3.2, 5.1, 5.2, 5.4, 6.1, 6.2, 8)

## Périmètre

**Inclus** : création, stockage, modification et suppression du profil ; nouveau header ; écran Paramètres ; migration du profil existant.

**Hors périmètre** (phases suivantes) :
- Synchronisation et parsing HTML → Phase 2 (le bouton 🔄 est posé mais inactif)
- Chargement des temps depuis localStorage → Phase 3
- Export JSON, badge « données obsolètes » → Phase 4

## Vue d'ensemble

| ID | Titre | Priorité | Estim. | Dépend de |
|----|-------|----------|--------|-----------|
| US-001 | Stockage du profil en localStorage | Must | S | — |
| US-002 | Configuration du profil au premier lancement | Must | M | US-001 |
| US-003 | Aide « Comment trouver mon ID ? » | Should | S | US-002 |
| US-004 | Nouveau header (avatar, ⚙️, 🔄) | Must | M | US-001 |
| US-005 | Écran Paramètres | Must | M | US-004 |
| US-006 | Modification du profil | Must | S | US-002, US-005 |
| US-007 | Suppression de mes données | Must | S | US-005 |
| US-008 | Migration du profil existant | Should | S | US-001 |
| US-009 | Affichage des temps pendant la transition | Should | S | US-001 |

Ordre d'implémentation conseillé : 001 → 002 → 004 → 005 → 006 → 007 → 008 → 009 → 003

---

## US-001 : Stockage du profil en localStorage

**En tant que** nageur
**Je veux** que mon profil soit enregistré dans mon navigateur
**Afin de** ne pas avoir à le ressaisir à chaque visite

### Critères d'acceptation
- [x] **Given** un profil valide, **When** `saveProfile(profile)` est appelée, **Then** il est stocké sous la clé `swimtimes_profile` au format JSON de la spec 1.2
- [x] **Given** un profil stocké, **When** `getProfile()` est appelée, **Then** elle retourne l'objet profil
- [x] **Given** aucun profil ou un JSON corrompu, **When** `getProfile()` est appelée, **Then** elle retourne `null` sans lever d'erreur
- [x] **Given** des données SwimTimes stockées, **When** `clearAllData()` est appelée, **Then** les clés `swimtimes_profile`, `swimtimes_pb` et `swimtimes_season` sont supprimées
- [x] **Given** localStorage indisponible (navigation privée, quota plein), **When** on enregistre, **Then** un message d'erreur explicite s'affiche au lieu d'un échec silencieux
- [x] `createdAt` est fixé à la création et ne change plus ; un champ `updatedAt` est mis à jour à chaque modification

### Notes techniques
- Fonctions définies dans SPECS-V2 §3.2, à placer dans `app.js`
- Envelopper chaque accès à localStorage dans un try/catch
- Les clés actuelles (`swimmer_profile`, `athlete_id`) sont traitées par US-008

### Priorité : Must
### Estimation : S

---

## US-002 : Configuration du profil au premier lancement

**En tant que** nouveau nageur
**Je veux** renseigner mon profil dès ma première visite
**Afin de** voir mes temps et mes qualifications

### Critères d'acceptation
- [x] **Given** aucun profil en localStorage, **When** j'ouvre l'app, **Then** l'écran « Configuration du profil » s'affiche
- [x] **Given** l'écran de configuration, **Then** les onglets Temps et Progression sont inaccessibles (masqués ou désactivés)
- [x] Le formulaire contient : Nom complet (requis), ID SwimRankings (requis), Genre Homme/Femme (requis), Année de naissance (optionnel), Club (optionnel)
- [x] **Given** un champ requis vide ou ne contenant que des espaces, **When** je clique « Enregistrer », **Then** un message d'erreur s'affiche sous le champ et rien n'est enregistré
- [x] **Given** un ID SwimRankings qui ne contient pas que des chiffres, **Then** il est refusé (« L'ID ne contient que des chiffres »)
- [x] **Given** une année de naissance renseignée, **Then** elle doit être comprise entre 1920 et l'année courante
- [x] **Given** un formulaire valide, **When** je clique « Enregistrer », **Then** le profil est stocké (US-001), les onglets se débloquent et l'onglet Temps s'affiche
- [x] **Given** un profil sans données de temps, **Then** le message de la spec 6.2 s'affiche : « Aucune donnée. Clique sur 🔄 pour synchroniser. » (tutoiement, décidé le 2026-10-01)
- [x] Les accents et caractères spéciaux du nom sont conservés et affichés correctement
- [x] Le formulaire est utilisable au clavier, chaque champ a un `<label>` et les zones tactiles font au moins 44px

### Notes techniques
- Le formulaire remplace le contenu actuel de `renderProfileTab()` (sélecteur de nageur)
- **Sécurité** : le nom et le club sont saisis par l'utilisateur et injectés via `innerHTML` → les échapper systématiquement (fonction `escapeHtml()`)
- Genre : le profil stocke `"M"`/`"F"` (spec) mais `#select-gender` utilise `"Male"`/`"Female"` → prévoir la conversion
- Pré-remplir le genre de `#select-gender` à partir du profil après l'enregistrement
- Le bouton « Enregistrer » ne doit pas créer de doublon sur double-clic

### Avancement
- Implémentée. Déjà couverts en partie par cette US : initiales du profil dans le header (US-004), formulaire en mode édition avec Annuler depuis l'onglet Profil (US-006), temps lus depuis `swimmers-data.json` via l'ID du profil (US-009)
- Le message 6.2 mentionne 🔄, qui n'apparaîtra qu'avec US-004 (désactivé) puis la Phase 2
- Les utilisateurs v1 voient le formulaire vide jusqu'à US-008 (leurs anciennes clés sont conservées)

### Priorité : Must
### Estimation : M

---

## US-003 : Aide « Comment trouver mon ID ? »

**En tant que** nouveau nageur
**Je veux** une explication pour trouver mon ID SwimRankings
**Afin de** remplir le formulaire sans chercher ailleurs

### Critères d'acceptation
- [x] Un lien « Comment trouver mon ID ? » apparaît sous le champ ID
- [x] **When** je clique dessus, **Then** une aide courte s'affiche sans quitter le formulaire, sans perdre ce que j'ai déjà saisi
- [x] L'aide explique : chercher son nom sur swimrankings.net → ouvrir sa page → l'ID est le nombre après `athleteId=` dans l'URL, avec un exemple
- [x] **Given** que je colle l'URL complète de ma page SwimRankings dans le champ ID, **Then** l'ID est extrait automatiquement

### Notes techniques
- Extraction : regex `/athleteId=(\d+)/`
- Mention d'aide actuelle dans `GUIDE-INSTALLATION.md` à mettre à jour

### Avancement
- Implémentée. L'aide se déplie sous le champ (bouton `aria-expanded`). Une adresse collée ou tapée contenant `athleteId=` est remplacée par l'ID, avec le message « ✓ ID extrait de l'adresse »
- Ajout : l'ID est limité à 10 chiffres (remarque QA R-11)
- Après QA : l'extraction se fait au collage, ou à la sortie du champ si l'adresse est tapée. Elle reconnaît aussi les adresses encodées et longues. Échap dans l'aide dépliée la replie.

### Priorité : Should
### Estimation : S

---

## US-004 : Nouveau header (avatar, ⚙️, 🔄)

**En tant que** nageur
**Je veux** voir mon identité et accéder aux réglages depuis le header
**Afin de** savoir quel profil est actif et le gérer facilement

### Critères d'acceptation
- [x] Le header suit la structure de la spec 5.1 : logo/titre à gauche ; boutons 🔄, ⚙️ et avatar à droite
- [x] L'avatar affiche les initiales du profil : première lettre du premier et du dernier mot du nom (« Ava Hehlen » → « AH » ; nom d'un seul mot → une seule lettre), en majuscules
- [x] **When** je clique sur l'avatar, **Then** la popup d'infos s'ouvre avec les données du profil (nom, club, âge si l'année est connue, ID)
- [x] **When** je clique sur ⚙️, **Then** l'écran Paramètres s'ouvre (US-005)
- [x] Le bouton 🔄 est visible mais désactivé, avec le tooltip « Synchronisation disponible prochainement » (activé en Phase 2)
- [x] **Given** l'écran de configuration initial (pas de profil), **Then** ⚙️, 🔄 et l'avatar sont masqués
- [x] Le sélecteur multi-nageurs n'existe plus (spec 5.2)
- [x] Le header reste lisible à 375px de large ; chaque bouton fait au moins 44×44px et a un `aria-label`

### Notes techniques
- `updateHeaderAvatar()` utilise aujourd'hui `swimmer.firstName`/`lastName` → calculer les initiales depuis `profile.name`
- `showSwimmerPopup()` injecte `fullName` et `club` via `innerHTML` → échapper (cf. US-002)
- Supprimer `loadSwimmerSelector()` et `handleSwimmerSelect()` une fois US-008 et US-009 en place

### Avancement
- Implémentée. ⚙️ ouvre provisoirement l'onglet Profil, jusqu'à l'écran Paramètres (US-005)
- 🔄 utilise `aria-disabled` plutôt que `disabled` : le tooltip reste visible au survol, et un tap sur mobile affiche le toast « Synchronisation disponible prochainement »

### Priorité : Must
### Estimation : M

---

## US-005 : Écran Paramètres

**En tant que** nageur
**Je veux** un écran regroupant mes réglages
**Afin de** gérer mon profil et mes données au même endroit

### Critères d'acceptation
- [x] **When** je clique sur ⚙️, **Then** l'écran Paramètres s'affiche
- [x] Il contient, dans l'ordre : le résumé du profil + « Modifier le profil » (US-006) ; la dernière synchronisation (« Jamais synchronisé » pour l'instant) ; « Synchroniser maintenant » (désactivé, Phase 2) ; « Exporter mes données » (désactivé, Phase 4) ; « Supprimer mes données » (US-007), visuellement séparé, en rouge
- [x] Un bouton retour ou la touche Échap ramène à l'onglet précédent
- [x] Sur mobile, l'écran s'affiche en plein écran ou en bottom sheet (guidelines UX)

### Notes techniques
- Décision à prendre (UX) : l'onglet « Profil » actuel devient-il l'écran Paramètres, ou disparaît-il au profit de ⚙️ ? La spec 5.3 ne liste plus que 2 onglets → **recommandation PM : supprimer l'onglet Profil** et déplacer l'affichage des PB dans Paramètres ou dans la popup avatar
- Les boutons désactivés indiquent la phase prévue (« Bientôt disponible ») plutôt que d'être masqués

### Avancement
- Implémentée. **Décision** : l'onglet Profil est supprimé ; les records personnels sont dans Paramètres (section repliable)
- Le bouton « Supprimer mes données » est en place mais inactif (« Bientôt ») jusqu'à US-007 ; il n'est pas rouge (fond déjà rouge) mais sombre, dans une zone séparée
- « Dernière synchronisation » affiche « Jamais synchronisé » (Phase 2) ; une ligne « Temps affichés » indique la date des données du club
- Le bouton « Actualiser » de l'ancien onglet Profil est retiré : les données sont rechargées à chaque ouverture de l'app

### Priorité : Must
### Estimation : M

---

## US-006 : Modification du profil

**En tant que** nageur
**Je veux** modifier mon profil
**Afin de** corriger une erreur ou mettre à jour mon club

### Critères d'acceptation
- [x] **When** je clique « Modifier le profil » dans Paramètres, **Then** le formulaire d'US-002 s'ouvre en mode édition, pré-rempli
- [x] Le titre devient « Modifier le profil » et un bouton « Annuler » est présent
- [x] Les mêmes validations qu'US-002 s'appliquent
- [x] **When** j'enregistre, **Then** le header (initiales), la popup et les onglets reflètent immédiatement les changements, sans recharger la page
- [x] **When** j'annule, **Then** aucune modification n'est enregistrée
- [x] `createdAt` est conservé et `updatedAt` est mis à jour
- [x] **Given** que je change l'ID SwimRankings, **Then** un avertissement indique que les temps synchronisés appartiennent à l'ancien ID et seront supprimés (`swimtimes_pb`, `swimtimes_season`)

### Notes techniques
- Réutiliser la même fonction de rendu du formulaire avec un paramètre `mode: 'create' | 'edit'`

### Avancement
- Implémentée. Ajouts issus de la maquette UX et de la QA : bouton ← et touche Échap pour annuler, « Enregistrer » inactif tant que rien ne change, toast « ✓ Profil mis à jour », focus sur le titre à l'ouverture
- Les temps synchronisés ne sont supprimés que si l'ID change réellement
- **Décision (2026-10-01)** : Annuler, ← ou Échap avec des modifications non enregistrées demandent « Abandonner les modifications ? » ; sans modification, retour direct. Le focus revient sur « Modifier le profil ».
- L'avertissement de changement d'ID ne s'affiche que pour un ID valide. Il est annoncé et relié au champ seulement quand il est visible.

### Priorité : Must
### Estimation : S

---

## US-007 : Suppression de mes données

**En tant que** nageur
**Je veux** supprimer toutes mes données de l'app
**Afin de** repartir de zéro ou libérer l'appareil

### Critères d'acceptation
- [x] **When** je clique « Supprimer mes données », **Then** une confirmation s'affiche dans l'app avec un texte explicite (« Votre profil et vos temps seront supprimés de cet appareil. Cette action est irréversible. ») et les boutons « Annuler » / « Supprimer »
- [x] **When** je confirme, **Then** `clearAllData()` est appelée, ainsi que la suppression des anciennes clés (`swimmer_profile`, `athlete_id`)
- [x] Après suppression, l'écran de configuration initial s'affiche (US-002)
- [x] **When** j'annule (bouton ou Échap), **Then** rien n'est supprimé
- [x] Le focus clavier est piégé dans la confirmation tant qu'elle est ouverte

### Notes techniques
- Préférer une confirmation dans la page plutôt que `confirm()` natif, pour rester cohérent avec le design
- Ne pas supprimer `temps-limites.json` (fichier statique, partagé)

### Avancement
- Implémentée avec un `<dialog>` modal (bottom sheet sur mobile). Le focus est d'abord placé sur « Annuler », le choix sûr, et Tab boucle sur les deux boutons
- Texte au tutoiement (« Ton profil et tes temps… »), comme le reste de l'interface
- `clearAllData()` supprime aussi les clés v1 ; les autres données du navigateur ne sont pas touchées. Si le stockage est bloqué, une erreur s'affiche dans la confirmation
- Après QA : la confirmation est partagée (suppression, abandon, repartir de zéro). Ses clics sont ignorés pendant 400 ms après l'ouverture, et « Annuler » est en bas : un double tap ne supprime plus rien. Elle est centrée au-delà de 480 px. Le profil est supprimé en dernier, et plus aucune donnée de l'ancien profil ne reste dans la page.

### Priorité : Must
### Estimation : S

---

## US-008 : Migration du profil existant

**En tant que** nageur qui utilisait déjà SwimTimes v1
**Je veux** retrouver mon profil sans tout ressaisir
**Afin de** passer à la v2 sans friction

### Critères d'acceptation
- [x] **Given** une clé `swimmer_profile` (v1) et aucune clé `swimtimes_profile`, **When** j'ouvre l'app, **Then** le formulaire de configuration s'affiche pré-rempli avec mon nom, ID, genre, année de naissance et club
- [x] Un message indique « Nous avons retrouvé votre profil, vérifiez-le et enregistrez »
- [x] **When** j'enregistre, **Then** le profil v2 est créé et les clés `swimmer_profile` et `athlete_id` sont supprimées
- [x] Je peux aussi choisir « Repartir de zéro » (formulaire vide, anciennes clés supprimées)
- [x] **Given** une clé `swimmer_profile` corrompue, **Then** l'écran de configuration vide s'affiche, sans erreur

### Notes techniques
- Correspondance v1 → v2 : `fullName` → `name`, `id` → `swimrankingsId`, `gender` `"Female"`/`"Male"` → `"F"`/`"M"`, `yearOfBirth` → `birthYear`, `club` → `club`
- Spec §8 : « Proposer de créer un profil avec les données d'un nageur existant ou repartir de zéro »

### Avancement
- Implémentée. Message au tutoiement : « 👋 On a retrouvé ton profil. Vérifie tes infos et enregistre. » (maquette UX)
- Les champs manquants du profil v1 sont signalés d'emblée, avec le focus sur le premier. Si un profil v2 invalide existe, il est prioritaire sur la v1
- Après review : le nom est repris au format « Prénom Nom ». SwimRankings fournit `fullName` = « HEHLEN, Ava », donc on utilise `firstName` + `lastName` (nom en majuscules remis en casse normale). `athlete_id` est lu en texte brut.
- « Repartir de zéro » demande confirmation. Les clés v1 sont supprimées dès qu'un profil v2 valide existe.

### Priorité : Should
### Estimation : S

---

## US-009 : Affichage des temps pendant la transition

**En tant que** nageur déjà présent dans `swimmers-data.json`
**Je veux** continuer à voir mes temps après avoir créé mon profil
**Afin que** l'app reste utilisable avant la livraison de la synchronisation (Phase 2) et du stockage local des temps (Phase 3)

### Critères d'acceptation
- [x] **Given** un profil dont l'ID existe dans `swimmers-data.json` / `swimmers-season.json`, **Then** les onglets Temps et Progression affichent ses PB et ses temps de saison comme aujourd'hui
- [x] **Given** un profil dont l'ID n'y est pas, **Then** le message de la spec 6.2 s'affiche
- [x] Le profil (nom, genre, club) affiché provient de `swimtimes_profile` et non du fichier JSON

### Notes techniques
- Pont temporaire : le chargement des temps reste sur `fetchSwimmerData(profile.swimrankingsId)`, remplacé en Phase 3 par `getPBs()` / `getSeasonTimes()`
- Marquer le code concerné `// TODO Phase 3` pour faciliter son retrait

### Avancement
- Réalisée en même temps qu'US-002 et consolidée après la QA : états chargement / aucune donnée / erreur réseau, délai maximal de 8 s. Code à retirer en Phase 3 marqué `TODO Phase 3`

### Priorité : Should
### Estimation : S

---

## Questions ouvertes

1. ~~**Onglet Profil**~~ : supprimé (décidé le 2026-10-01)
2. ~~**US-009**~~ : l'app reste fonctionnelle entre les phases (US-009 réalisée)
3. ~~**Avatar**~~ : la popup d'infos est conservée, ⚙️ ouvre les Paramètres
