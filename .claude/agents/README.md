# Agents SwimTimes

## Organisation agentique

Ce dossier contient les personas/agents pour le développement de SwimTimes avec Claude Code.

## Agents disponibles

| Agent | Fichier | Rôle |
|-------|---------|------|
| 🎯 PM | `pm.md` | Product Manager - User stories, priorisation |
| 💻 Dev | `dev.md` | Développeur - Implémentation |
| 🧪 QA | `qa.md` | Testeur - Tests, validation |
| 🎨 UX | `ux.md` | Designer - Interfaces, parcours |
| 👀 Reviewer | `reviewer.md` | Code Review - Qualité, sécurité |

## Utilisation dans Claude Code

### Charger un agent
```
Lis .claude/agents/pm.md et agis en tant que PM
```

### Exemples de commandes

**Product Manager :**
```
@pm Crée les user stories pour la Phase 1 (profil utilisateur)
@pm Priorise le backlog
@pm Définis les critères d'acceptation pour US-001
```

**Développeur :**
```
@dev Implémente l'écran de configuration du profil
@dev Ajoute la fonction saveProfile() dans app.js
@dev Corrige le bug d'affichage sur mobile
```

**QA :**
```
@qa Écris les cas de test pour l'écran de profil
@qa Liste les edge cases pour la synchronisation
@qa Valide que US-001 est complète
```

**UX :**
```
@ux Conçois le wireframe de l'écran de configuration
@ux Propose le user flow de synchronisation
@ux Définis les états de l'écran de sync
```

**Reviewer :**
```
@reviewer Review les modifications de app.js
@reviewer Vérifie la sécurité du parsing HTML
@reviewer Checklist avant merge
```

## Workflow recommandé

```
1. @pm    → Créer les user stories de la feature
2. @ux    → Concevoir l'interface
3. @dev   → Implémenter
4. @qa    → Tester
5. @reviewer → Valider le code
6. Merge & Deploy
```

## Bonnes pratiques

1. **Un agent à la fois** : Éviter de mélanger les rôles dans une même requête
2. **Contexte clair** : Toujours référencer la user story ou le fichier concerné
3. **Itérations courtes** : Petites tâches, feedback rapide
4. **Documentation** : Mettre à jour CLAUDE.md si les conventions évoluent
