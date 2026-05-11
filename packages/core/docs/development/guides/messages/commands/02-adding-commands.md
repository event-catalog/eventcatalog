---
sidebar_position: 2
keywords:
- EventCatalog commands
sidebar_label: Creating a command
title: Creating commands
description: Creating and managing commands within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Commands live in a `/commands` folder. This folder can be placed:

- At the root of your catalog, or
  - `/commands/{Command Name}/index.mdx` 
- Inside a specific service folder.
  - `/services/{Service Name}/commands/{Command Name}/index.mdx` 

The contents are split into two sections, **frontmatter** and the **markdown content**.

_Here is an example of what a command markdown file may look like._

```md title="/commands/UpdateInventory/index.mdx (example)"
---
# id of your command, used for slugs and references in EventCatalog.
id: UpdateInventory

# Display name of the command, rendered in EventCatalog
name: Update Inventory

# Version of the command
version: 0.0.3

# Short summary of your command
summary: |
  Command with the intent to update the inventory

# Optional owners, references teams or users
owners:
    - dboyne

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: New service
      backgroundColor: blue
      textColor: blue
---

## Overview

The `Update Inventory` command represents intent to update the inventory of a given item over HTTP.

<NodeGraph />

```

Once this file is added, the command will automatically appear across EventCatalog.

## Writing command content

You can write any Markdown inside a command. 

Each command gets its own page, so use this space to fully explain how it works.

You can also use [interactive components](/docs/development/components/using-components) to enrich your documentation.

## Assign services to your commands

To add services that invoke or accept your command you can read the [guide on adding messages to services](/docs/development/guides/messages/common/map-to-producers-and-consumers).

You can also assign your command to one or more [channels](/docs/development/guides/channels/adding-messages-to-services) (e.g HTTP, GraphQL, etc).

<AddedIn version="3.18.0" />

## Document an HTTP operation

If your command maps to an HTTP endpoint, use the `operation` field to document the method, path, and expected status codes.

```md title="/commands/UpdateInventory/index.mdx (example)"
---
id: UpdateInventory
# ...
operation:
  method: PUT
  path: /inventory/{id}
  statusCodes:
    - "200"
    - "400"
    - "404"
---
```

When defined, the visualiser shows an HTTP method badge, the API path, and colored status code pills on the command node. See the [command API reference](/docs/api/command-api#operation) for all available options.

## Adding schemas to your command

You can add any schema format to your command, you can read the [guide on adding schemas to messages](/docs/development/guides/messages/common/adding-schemas).

## What should I document?

There’s no strict structure, but consider including:

- Purpose – What does this command do and why does it exist?
- How to trigger it – APIs, SDKs, or UI actions
- Schema – Payload structure and validation rules
- Ownership – Who maintains this command?
- Contributing – How others can propose changes

## Custom icon

<AddedIn version="3.28.1" />

Set `styles.icon` in your frontmatter to display a custom icon on the command. The icon appears in the visualiser node, sidebar navigation, page header, and search results.

```md title="/commands/UpdateInventory/index.mdx (example)"
---
id: UpdateInventory
name: Update Inventory
version: 0.0.3
styles:
  icon: /icons/messaging/sns.svg
---
```

The value can be a path to a file in your catalog's `public/` folder (e.g. `/icons/messaging/sns.svg`) or an absolute URL (e.g. `https://cdn.simpleicons.org/amazonsqs`).

## How do commands appear in EventCatalog?

![Example](../../img/commands/example.png)


