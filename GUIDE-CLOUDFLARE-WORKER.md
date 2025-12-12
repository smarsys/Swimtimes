# 🚀 Guide de déploiement du Cloudflare Worker

## Pourquoi un Worker ?

SwimRankings.net bloque les requêtes depuis les navigateurs (CORS).
Le Cloudflare Worker fait proxy et contourne cette limitation.

**Avantages :**
- ✅ Gratuit (100'000 requêtes/jour)
- ✅ Rapide (edge computing mondial)
- ✅ Pas de serveur à gérer
- ✅ Cache automatique (1h)

---

## 📋 Étapes de déploiement

### 1. Créer un compte Cloudflare (gratuit)

1. Va sur [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Crée un compte avec ton email
3. Pas besoin d'ajouter de domaine !

### 2. Créer le Worker

1. Dans le dashboard, clique sur **Workers & Pages** (menu gauche)
2. Clique sur **Create Application**
3. Clique sur **Create Worker**
4. Donne un nom : `swimrankings-proxy`
5. Clique **Deploy**

### 3. Ajouter le code

1. Après le déploiement, clique sur **Edit code**
2. **Supprime tout** le code existant
3. **Copie-colle** le contenu de `cloudflare-worker.js`
4. Clique **Save and Deploy**

### 4. Récupérer l'URL

Ton Worker est maintenant accessible sur :
```
https://swimrankings-proxy.TONCOMPTE.workers.dev
```

Par exemple : `https://swimrankings-proxy.cristobal.workers.dev`

### 5. Configurer l'app SwimTimes

1. Ouvre `app.js`
2. Modifie la ligne 6 :
```javascript
const SWIMRANKINGS_PROXY_URL = 'https://swimrankings-proxy.TONCOMPTE.workers.dev';
```
3. Redéploie `app.js` sur Jelastic

---

## 🧪 Tester le Worker

Dans ton navigateur, va sur :
```
https://swimrankings-proxy.TONCOMPTE.workers.dev?athleteId=5332548
```

Tu devrais voir un JSON avec les données du nageur.

---

## 📊 Monitoring

Dans le dashboard Cloudflare :
- **Workers & Pages** → ton worker → **Metrics**
- Tu peux voir le nombre de requêtes, les erreurs, etc.

---

## 🔧 Dépannage

### "Error: Missing athleteId parameter"
→ Ajoute `?athleteId=XXXX` à l'URL

### "Error: SwimRankings returned 403"
→ SwimRankings bloque temporairement. Attends quelques minutes.

### L'app affiche une erreur
→ Vérifie que l'URL dans `app.js` est correcte (pas d'espace, pas de `/` à la fin)

---

## 💰 Coûts

| Usage | Coût |
|-------|------|
| < 100'000 req/jour | **Gratuit** |
| > 100'000 req/jour | $0.50 / million |

Pour une app de club de natation, tu resteras largement dans le gratuit !
