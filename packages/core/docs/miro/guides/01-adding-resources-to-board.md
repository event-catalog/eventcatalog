---
sidebar_position: 1
sidebar_label: Adding resources to the board
title: "Adding Resources to the Board"
description: Drag and drop services, events, commands, and more onto your Miro board
slug: /miro/adding-resources
---

Once you've [imported your catalog](/docs/miro/connecting-to-eventcatalog), you can start adding resources to your Miro board.

### The dashboard

After importing, you'll see the dashboard — a grid showing all your resource categories with the number of resources in each:

- **Services** — microservices and systems
- **Events** — domain events
- **Commands** — command messages
- **Queries** — query messages
- **Channels** — message brokers and routing
- **Data Stores** — databases and storage

Click any category to drill into its resource list.

### Dragging resources onto the board

There are two ways to add resources to the board:

#### From the category list

1. Click a category (e.g. **Services**) to see all resources in that category
2. Grab a resource by its drag handle and drag it onto the Miro board
3. The resource appears on the board as a card with its name, version, and metadata

Each resource in the list shows its name, version, summary, and owners. You can search to filter resources down.

#### From the dashboard

You can also drag a category card directly from the dashboard onto the board. This creates a new blank resource of that type on the board — useful for quickly sketching out resources that don't exist yet.

<div style={{textAlign: "center"}}>
  <img src="/img/miro/guides/list-of-services.png" alt="Panel" style={{width: "15%"}} />
  <span style={{display: "block", fontSize: "0.8rem", color: "#6B7280", marginTop: "0.5rem"}}>Imported Services for Miro</span>
</div>


### Display modes

The app supports two display modes for how resources appear on the board. You can switch between them from the **Display Mode** toggle on the dashboard:

#### App Card

<div style={{textAlign: "center"}}>
  <img src="/img/miro/guides/app-card.png" alt="Panel" style={{width: "50%"}} />
  <span style={{display: "block", fontSize: "0.8rem", color: "#6B7280", marginTop: "0rem", marginBottom: "1rem"}}>Style - App Card</span>
</div>


The default mode. Resources appear as Miro App Cards with:
- Resource name as the title
- Summary as the description
- Version, category, owners, and badges as fields
- Color-coded by resource type
- Status indicator (Active, Draft, or Deprecated)

#### Post-it

<div style={{textAlign: "center"}}>
  <img src="/img/miro/guides/post-it.png" alt="Panel" style={{width: "50%"}} />
  <span style={{display: "block", fontSize: "0.8rem", color: "#6B7280", marginTop: "0rem", marginBottom: "1rem"}}>Style - Post-it</span>
</div>

Resources appear as colored Miro sticky notes with the resource name. This is a simpler, more compact view — useful when you want a high-level overview without the detail.

:::tip Switching display modes
When you switch display modes, all existing resources on the board are automatically converted to the new format. Connections between resources are preserved.
:::

### Auto-layout

If your board gets messy, click the **Auto-layout** button in the dashboard header. This automatically arranges all resources on the board using a left-to-right directed graph layout, organizing connected resources into a clean flow.

### Finding resources on the board

<div style={{textAlign: "center"}}>
  <img src="/img/miro/guides/focus.png" alt="Panel" style={{width: "50%"}} />
  <span style={{display: "block", fontSize: "0.8rem", color: "#6B7280", marginTop: "0rem", marginBottom: "1rem"}}>Style - Post-it</span>
</div>


When browsing the resource list, hover over any resource to reveal a crosshair icon. Click it to zoom to that resource on the board — helpful when you have a large board and need to find a specific resource.
