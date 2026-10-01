# UX – Écran de configuration du profil

Couvre : US-002 (création), US-003 (aide ID), US-006 (édition), US-008 (migration)
Référence : `SPECS-V2.md` §1.3, `USER-STORIES-PHASE-1.md`

> **Charte visuelle** : `ux.md` indique un bleu `#2196F3`, mais l'app réelle utilise la charte Lausanne Aquatique : dégradé rouge `--primary #E31E24` → `--primary-dark #B01519`, texte blanc, cartes `rgba(255,255,255,.1)`. Cet écran suit **la charte réelle** et réutilise les composants existants de `index.html` (`.card`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-hint`, `.btn-primary`, `.btn-secondary`, `.help-box`). → Charte confirmée ; `ux.md` et `dev.md` corrigés.

---

## Écran : Configuration du profil

### Objectif utilisateur
Se présenter à l'app en moins d'une minute (nom, ID SwimRankings, genre) pour accéder à ses temps et qualifications.

### Principes
- **Un seul écran, sans étapes** : 3 champs requis seulement, un assistant en plusieurs étapes serait plus lourd que le formulaire
- **Requis d'abord, optionnel ensuite** : les champs optionnels sont regroupés et clairement marqués
- **L'ID est le seul point difficile** : l'aide est intégrée au champ, pas renvoyée vers une autre page

---

### Wireframe – Mode création (premier lancement)

```
+----------------------------------------+
| [LA]        SwimTimes                  |  ← header sans 🔄 ⚙️ avatar
+----------------------------------------+
|  (pas de barre d'onglets)              |
|                                        |
|               ( 🏊 )                   |  ← .profile-avatar 80px
|                                        |
|      Configuration du profil           |  ← h1, 24px bold
|  Quelques infos pour retrouver tes     |
|  temps sur SwimRankings.               |  ← opacity .7
|                                        |
| +------------------------------------+ |
| | NOM COMPLET *                      | |
| | [ Ava Hehlen                     ] | |
| |                                    | |
| | ID SWIMRANKINGS *                  | |
| | [ 5332548                        ] | |  ← inputmode="numeric"
| | Le nombre dans l'URL de ta page.   | |  ← .form-hint
| | ⓘ Comment trouver mon ID ?        | |  ← bouton-lien, ouvre l'aide
| |                                    | |
| | GENRE *                            | |
| | +---------------+---------------+  | |
| | |    Femme      |    Homme      |  | |  ← segmented control
| | +---------------+---------------+  | |
| +------------------------------------+ |
|                                        |
| +------------------------------------+ |
| | Optionnel                          | |  ← sous-titre 13px, opacity .6
| |                                    | |
| | ANNÉE DE NAISSANCE                 | |
| | [ 2010                           ] | |
| |                                    | |
| | CLUB                               | |
| | [ Lausanne Aquatique             ] | |  ← pré-rempli par défaut
| +------------------------------------+ |
|                                        |
| [          Enregistrer               ] |  ← .btn-primary (blanc / texte rouge)
|                                        |
|  🔒 Tes données restent sur cet        |
|     appareil.                          |  ← 12px, opacity .6
+----------------------------------------+
```

### Wireframe – Aide « Comment trouver mon ID ? » (dépliée sous le champ)

```
| ID SWIMRANKINGS *                      |
| [                                    ] |
| ⓘ Comment trouver mon ID ?   ▲        |
| +------------------------------------+ |
| | 1. Va sur swimrankings.net ↗       | |  ← target="_blank"
| | 2. Recherche ton nom               | |
| | 3. Ouvre ta page nageur            | |
| | 4. Copie le nombre après           | |
| |    athleteId= dans l'URL           | |
| |                                    | |
| |  …athleteId=5332548                | |  ← monospace, ID surligné
| |              ‾‾‾‾‾‾‾               | |
| | 💡 Tu peux aussi coller l'URL      | |
| |    complète, on extrait l'ID.      | |
| +------------------------------------+ |  ← .help-box
```

### Wireframe – Mode édition (depuis Paramètres, US-006)

```
+----------------------------------------+
| ←  Modifier le profil                  |  ← bouton retour 44px
+----------------------------------------+
|  (mêmes champs, pré-remplis,           |
|   sans avatar ni texte d'intro)        |
|                                        |
| [          Enregistrer               ] |  ← désactivé tant que rien ne change
| [            Annuler                 ] |  ← .btn-secondary
+----------------------------------------+
```

### Variante – Migration v1 (US-008)

Bandeau en tête de formulaire, formulaire pré-rempli :

```
| +------------------------------------+ |
| | 👋 On a retrouvé ton profil        | |
| | Vérifie tes infos et enregistre.   | |
| | [ Repartir de zéro ]               | |  ← lien discret
| +------------------------------------+ |
```

---

### Éléments

1. **Nom complet** : `<input type="text" autocomplete="name" autocapitalize="words" maxlength="80">`. Vide par défaut, placeholder « Prénom Nom ». Les espaces en début et fin sont supprimés.
2. **ID SwimRankings** : `<input type="text" inputmode="numeric" maxlength="200">`. On évite `type="number"` (flèches, notation scientifique, perte des zéros). **Au collage**, si la valeur contient `athleteId=(\d+)`, seul l'ID est gardé et un message s'affiche brièvement : « ✓ ID extrait de l'URL ». Police monospace, comme pour les temps.
3. **Aide ID** : `<button type="button" aria-expanded aria-controls>` qui déplie et replie la `.help-box`. Elle est repliée par défaut et le texte déjà saisi est conservé.
4. **Genre** : deux boutons radio stylés en segmented control (`<fieldset>` + `<legend>`, `<input type="radio">`). **Aucun choix par défaut**, pour forcer un choix conscient puisqu'il détermine les temps limites. Bouton sélectionné : fond blanc, texte rouge.
5. **Année de naissance** : `<input type="text" inputmode="numeric" maxlength="4" placeholder="ex. 2010">`. Valeur acceptée : de 1920 à l'année courante.
6. **Club** : texte libre, pré-rempli « Lausanne Aquatique » (contexte du club, modifiable).
7. **Enregistrer** : `.btn-primary`, **toujours actif** en création. Si on le désactive, l'utilisateur ne sait pas ce qui manque ; on valide plutôt au clic. Au clic, le bouton est désactivé pendant l'enregistrement pour éviter le double-clic.
8. **Mention confidentialité** : rassure sur le stockage local.

---

### Validation et erreurs

**Moment de la validation** : à la sortie d'un champ (`blur`) une fois qu'il a été touché, et sur tous les champs au clic sur « Enregistrer ». On ne valide jamais pendant la frappe.

**Style d'erreur** : le rouge est la couleur de fond, donc une erreur rouge serait invisible. L'erreur combine :
- une bordure de champ blanche de 2px (au lieu de `rgba(255,255,255,.2)`)
- un message sous le champ dans une pastille claire : fond `rgba(0,0,0,.25)`, texte blanc, icône ⚠️
- `aria-invalid="true"` et `aria-describedby` pointant vers le message

Au clic sur « Enregistrer » avec des erreurs, le focus et le défilement vont au **premier champ en erreur**.

| Champ | Condition | Message |
|-------|-----------|---------|
| Nom | vide / espaces | ⚠️ Indique ton nom complet |
| ID | vide | ⚠️ L'ID SwimRankings est nécessaire pour retrouver tes temps |
| ID | pas que des chiffres | ⚠️ L'ID ne contient que des chiffres – voir « Comment trouver mon ID ? » |
| Genre | aucun choix | ⚠️ Choisis un genre (il détermine les temps limites) |
| Année | hors 1920–année courante | ⚠️ Année invalide (ex. 2010) |

---

### États

- **État vide** (premier lancement) : formulaire vide, sauf Club pré-rempli. Pas d'onglets ; header réduit au logo et au titre.
- **État pré-rempli** (migration ou édition) : champs remplis ; en migration, bandeau 👋.
- **État erreur de validation** : voir tableau ci-dessus.
- **État chargement** : bouton « ⏳ Enregistrement… », désactivé. C'est quasi instantané (localStorage), mais l'état évite le double-clic.
- **État erreur de stockage** (localStorage bloqué ou plein) : `.error-box` au-dessus du bouton : « ✗ Impossible d'enregistrer sur cet appareil. Vérifie que tu n'es pas en navigation privée. » Le formulaire garde ses valeurs.
- **État succès** :
  - création : le bouton affiche « ✓ C'est parti ! » pendant 600 ms, puis on passe à l'onglet **Temps** avec la barre d'onglets qui apparaît en fondu, et l'avatar et les boutons du header apparaissent
  - édition : retour aux Paramètres avec un toast « ✓ Profil mis à jour » pendant 2 s
- **Avertissement changement d'ID** (édition, US-006) : sous le champ ID, quand sa valeur diffère de l'ID enregistré : « ⚠️ Les temps synchronisés de l'ancien ID seront supprimés. »

---

### Micro-interactions

- Ouverture et fermeture de l'aide ID : déploiement en hauteur, 200 ms, ease-out
- Collage d'une URL : le champ montre brièvement l'URL, puis le texte se remplace par l'ID avec un léger flash (fond `rgba(255,255,255,.25)` → normal, 400 ms)
- Segmented control : le fond blanc glisse d'une option à l'autre (150 ms)
- Erreur au clic sur Enregistrer : défilement doux vers le premier champ en erreur, sans animation de secousse (désagréable et peu accessible)
- `prefers-reduced-motion` : toutes ces animations sont désactivées

---

### Accessibilité

- Ordre de tabulation : Nom → ID → Aide → Femme / Homme (flèches) → Année → Club → Enregistrer
- Chaque champ a un vrai `<label for>`, et l'astérisque est doublé d'un `aria-required="true"`
- Le message de succès de l'extraction d'ID est annoncé via `aria-live="polite"`
- Contraste (corrigé après la QA, BUG-07) : le blanc pur sur `#E31E24` ne fait que 4,7:1, et une carte claire (`rgba(255,255,255,.1)`) le fait tomber à 4,3:1. L'ancienne règle « opacité `.75` » était donc fausse. Règle retenue : surfaces **plus sombres** que le fond (`--surface: rgba(0,0,0,.15)`), texte secondaire à opacité **≥ .9** sur ces surfaces, **1** directement sur le fond rouge. Vérifié par un audit automatique sur tous les écrans (0 texte sous 4,5:1)
- Zoom réactivé : `user-scalable=no, maximum-scale=1.0` retirés du `viewport` (WCAG 1.4.4). Les champs sont déjà en `font-size:18px`, ce qui suffit à éviter le zoom automatique d'iOS
- Zones tactiles : les champs et boutons existants font environ 50px de haut, OK ; le lien d'aide et les options de genre doivent aussi atteindre 44px

---

### Notes pour le Dev

- Une seule fonction `renderProfileForm({ mode: 'create' | 'edit', initial })`, utilisée pour les trois variantes
- Remplacer le `.header` en grille `40px 1fr 40px` par un header flex, pour accueillir 3 boutons à droite (US-004)
- Nouveaux composants CSS : `.segmented`, `.segmented__option`, `.field-error`, `.form-input--invalid`, `.notice` (bandeau migration), `.toast`
- Échapper toutes les valeurs réinjectées dans le HTML (nom, club), et utiliser `.value` pour pré-remplir les champs plutôt qu'un attribut `value="${...}"`
