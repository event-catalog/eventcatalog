---
sidebar_position: 7
sidebar_label: Exporting to EventCatalog
title: "Exporting to EventCatalog"
description: Export your Miro board design back to EventCatalog
slug: /miro/exporting-to-eventcatalog
---

Once you've designed your architecture on the Miro board, you can export it and use AI to update your EventCatalog project automatically.

### Exporting the board

1. Open the app panel and navigate to the dashboard
2. Click the **Export to JSON** button
3. A `miro-board-export.json` file is downloaded containing all the items currently on your board — cards, sticky notes, connectors, positions, and styles

The export captures everything on the board as raw Miro data, including resources you imported from your catalog and any new resources or connections you created during your design session.

### Updating your catalog with AI

The exported JSON can be used with [EventCatalog Skills](https://github.com/event-catalog/skills) — AI-powered instructions that understand EventCatalog's file structure and conventions. An AI agent can read your Miro board export and update your catalog accordingly.

#### Step 1: Install EventCatalog Skills

If you haven't already, add the EventCatalog skills to your project:

```bash
npx skills add event-catalog/skills
```

This installs conversational skills that teach AI agents how to create and update EventCatalog documentation.

#### Step 2: Feed the export to an AI agent

Open your AI agent (e.g. Claude) in your EventCatalog project directory and provide the exported JSON along with instructions. For example:

```
Here is a Miro board export from our architecture design session.
Please update my EventCatalog to reflect the changes we made:

- Add any new services, events, commands, or other resources
- Update connections between services and messages
- Create documentation files for new resources

<paste or attach miro-board-export.json>
```

The AI agent will use the EventCatalog skills to:

- Parse the board items and connectors from the Miro export
- Identify new resources that need to be added to your catalog
- Identify updated connections between existing resources
- Generate properly formatted documentation files with correct frontmatter and folder structure
- Cross-reference existing catalog resources to avoid duplicates

#### Step 3: Review and commit

The AI generates files in your EventCatalog project. Review the changes, then commit them to your repository:

```bash
git add .
git commit -m "Update architecture from Miro design session"
```

### The workflow

The Miro app is designed to fit into a collaborative design workflow:

1. **Import** your existing architecture from EventCatalog into Miro
2. **Design** collaboratively — add new resources, draw connections, model what comes next
3. **Export** the board to JSON
4. **Update** your catalog using AI skills that understand the Miro export format
5. **Review and merge** — treat architecture changes like code changes with pull requests

This creates a loop where your catalog stays in sync with your team's design decisions, and every change is tracked in version control.
