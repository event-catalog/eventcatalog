---
sidebar_position: 3
keywords:
- EventCatalog Miro
- import catalog
- connect EventCatalog
sidebar_label: Connecting to EventCatalog
title: "Connecting to EventCatalog"
description: Export and import your EventCatalog resources into the Miro app
slug: /miro/connecting-to-eventcatalog
---

To use the Miro App, you first need to export your EventCatalog data and import it into the app.

### Step 1: Export your catalog

In your EventCatalog project, run the export command:

```bash
npm run export
```

This generates a JSON file containing all your resources — services, events, commands, queries, channels, and data stores — along with their relationships, owners, and metadata.

### Step 2: Import into the Miro App

Open the EventCatalog app in Miro and click **Import Resources**. You have two options:

#### Option A: Upload a file

Click the upload area and select the exported JSON file from your file system.

#### Option B: Paste JSON

Copy the contents of the exported JSON file and paste it into the text area, then click **Import**.

The app validates the JSON before importing. If the format is invalid, you'll see an error message — check that you're using the output from `npm run export`.

### What gets imported?

All resources from your catalog are imported and organized by type:

- **Services** — with their sends, receives, writesTo, and readsFrom relationships
- **Events, Commands, Queries** — message types with producer/consumer information
- **Channels** — message brokers with routing configuration
- **Data Stores** — databases with read/write relationships
- **Owners and Teams** — used to display ownership on resources

### Re-importing

You can import a new catalog at any time by clicking **Import Resources** from the dashboard. This replaces your current data with the new import.

:::info Data is stored locally
All imported data is stored in your browser's local storage. No data is sent to any server. If you clear your browser data, you'll need to re-import your catalog.
:::

### Next steps

Once your data is imported, you're ready to start adding resources to the board. Head to the [guides](/docs/miro/adding-resources) to learn how.
