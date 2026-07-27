# Récapitulatif Complet des Modifications - Fork Obsidian Tasks (Priorités en Tags & Due Dates en Daily Notes)

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

4. **Identifiants uniques de Plugin (Prévention des conflits)** :
   - Modification de l'ID du manifest (`obsidian-tasks-custom-plugin`), du nom d'affichage (`Tasks (Custom Fork)`), du `package.json` et de `versions.json`.

5. **Maintenabilité et compatibilité avec les mises à jour upstream** :
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
  - Convertit la date `dueDate` en ` [[<date_formatee>]]` en utilisant le format configuré dans les réglages (`getSettings().dailyNoteDateFormat`).
- **Logique de désérialisation (`deserialize`)** :
  - Pré-extrait tout tag `#priority/*` et tout lien `[[...]]` dans la tâche.
  - Décode la date avec `parseDailyNoteDate` (support multi-locale et extraction numérique des dates).
  - Nettoie la chaîne avant de passer au serializer parent, évitant ainsi que le tag de priorité ne soit capturé à tort comme un hashtag de description.

### B. Index des Serializers : `src/TaskSerializer/index.ts`
- Exporte `TagAndDailyNoteTaskSerializer` et `TAG_AND_DAILY_NOTE_SYMBOLS` pour les rendre accessibles dans tout le projet.

### C. Ajustement dans `src/TaskSerializer/DefaultTaskSerializer.ts`
- Passage des méthodes `extractDateField` et `extractField` de `private` à `protected`.
- Exportation de l'interface `ParsingState`.

### D. Configuration : `src/Config/Settings.ts`
- Ajout du paramètre `dailyNoteDateFormat` dans l'interface `Settings` (valeur par défaut `'DD-MM-YYYY ddd'`).
- Enregistrement du nouveau format `tagAndDailyNote` dans `TASK_FORMATS`.

### E. Interface Utilisateur des Réglages : `src/Config/SettingsTab.ts`
- Ajout d'un contrôle de saisie texte **Daily Note Link Date Format** sous le choix des formats de tâches.

### F. Rendu & UI : `src/Renderer/TaskLineRenderer.ts` & Composants Svelte
- **`TaskLineRenderer.ts`** : Remplacement du serializer codé en dur `TASK_FORMATS.tasksPluginEmoji` par `getUserSelectedTaskFormat().taskSerializer` pour les rendus et infobulles survolées.
- **`PriorityEditor.svelte`**, **`EditTask.svelte`**, **`RecurrenceEditor.svelte`** : Mise à jour de la résolution des symboles pour utiliser le serializer sélectionné.

### G. Suggestions en direct dans l'éditeur : `src/Suggestor/Suggestor.ts`
- **Déclencheur `due`** : Taper `due` propose `due date [` et insère un seul crochet `[`.
- **Déclencheur `[` avec crochet simple** : Évite d'interférer avec le suggestor de liens natif d'Obsidian (qui requiert `[[`).
- **Ignorer la case à cocher `- [ ] `** : Filtre les crochets situés dans le préfixe de la case à cocher en début de ligne (`checkboxEnd`).
- **Insertion automatique** : La sélection d'une date insère directement le lien wikilink complet `[[28-07-2026 ma]]`.

### H. Fichiers de Manifest et Packaging :
- `manifest.json` : `id: "obsidian-tasks-custom-plugin"`, `name: "Tasks (Custom Fork)"`.
- `package.json` : `name: "obsidian-tasks-custom-plugin"`.
- `versions.json` : Mappings de compatibilité des releases.

### I. CI/CD GitHub Actions :
- `.github/workflows/release.yml` : Passage à `softprops/action-gh-release@v2` pour créer et téléverser automatiquement la release et ses 4 assets (`main.js`, `manifest.json`, `styles.css`, `.zip`).
- `.github/workflows/update-docs-markdown.yml` : Ajout de `continue-on-error: true` pour éviter les blocages de permissions sur les forks.

---

## 4. Historique des Versions & Correctifs Déployés

| Version | Description du Changement / Correctif |
| :--- | :--- |
| **8.3.1** | Implémentation initiale du format `tagAndDailyNote` et modification des identifiants du manifest. |
| **8.3.2** | Correction de la release automatisée (`softprops/action-gh-release@v2`), tolérance multi-locale (`parseDailyNoteDate`). |
| **8.3.3** | Résolution du bug de collision avec `trailingTags` via la pré-extraction du tag `#priority/...`. |
| **8.3.4** | Prise en charge des suggestions de dates dynamiques dans l'éditeur et formatage en wikilink. |
| **8.3.5 - 8.3.6** | Déclenchement de la release et ajustement de l'expression régulière du préfixe de date (`datePrefixRegex`). |
| **8.3.7** | **Correctif Majeur de l'Éditeur** : Désambiguïsation du crochet `- [ ] ` du début de tâche, activation avec `due` et crochet simple `[`, évitant tout conflit avec le suggestor de liens natif d'Obsidian. |

---

## 5. Guide de Réalignement Git avec Upstream (`git merge upstream`)

Lorsque le projet parent Obsidian Tasks publie de nouvelles versions et que vous souhaitez mettre à jour votre fork :

1. **Ajouter le dépôt upstream si ce n'est pas déjà fait** :
   ```bash
   git remote add upstream https://github.com/obsidian-tasks-group/obsidian-tasks.git
   git fetch upstream
   ```

2. **Effectuer la fusion** :
   ```bash
   git checkout main
   git merge upstream/main
   ```

3. **Résolution des conflits potentiels** :
   - Votre logique personnalisée est dans [src/TaskSerializer/TagAndDailyNoteTaskSerializer.ts](file:///C:/Users/melos/Documents/obsidian-tasks/src/TaskSerializer/TagAndDailyNoteTaskSerializer.ts), un fichier qui n'existe pas dans upstream. Il ne provoquera **aucun conflit**.
   - Dans `src/Config/Settings.ts` et `src/Config/SettingsTab.ts`, les modifications sont isolées sous des marqueurs `/* FORK CUSTOMIZATION */`.
   - Dans `DefaultTaskSerializer.ts`, la seule différence est le mot-clé `protected` au lieu de `private` sur deux méthodes.

---

## 6. Compte-Rendu Complet de la Conversation

1. **Demande initiale** : 
   Adapter le plugin Obsidian Tasks pour que les priorités utilisent des hashtags (`#priority/highest` à `#priority/lowest`), que les due dates prennent la forme de liens vers les Daily Notes (`[[27-07-2026 lu]]`), que le format de date soit configurable dans les réglages, et que la structure reste facile à maintenir face aux futures mises à jour du plugin d'origine.
2. **Changements de Manifest & Release** : 
   Modification de l'id dans `manifest.json` pour éviter tout conflit avec le plugin original, mise en place des releases GitHub automatisées par tag git.
3. **Debugging des Tests & Locales** : 
   Résolution des échecs de tests liés aux différences de locales `fr`/`en` dans `moment` via la création d'un parser résilient avec secours numérique.
4. **Correction du Conflit de Hashtag (`trailingTags`)** : 
   Identification du comportement d'Obsidian Tasks qui replaçait `#priority/low` dans la description car il était interprété comme un tag générique de fin de ligne. Correctif apporté via pré-extraction.
5. **Ajustement de l'Autocomplétion dans l'Éditeur** :
   Analyse fine du comportement des autocomplétions en direct. Élimination des conflits avec le popup natif d'Obsidian via le déclencheur à crochet simple `[` et l'exclusion des crochets de la case à cocher `- [ ] `.
