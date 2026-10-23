# SwimTimes v2 - Spécifications

## Objectif

Refonte de l'application pour fonctionner en mode mono-utilisateur avec stockage local et synchronisation manuelle des données depuis SwimRankings.

---

## 1. Profil utilisateur

### 1.1 Premier lancement
- Si aucun profil en localStorage → afficher écran de configuration
- Bloquer l'accès aux autres onglets tant que le profil n'est pas configuré

### 1.2 Champs du profil
```javascript
{
  "name": "Ava Hehlen",           // Nom complet
  "swimrankingsId": "5332548",    // ID SwimRankings (depuis l'URL)
  "gender": "F",                   // "M" ou "F"
  "birthYear": "2010",            // Année de naissance (optionnel)
  "club": "Lausanne Aquatique",   // Club (optionnel)
  "createdAt": "2026-10-01T12:00:00Z"
}
```

### 1.3 Écran de configuration
- Titre : "Configuration du profil"
- Champ : Nom complet (requis)
- Champ : ID SwimRankings (requis) + lien aide "Comment trouver mon ID ?"
- Sélecteur : Genre (Homme/Femme)
- Champs optionnels : Année de naissance, Club
- Bouton : "Enregistrer"

### 1.4 Modification du profil
- Icône ⚙️ dans le header (à côté de l'avatar)
- Ouvre le même écran en mode édition
- Bouton "Supprimer mes données" (confirmation requise)

### 1.5 Stockage
```javascript
localStorage.setItem('swimtimes_profile', JSON.stringify(profile));
```

---

## 2. Synchronisation manuelle

### 2.1 Bouton de sync
- Icône 🔄 dans le header
- Tooltip : "Synchroniser mes temps"
- État : normal / succès (✓ pendant 2 s à la fermeture de la fenêtre, si une page a été importée) / badge si la dernière synchronisation date de plus de 7 jours. Pas d'état « erreur » sur 🔄 : les erreurs s'affichent dans la fenêtre (décision US-015)

### 2.2 Contraintes constatées (2026-10-01)

- SwimRankings est protégé par Cloudflare : une requête automatique reçoit un **403 « challenge »**, et sans connexion au compte SwimRankings le défi tourne en boucle. **Avec login, les pages sont accessibles** (validé avec Playwright).
- SwimRankings n'envoie pas d'en-tête CORS : l'app **ne peut pas lire** la page d'un autre site, même si l'utilisateur a passé Cloudflare dans un autre onglet. Le fetch direct, l'iframe et le proxy Cloudflare Worker sont donc écartés.

### 2.3 Solution retenue : copier-coller du code HTML

1. L'utilisateur clique 🔄 (ou « Synchroniser maintenant » dans Paramètres)
2. Une fenêtre s'ouvre avec les instructions et les liens vers ses pages SwimRankings :
   - meilleurs temps : `https://www.swimrankings.net/index.php?page=athleteDetail&athleteId={ID}`
   - temps de la saison : même adresse + `&pbest={année de fin de saison}` (ex. `pbest=2027` pour 2026-2027)
3. Il ouvre le lien, passe Cloudflare et se connecte si besoin
4. Il affiche le code source (Cmd+U / Ctrl+U) et copie tout le HTML
5. Il colle le HTML dans la zone de texte de l'app
6. L'app analyse le HTML (section 4) et stocke les temps en localStorage (section 3)

Limite connue : Safari sur iPhone/iPad n'affiche pas le code source ; la synchronisation se fait alors depuis un ordinateur.

---

## 3. Stockage des données

### 3.1 Structure localStorage

```javascript
// Profil utilisateur
swimtimes_profile: { name, swimrankingsId, gender, ... }

// Personal Bests (all-time)
swimtimes_pb: {
  updated: "2026-10-01T12:00:00Z",
  athleteId: "5332548",     // ID du nageur de la page importée (temps ignorés s'il diffère du profil)
  nation: "SUI",            // lue sur la page SwimRankings (affichée dans Paramètres et la popup)
  data: [
    {
      event: "100m Freestyle",
      distance: 100,
      stroke: "Freestyle",
      course: "50m",
      time: "59.42",
      finaPoints: 659,
      date: "24 May 2026",
      city: "Renens",
      meet: "Meeting de la ville de Renens"
    },
    // ...
  ]
}

// Temps de saison
swimtimes_season: {
  season: "2026-2027",
  updated: "2026-10-01T12:00:00Z",
  data: [
    // même structure que PB
  ]
}

// Temps limites (peut rester en fichier JSON statique ou localStorage)
swimtimes_limits: { ... }
```

### 3.2 Fonctions utilitaires

```javascript
// Sauvegarder
function saveProfile(profile) {
  localStorage.setItem('swimtimes_profile', JSON.stringify(profile));
}

function savePBs(data) {
  localStorage.setItem('swimtimes_pb', JSON.stringify({
    updated: new Date().toISOString(),
    data: data
  }));
}

function saveSeasonTimes(data, season) {
  localStorage.setItem('swimtimes_season', JSON.stringify({
    season: season,
    updated: new Date().toISOString(),
    data: data
  }));
}

// Charger
function getProfile() {
  const stored = localStorage.getItem('swimtimes_profile');
  return stored ? JSON.parse(stored) : null;
}

function getPBs() {
  const stored = localStorage.getItem('swimtimes_pb');
  return stored ? JSON.parse(stored) : null;
}

function getSeasonTimes() {
  const stored = localStorage.getItem('swimtimes_season');
  return stored ? JSON.parse(stored) : null;
}

// Supprimer tout
function clearAllData() {
  localStorage.removeItem('swimtimes_profile');
  localStorage.removeItem('swimtimes_pb');
  localStorage.removeItem('swimtimes_season');
}
```

---

## 4. Parsing HTML SwimRankings

### 4.1 Fonction de parsing (réutiliser la logique existante)

```javascript
function parseSwimRankingsHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const results = [];
  const rows = doc.querySelectorAll('table.athleteBest tr[class^="athleteBest"]');
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 7) return;
    
    const event = cells[0].textContent.trim();
    const course = cells[1].textContent.trim();
    const time = cells[2].textContent.trim();
    const points = cells[3].textContent.trim();
    const date = cells[4].textContent.trim().replace(/\s+/g, ' ');
    const city = cells[5].textContent.trim();
    const meet = cells[6].textContent.trim();
    
    // Ignorer les "Lap" events
    if (event.includes('Lap')) return;
    
    // Parser l'épreuve
    const eventMatch = event.match(/(\d+)m\s+(.+)/);
    if (!eventMatch) return;
    
    results.push({
      event: event,
      distance: parseInt(eventMatch[1]),
      stroke: eventMatch[2],
      course: course,
      time: time,
      finaPoints: parseInt(points) || 0,
      date: date,
      city: city,
      meet: meet
    });
  });
  
  return results;
}
```

---

## 5. Modifications UI

### 5.1 Header (nouvelle structure)

```
+--------------------------------------------------+
| 🏊 SwimTimes           [🔄] [⚙️] [AH]            |
+--------------------------------------------------+
```

- Logo/titre à gauche
- Boutons à droite : Sync, Settings, Avatar

### 5.2 Suppression du sélecteur de nageur

- Plus de dropdown multi-nageurs
- L'avatar affiche les initiales du profil configuré

### 5.3 Onglets (inchangés)

1. Temps limites
2. Progression

### 5.4 Nouvel écran : Paramètres

Accessible via ⚙️, contient :
- Modification du profil
- Dernière synchronisation (date/heure)
- Bouton "Synchroniser maintenant"
- Bouton "Exporter mes données" (JSON)
- Bouton "Supprimer mes données"

---

## 6. États de l'application

### 6.1 Premier lancement (pas de profil)
→ Afficher écran de configuration

### 6.2 Profil configuré, pas de données
→ Afficher message "Aucune donnée. Clique sur 🔄 pour synchroniser." (tutoiement, comme le reste de l'interface)

### 6.3 Profil + données disponibles
→ Affichage normal des onglets

### 6.4 Données obsolètes (> 7 jours)
→ Badge sur le bouton 🔄 + message discret "Dernière sync il y a X jours"

---

## 7. Plan d'implémentation

### Phase 1 : Profil utilisateur
1. Créer l'écran de configuration
2. Implémenter le stockage localStorage
3. Modifier le header (avatar, boutons)
4. Ajouter l'écran paramètres

### Phase 2 : Synchronisation
1. Créer le modal de sync avec instructions
2. Implémenter le parsing HTML côté client
3. Tester avec copier-coller HTML (le fetch direct est écarté, voir 2.2)

### Phase 3 : Adaptation des onglets
1. Modifier le chargement des données (localStorage au lieu de JSON)
2. Adapter les filtres au profil unique
3. Tester tous les cas

### Phase 4 : Polish
1. Messages d'état et feedback
2. Gestion des erreurs
3. Export/import des données
4. PWA manifest update

---

## 8. Migration

### Pour les utilisateurs existants
- Proposer de créer un profil avec les données d'un nageur existant
- Ou repartir de zéro

### Fichiers à supprimer (optionnel)
- `athletes.txt`
- `swimmers-data.json`
- `swimmers-season.json`
- `.github/workflows/*`

### Fichiers à conserver
- `temps-limites.json` (ou migrer en localStorage)
- `index.html`
- `app.js`
