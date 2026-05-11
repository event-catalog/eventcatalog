---
sidebar_position: 5
keywords:
- versioning
- domains
sidebar_label: Versioning
title: Versioning
description: Learn how to version domains
---

**All content in EventCatalog can be versioned**.

This allows you to keep historic versions of content which can give context to users why things are changing.

:::tip Tip: Versioning can be great for context

Versioning in EventCatalog is a great way to track changes over time. At any point users using EventCatalog can look back in time and understand what changes have been made to domains, services and messages. This gives extra context that is usually missed.

Example would when new developers come on board, maybe they are interested in a particular domain, maybe they want to understand the history of this domain, where it started and how it came to be what it is today. Versioning allows you to capture this context.

:::

## How to version a domain

1. Create a `/versioned` directory inside the `/domains` folder if one is not created already.
1. Create a new folder with the version number inside the folder.
    - Example: `/domains/Orders/versioned/0.0.1`
1. Copy contents into the new folder, it at least needs your index.mdx file.
    - Example: `/domains/Orders/versioned/0.0.1/index.mdx`
    - Note: the version inside this index.mdx file would be `0.0.1`
1. Bump the version of the `index.mdx` file in the route of the domain.
    - Example `/domains/Orders/index.mdx`, change the `version` to `0.0.2`

## How to navigate to versions

EventCatalog will automatically create links for you within your latest version of your document. Users will also be able to navigate to any version by adding the version in the url (e.g /docs/domains/Orders/1.0.2 would load the 1.0.2 version of this domain).

![Example](../../img/domains/versioned.png)


