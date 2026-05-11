---
sidebar_position: 2
keywords:
- EventCatalog domains
sidebar_label: Creating a domain
title: Creating domains
description: Creating and managing domains within EventCatalog.
---

Domains are a great way to group your documentation into logical units that can be represented in your organization.

EventCatalog Domains are inspired by the [Domain-Driven Design](/docs/development/guides/domains/introduction) approach.

In EventCatalog a domain is a logical unit that contains related [services](/docs/development/guides/services/introduction), [entities](/docs/development/guides/domains/entities/introduction), [messages](/docs/development/guides/messages/overview), subdomains,  and other resources.

### What do domains look like in EventCatalog?

![Example](../../img/domains/domain-example.png)

## Adding a new domain

To add a new domain create a new folder within the `/domains` folder with an `index.mdx` file.

- `/domains/{Domain Name}/index.mdx` 
  - (example `/domains/Orders/index.mdx`)

The `index.mdx` contents are split into two sections, [**frontmatter**](/docs/api/domain-api) and the [**markdown content**](#adding-content).

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

**That's it!**

Once you add your domain it will appear in your catalog.

## Adding content

Your domain page will render the markdown content you add to the file. To add content to your domain page, add markdown to the file.

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

## Using components

EventCatalog supports [MDX](https://mdxjs.com/) under the hood. This gives you the ability to use components inside your domain page.

You can find a list of EventCatalog components you can use here: [EventCatalog components](/docs/development/components/using-components).


