---
sidebar_position: 2
keywords:
- EventCatalog commands
sidebar_label: Create a command
title: Create a command
description: Creating and managing commands within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

A command documents intent. Use commands when one part of your architecture asks another part to do something that may be accepted, rejected, validated, or handled asynchronously (e.g a POST request)

![Example](../../../img/commands/example.png)

## Adding a new command

### Automatic Creation

<PromptBox preview="Create a new EventCatalog command">
Read https://www.eventcatalog.dev/docs/development/guides/resources/messages/create-messages/create-command.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/commands.md then help me create a new EventCatalog command in my catalog.

Ask me for the command name, what action it requests, summary, whether it belongs at the root of the catalog or inside a service, domain, or system, and any known invokers, handlers, channels, HTTP operation details, or schema files. Then create the correct commands/{'{Command Name}'}/index.mdx, services/{'{Service Name}'}/commands/{'{Command Name}'}/index.mdx, domains/{'{Domain Name}'}/commands/{'{Command Name}'}/index.mdx, or domains/{'{Domain Name}'}/systems/{'{System Name}'}/services/{'{Service Name}'}/commands/{'{Command Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

If the catalog does not have any services, domains, or systems, put it into the root commands folder.

You can also ask the user if they have a schema of the command, if they provide one, you can add this schema to the command, and set the schemaPath to that schema on the command frontmatter properties.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the command should live, create the right folder structure, and add the first version of the command documentation.

### Manual Creation

Commands live in a `/commands` folder. This folder can be placed:

- At the root of your catalog
- Inside a specific service folder

<ProjectTree
  items={[
    {
      name: 'commands',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'UpdateInventory',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Orders',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'commands',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'AddOrder',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

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

### Assign producers and consumer to your command

To add services that invoke or accept your command you can read the [guide on adding messages to services](/docs/development/guides/resources/messages/connect-messages/map-producers-and-consumers).

You can also assign your command to one or more [channels](/docs/development/guides/resources/messages/message-channels/adding-messages-to-services) (e.g HTTP, GraphQL, etc).

### Document an HTTP operation

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

When defined, the visualiser shows an HTTP method badge, the API path, and colored status code pills on the command node. See the [messages reference](/docs/development/guides/resources/messages/reference#operation) for all available options.

### Adding schemas to your command

You can add any schema format to your command, you can read the [guide on adding schemas to messages](/docs/development/guides/resources/schemas/add-schemas-to-messages).
