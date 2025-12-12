# 🚀 Guide de Déploiement - SwimTimes sur Jelastic (Infomaniak)

## 📁 Fichiers à déployer

```
swimtimes-app/
├── index.html      ← Application complète
├── manifest.json   ← Pour l'installation PWA
└── icons/          ← Icônes (optionnel)
```

---

## 🌐 Déploiement sur Jelastic Cloud

### Étape 1: Accéder à Jelastic

1. Connecte-toi à [manager.infomaniak.com](https://manager.infomaniak.com)
2. Va dans **Jelastic Cloud** (dans le menu de gauche)
3. Ouvre la **console Jelastic**

---

### Étape 2: Créer un environnement (si pas déjà fait)

Si tu as déjà un environnement avec NGINX (comme pour l'app FINA), passe à l'étape 3.

Sinon, crée un nouvel environnement :

1. Clique sur **New Environment**
2. Sélectionne **NGINX** comme serveur web (onglet "Balancers" ou "App Servers")
3. Configure :
   - **Cloudlets** : 1-2 (suffisant pour une app statique)
   - **Environment name** : `swimtimes` (ou autre)
4. Clique sur **Create**

---

### Étape 3: Uploader les fichiers

#### Option A : Via le File Manager Jelastic

1. Dans ton environnement, clique sur **NGINX** → **Config** (icône dossier)
2. Navigue vers `/var/www/webroot/ROOT/`
3. **Supprime** les fichiers par défaut (index.html de NGINX)
4. **Upload** tes fichiers :
   - Clique sur **Upload** (icône flèche vers le haut)
   - Sélectionne `index.html` et `manifest.json`
5. Clique sur **Save**

#### Option B : Via SFTP/SSH

1. Dans Jelastic, clique sur **Settings** → **SSH Access**
2. Récupère les identifiants SFTP
3. Utilise FileZilla ou un client SFTP :
   ```
   Host: ton-env.jcloud-ver-jpc.ik-server.com
   User: [ton-user]
   Port: 22
   ```
4. Upload dans `/var/www/webroot/ROOT/`

---

### Étape 4: Configurer NGINX (optionnel mais recommandé)

Pour une meilleure performance, modifie la config NGINX :

1. Clique sur **NGINX** → **Config**
2. Ouvre `/etc/nginx/nginx.conf`
3. Dans le bloc `server`, ajoute :

```nginx
# Gzip compression
gzip on;
gzip_types text/html text/css application/javascript application/json;

# Cache pour les fichiers statiques
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

4. Clique sur **Save** puis **Restart Node**

---

### Étape 5: Configurer un domaine personnalisé (optionnel)

#### Sous-domaine Jelastic par défaut :
Ton app est déjà accessible sur :
```
https://swimtimes.jcloud-ver-jpc.ik-server.com/
```

#### Domaine personnalisé :
1. Dans Jelastic, clique sur **Settings** → **Custom Domains**
2. Ajoute ton domaine : `swimtimes.tondomaine.ch`
3. Dans Infomaniak DNS, ajoute un **CNAME** :
   ```
   swimtimes  →  ton-env.jcloud-ver-jpc.ik-server.com
   ```
4. Active **SSL** via Let's Encrypt dans Jelastic

---

## 📱 Installation comme App (PWA)

Une fois déployée, les nageurs peuvent **installer l'app** sur leur téléphone :

### Sur iPhone :
1. Ouvrir Safari → aller sur l'URL de l'app
2. Appuyer sur le bouton **Partager** (carré avec flèche)
3. **Sur l'écran d'accueil**

### Sur Android :
1. Ouvrir Chrome → aller sur l'URL de l'app
2. Menu (3 points) → **Installer l'application**

---

## ✅ Checklist de déploiement

- [ ] Environnement Jelastic créé avec NGINX
- [ ] `index.html` uploadé dans `/var/www/webroot/ROOT/`
- [ ] `manifest.json` uploadé
- [ ] Test de l'URL Jelastic
- [ ] (Optionnel) Domaine personnalisé configuré
- [ ] Test sur mobile
- [ ] Test de l'import SwimRankings avec un ID

---

## 🔄 Mise à jour de l'app

Pour mettre à jour l'app :

1. Modifie `index.html` localement
2. Dans Jelastic → NGINX → Config
3. Navigue vers `/var/www/webroot/ROOT/`
4. Supprime l'ancien `index.html`
5. Upload le nouveau fichier
6. **Pas besoin de restart** pour les fichiers HTML !

💡 **Astuce** : Les utilisateurs devront faire Ctrl+Shift+R pour voir les changements (à cause du cache navigateur).

---

## 🐛 Dépannage

### "Erreur lors du chargement des données"

Le proxy CORS (allorigins.win) peut parfois être lent ou indisponible.
Solutions :
1. Réessayer après quelques secondes
2. Les données sont cachées localement, donc ça marche offline après le premier chargement

### Page blanche / Erreur 404

Vérifier :
1. Le fichier s'appelle bien `index.html` (pas `Index.html`)
2. Il est dans `/var/www/webroot/ROOT/`
3. Les permissions sont correctes (readable)

### L'app ne s'installe pas comme PWA

Vérifier :
1. Le site est bien en HTTPS
2. `manifest.json` est accessible : `https://ton-url/manifest.json`

---

## 📧 Partager avec les nageurs

Message type à envoyer :

```
🏊 Nouvelle app SwimTimes disponible !

Compare tes temps avec les temps limites Swiss Swimming :
👉 https://swimtimes.jcloud-ver-jpc.ik-server.com/

Comment ça marche :
1. Entre ton ID SwimRankings (dans l'URL de ta page swimrankings.net)
2. L'app charge automatiquement tous tes temps
3. Compare avec RSR, Champ. Suisse, Elite, et même les JO !

💡 Astuce : Ajoute l'app sur ton écran d'accueil pour y accéder facilement !
```

---

## 💰 Coût Jelastic

- **Environnement arrêté** : 0 CHF
- **1-2 cloudlets** : ~2-5 CHF/mois (très faible trafic)
- **Mise en veille auto** : Configure "Auto Hibernate" pour économiser
