---
sidebar_position: 2
keywords:
- EventCatalog Studio
- canvas
sidebar_label: Create a canvas
title: Create a canvas
description: Start a canvas, add resources from your catalog, sketch new components and connect them.
---

A canvas is where you design a change. Give each canvas one topic, such as "Email customers when their review is published" or "Split the Order Service".

This page uses the example catalog from `create-eventcatalog`. Follow along with your own resources, or create the example catalog:

```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog
cd my-catalog
npm run dev
```

## Start a canvas

1. Open **Studio** from the sidebar, or go to `/studio` in your catalog.
2. The first time, Studio asks what to call you. Your name is shown next to your pointer and your comments.
3. Choose **New canvas**, name it for what you're designing, and choose **Create canvas**.

### Start from a diagram

You can also start from any diagram in your catalog. Open the diagram's menu, choose **Open in Studio** and name the canvas.

![The Open in Studio dialog on the Payments domain diagram](./img/open-in-studio.png)

The canvas starts with the diagram's resources, their positions, their domains and systems, and their connections. Change it as you like. Your catalog doesn't change.

## Add resources from your catalog

1. In the palette, choose **Catalog Resources**.
2. Search for a resource, for example `moderation`.
3. Click it to add it, or drag it onto the canvas.

When you add a service or a message, choose what comes with it:

- **Just the service**: the resource on its own, connected to what is already on the canvas.
- **With its connections**: the resource and what it sends, receives and stores. Tick the groups you want.

For example, adding the **Review Moderation Worker** with only **Messages it sends** ticked adds the service and the two events it publishes, already connected:

![The Review Moderation Worker and the two events it publishes](./img/add-service-with-connections.png)

Catalog resources keep the name, version and summary from your catalog. To change them, change them in your catalog.

## Add something new

Use the **Components** tab for things that don't exist yet, such as a proposed service, event or database.

1. In the palette, choose **Components**.
2. Click a component to add it, or drag it onto the canvas. New components start at version `0.0.1`.
3. Double-click it to set its name, version and summary. Changes save as you type.

![The Components tab next to a canvas](./img/components.png)

See the [reference](/docs/development/studio/reference#components) for every component.

## Connect nodes

Drag from the dot on the edge of one node to the dot on another. Studio labels the connection with EventCatalog's wording.

For example, connecting the **Review Published** event to a new **Review Emails** service is labelled **subscribed by**:

![A new Review Emails service subscribed to the Review Published event](./img/new-service-connected.png)

To put a node inside a domain or system, drag it onto the box and drop it when it highlights.

To tidy the whole canvas, choose **Reorder diagram** in the toolbar at the bottom.

## Edit a node

Double-click a node, or right-click it and choose **Edit details**. The panel shows its name, version and summary, and what it connects to.

![The details panel for a service](./img/node-details.png)

Right-click a node to comment on it, flag a hotspot, add a note, copy, duplicate or delete it.

## Change the level

Choose **L1**, **L2** or **L3** in the toolbar, or press <kbd>1</kbd>, <kbd>2</kbd> or <kbd>3</kbd>.

| Level | Shows |
|---|---|
| **L1** | Domains, systems and their relationships |
| **L2** | Services and data stores |
| **L3** | Everything, including messages and channels |

You draw at L3. L1 and L2 summarise it: at L2, messages fold into the connections between services, and at L1, services fold into their systems. Use L1 or L2 when you want to talk about the big picture, without every message.

![The same design at L2, with the event folded into the connection](./img/canvas-level-2.png)

L1 is greyed out until the canvas has a domain or system.

## Next steps

- [Collaborate on a canvas](/docs/development/studio/collaborate-on-a-canvas) with your team.
- [Connect your agent to a canvas](/docs/development/studio/connect-your-agent).
