# Récapitulatif des Modifications - Fork Obsidian Tasks (Priorités en Tags & Due Dates en Daily Notes)

## 1. Contexte et Objectifs de la Demande
Le projet est une version personnalisée (fork) du plugin Obsidian Tasks. L'objectif était de modifier le format de sérialisation/désérialisation des tâches selon les spécifications suivantes :

1. **Priorités sous forme de Tags** (au lieu d'émojis `🔺`, `⏫`, `🔼`, `🔽`, `⏬`) :
   - `#priority/highest` (Priorité la plus haute)
   - `#priority/high` (Priorité haute)
   - `#priority/medium` (Priorité moyenne)
   - `#priority/low` (Priorité basse)
   - `#priority/lowest` (Priorité la plus basse)
   - Aucune priorité : aucun tag.

2. **Date d'échéance (Due Date) au format lien Daily Note** (au lieu de `📅 YYYY-MM-DD`) :
   - Format sous forme de lien wikilink en fin de tâche, par exemple : `[[27-07-2026 lu]]`.
   - Exemple complet de tâche : `- [ ] tache #priority/low [[27-07-2026 lu]]`.

3. **Configurabilité dans les paramètres (Settings)** :
   - Sélection du format de tâche dans le menu déroulant des formats.
   - Format de date des Daily Notes personnalisable dans les paramètres (par défaut `DD-MM-YYYY ddd`, modifiable en `YYYY-MM-DD`, `DD-MM-YYYY`, etc.).

4. **Maintenabilité et compatibilité avec les mises à jour upstream** :
   - Structurer les modifications de manière propre et isolée afin de faciliter les ré-alignements futurs (`git merge upstream/main` ou `git rebase`) avec les nouveautés du dépôt officiel `obsidian-tasks`.

---

## 2. Architecture & Choix de Conception pour la Fusion Upstream

Pour garantir que les futurs `git merge` avec le dépôt upstream `obsidian-tasks-group/obsidian-tasks` se déroulent avec un minimum de conflits de fusion (merge conflicts), la stratégie suivante a été appliquée :

- **Pattern Strategy (Isolation du Serializer)** :
  Plutôt que d'altérer la logique interne de `DefaultTaskSerializer.ts`, une nouvelle classe dédiée `TagAndDailyNoteTaskSerializer` a été créée dans son propre fichier ([src/TaskSerializer/TagAndDailyNoteTaskSerializer.ts](file:///C:/Users/melos/Documents/obsidian-tasks/src/TaskSerializer/TagAndDailyNoteTaskSerializer.ts)).
- **Utilisation des points d'extension existants** :
  Obsidian Tasks gère les formats de tâches via la map `TASK_FORMATS` et l'interface `TaskSerializer`. Le nouveau format `tagAndDailyNote` est enregistré dans `TASK_FORMATS` dans [src/Config/Settings.ts](file:///C:/Users/melos/Documents/obsidian-tasks/src/Config/Settings.ts).
- **Modifications minimales des fichiers cœurs (Upstream Core Files)** :
  Les fichiers existants n'ont reçu que des ajouts marqués par le commentaire `/* FORK CUSTOMIZATION */` ou des ajustements mineurs d'accessibilité (`private` -> `protected`).

---

## 3. Détail des Fichiers Créés et Modifiés

### A. Nouveau Fichier : `src/TaskSerializer/TagAndDailyNoteTaskSerializer.ts`

- **Rôle** : Implémente la sérialisation et la désérialisation spécifique pour les priorités en tags et les due dates en liens Daily Notes.
- **Logique de sérialisation (`serialize` / `componentToString`)** :
  - Convertit la priorité en `#priority/highest`, `#priority/high`, `#priority/medium`, `#priority/low`, ou `#priority/lowest`.
  - Convertit la date `dueDate` en `[[<date_formatee>]]` en utilisant le format configuré dans les réglages (`getSettings().dailyNoteDateFormat`).
- **Logique de désérialisation (`deserialize`)** :
  - Extrait les liens de type `[[...]]` en fin de tâche et analyse la date à l'intérieur à l'aide de `moment` en essayant le format configuré puis des formats de secours (`DD-MM-YYYY ddd`, `YYYY-MM-DD`, etc.).
  - Extrait les tags `#priority/*` et affecte le niveau de priorité correspondant.
  - Nettoie le tableau `tags` du résultat pour éviter que `#priority/*` ne réapparaisse comme un tag classique de description.

### B. Index des Serializers : `src/TaskSerializer/index.ts`

- Exporte `TagAndDailyNoteTaskSerializer` et `TAG_AND_DAILY_NOTE_SYMBOLS` pour les rendre accessibles dans tout le projet.

### C. Ajustement dans `src/TaskSerializer/DefaultTaskSerializer.ts`

- Passage des méthodes `extractDateField` et `extractField` de `private` à `protected`.
- Exportation de l'interface `ParsingState`.
- *Raison* : Permet à `TagAndDailyNoteTaskSerializer` d'hériter directement des fonctions de découpage par expressions régulières sans dupliquer le code de parsing des tâches.

### D. Configuration : `src/Config/Settings.ts`

- Ajout du paramètre `dailyNoteDateFormat` dans l'interface `Settings` (valeur par défaut `'DD-MM-YYYY ddd'`).
- Enregistrement du nouveau format `tagAndDailyNote` dans `TASK_FORMATS` :

  ```ts
  tagAndDailyNote: {
      getDisplayName: () => 'Tags & Daily Note Links (#priority/... & [[date]])',
      taskSerializer: new TagAndDailyNoteTaskSerializer(),
      buildSuggestions: makeDefaultSuggestionBuilder(TAG_AND_DAILY_NOTE_SYMBOLS, DEFAULT_MAX_GENERIC_SUGGESTIONS, false),
  }
  ```

### E. Interface Utilisateur des Réglages : `src/Config/SettingsTab.ts`

- Ajout d'un contrôle de saisie texte **Daily Note Link Date Format** sous le choix des formats de tâches.
- Permet à l'utilisateur de modifier le format de date (ex. `DD-MM-YYYY ddd`, `YYYY-MM-DD`, `DD/MM/YYYY`) directement depuis l'interface du plugin.

### F. Rendu & UI : `src/Renderer/TaskLineRenderer.ts` & Composants Svelte

- **`TaskLineRenderer.ts`** : Remplacement du serializer codé en dur `TASK_FORMATS.tasksPluginEmoji` par `getUserSelectedTaskFormat().taskSerializer`. Ainsi, le rendu HTML dans Obsidian s'adapte au format actif.
- **`PriorityEditor.svelte`**, **`EditTask.svelte`**, **`RecurrenceEditor.svelte`** : Mise à jour de la résolution des symboles pour utiliser le serializer sélectionné au lieu de forcer l'émoji par défaut.

### G. Tests Unitaires Automated : `tests/TaskSerializer/TagAndDailyNoteTaskSerializer.test.ts`

- Validation complète des cas de désérialisation et de sérialisation pour les priorités par tag et les liens Daily Notes.

---

## 4. Guide de Réalignement Git avec Upstream (`git merge upstream`)

Lorsque le projet parent Obsidian Tasks publie de nouvelles versions et que vous souhaitez mettre à jour votre fork :

1. **Ajouter le dépôt upstream si ce n'est pas déjà fait** :

   ```bash
   git remote add upstream https://github.com/obsidian-tasks-group/obsidian-tasks.git
   git fetch upstream
   ```

2. **Effectuer la fusion** :

   ```bash
   git checkout main (ou le nom de votre branche principale)
   git merge upstream/main
   ```

3. **Résolution des conflits potentiels** :
   - Votre logique personnalisée est dans [src/TaskSerializer/TagAndDailyNoteTaskSerializer.ts](file:///C:/Users/melos/Documents/obsidian-tasks/src/TaskSerializer/TagAndDailyNoteTaskSerializer.ts), un fichier qui n'existe pas dans upstream. Il ne provoquera **aucun conflit**.
   - Dans `src/Config/Settings.ts` et `src/Config/SettingsTab.ts`, les modifications sont isolées sous des marqueurs `/* FORK CUSTOMIZATION */`. Si upstream ajoute de nouveaux paramètres, acceptez les deux côtés ou conservez votre entrée `tagAndDailyNote` dans `TASK_FORMATS`.
   - Dans `DefaultTaskSerializer.ts`, la seule différence est le mot-clé `protected` au lieu de `private` sur deux méthodes.

---

## 5. Résumé de la Conversation

- **Demande initiale** : Adapter le plugin Obsidian Tasks pour que les priorités utilisent des hashtags (`#priority/highest` à `#priority/lowest`), que les due dates prennent la forme de liens vers les Daily Notes (`[[27-07-2026 lu]]`), que le format de date soit configurable dans les réglages, et que la structure reste facile à maintenir face aux futures mises à jour du plugin d'origine.
- **Analyse du codebase** : Examen de la structure `TaskSerializer`, `Settings`, `TaskLineRenderer`, et composants de l'éditeur Svelte.
- **Mise en œuvre** :
  - Création de `TagAndDailyNoteTaskSerializer`.
  - Intégration dans `Settings.ts` & `SettingsTab.ts` avec option de format de date pour les Daily Notes.
  - Découplage du rendu UI pour respecter le format sélectionné par l'utilisateur.
  - Rédaction des tests unitaires et de la documentation d'architecture.
