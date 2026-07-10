---
sidebar_position: 6
sidebar_label: Use slash commands
title: Use slash commands
description: Insert Markdown blocks and EventCatalog components from the rich editor.
---

Slash commands let you add content without remembering Markdown syntax or MDX component names.

Type `/` in an empty paragraph to open the command menu. The menu shows matching blocks, grouped by purpose, with a visual preview of the selected command.

![Slash command menu showing EventCatalog diagram components](../images/custom-slash-commands.png)

## Insert a block

1. Click into the resource documentation.
2. Start a new empty paragraph.
3. Type `/`.
4. Search or scroll to the block you want.
5. Press `Enter` or click the command.

The editor inserts the matching Markdown or MDX block into the resource.

## Add EventCatalog components

Slash commands are useful for adding EventCatalog-specific components without switching to source mode.

You can insert components such as:

- Node Graph
- Miro diagram
- Draw.io diagram
- Lucid diagram
- IcePanel diagram
- [Flow](/docs/development/guides/resources/flows/introduction)
- Mermaid diagram
- Entity Map
- Schema Viewer
- Steps
- Tiles
- Accordion group
- Prompt
- Visibility
- Admonitions such as note, tip, warning, danger, and info

Some commands are available only when they make sense for the current resource. For example, **Schema Viewer** is available for [events](/docs/development/guides/resources/messages/message-types/events), [commands](/docs/development/guides/resources/messages/message-types/commands), and [queries](/docs/development/guides/resources/messages/message-types/queries), while **Entity Map** is available for [domains](/docs/development/guides/domains/introduction).

## Use visual previews

The preview panel shows what the selected command is for before you insert it.

Use this when you are deciding between similar blocks, such as diagram components or callout types.

## Edit the inserted block

After inserting a component, you can usually edit it directly in the rich editor.

If the component needs configuration that is not exposed visually yet, switch to source mode and edit the MDX.

## When to use source mode instead

Use source mode when you need to:

- Paste an existing MDX component
- Change advanced component attributes
- Edit custom components that the slash menu does not know about
- Review the exact Markdown or MDX that will be saved
