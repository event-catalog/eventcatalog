---
sidebar_position: 2
keywords:
- EventCatalog domains
sidebar_label: Create a domain
title: Create a domain
description: Creating and managing domains within EventCatalog.
---

import PromptBox from '@site/src/components/MDX/PromptBox';

Domains are a great way to document a business boundary, define its [ubiquitous language](/docs/development/guides/domains/ownership-and-language/adding-ubiquitous-language) and group your documentation into logical units that can be represented in your organization.

Domains can contains resources (e.g [systems](/docs/development/guides/systems/introduction), [services](/docs/development/guides/resources/services/introduction), [entities](/docs/development/guides/resources/entities/introduction), [messages](/docs/development/guides/resources/messages/what-are-messages), subdomains,  and more).

![Example](../img/domains/domain-example.png)

---

### Creating a domain

#### Automatic Creation

<PromptBox preview="Create a new EventCatalog domain">
Read https://www.eventcatalog.dev/docs/development/guides/domains/create-domain.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/domains.md then help me create a new EventCatalog domain in my catalog.

Ask me for the domain name, business boundary, summary and what it does. Then create the correct domains/{'{Domain Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md


</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can guide you through creating the domain, choosing the right folder structure, and adding the first version of the domain documentation.

#### Manual Creation

To add a new domain create a new folder within the `/domains` folder with an `index.mdx` file.

- `/domains/{Domain Name}/index.mdx` 
  - (example `/domains/Orders/index.mdx`)

The `index.mdx` contents are split into two sections, [**frontmatter**](/docs/development/guides/domains/reference) and the [**markdown content**](#adding-content).

_Here is an example of what a domain markdown file may look like._

```md title="/domains/Orders/index.mdx (example)"
---
# id of your domain, used for slugs and references in EventCatalog.
id: Orders

# Display name of the domain, rendered in EventCatalog
name: Orders

# Version of the domain
version: 0.0.1

# Short summary of your domain
summary: |
  Domain that contains order related information

# Optional owners, references teams or users
owners:
    - dboyne

# Optional services. Groups services into this domain.
services:
    - id: PaymentService
      version: 0.0.1

# Optional flows associated with this domain
flows:
    - id: OrderProcessing
      version: 1.0.0

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: New domain
      backgroundColor: blue
      textColor: blue
---

## Overview

Domain that contains all services that are related to the orders domain within FakeCompany.

<NodeGraph />

```

Once you add your domain it will appear in your catalog.

---

## Adding content to your domain

Your domain page will render the markdown content you add to the file. To add content to your domain page, add markdown to the file.

EventCatalog supports [MDX](https://mdxjs.com/) under the hood. This gives you the ability to use components inside your domain page.

You can find a list of EventCatalog components you can use here: [EventCatalog components](/docs/development/components/using-components).

```md title="/domains/Orders/index.mdx"
---
id: Orders
version: 0.0.1
name: Orders
---

## Overview

This is your domain markdown....

You can add anything here...

Including EventCatalog components

<NodeGraph />

```




