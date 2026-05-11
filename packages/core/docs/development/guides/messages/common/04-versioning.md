---
keywords:
- versioning
- events
sidebar_label: Versioning messages
title: Versioning
description: Learn how to version events
---

All content in EventCatalog can be versioned. This allows you to keep historic versions of content which can give context to users why things are changing.

## How to version a message

1. Create a `/versioned` directory inside the `/events|commands|queries` folder if one is not created already.
1. Create a new folder with the version number inside the folder.
    - Example: `/events|commands|queries/InventoryOutOfStock/versioned/0.0.1`
1. Copy contents into the new folder, it at least needs your index.mdx file.
    - Example: `/events|commands|queries/InventoryOutOfStock/versioned/0.0.1/index.mdx`
    - Note: the version inside this index.mdx file would be `0.0.1`
1. Bump the version of the `index.mdx` file in the route of the domain.
    - Example `/events|commands|queries/InventoryOutOfStock/index.mdx`, change the `version` to `0.0.2`

## How to navigate to versions

EventCatalog will automatically create links for you within your latest version of your document. Users will also be able to navigate to any version by adding the version in the url (e.g /docs/events|commands|queries/InventoryOutOfStock/1.0.2 would load the 1.0.2 version of this service).

![Example](../../img/domains/versioned.png)
