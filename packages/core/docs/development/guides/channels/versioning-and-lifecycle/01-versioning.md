---
keywords:
- versioning
- channels
sidebar_label: Versioning
title: Versioning
description: Learn how to version channels
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.13.0" />

All content in EventCatalog can be versioned. This allows you to keep historic versions of content which can give context to users why things are changing.

## How to version a channel

1. Create a `/versioned` directory inside the `/channels` folder if one is not created already.
1. Create a new folder with the version number inside the folder.
    - Example: `/channels/OrdersChannel/versioned/0.0.1`
1. Copy contents into the new folder, it at least needs your index.mdx file.
    - Example: `/channels/OrdersChannel/versioned/0.0.1/index.mdx`
    - Note: the version inside this index.mdx file would be `0.0.1`
1. Bump the version of the `index.mdx` file in the route of the channel.
    - Example `/channels/OrdersChannel/index.mdx`, change the `version` to `0.0.2`

## How to navigate to versions

EventCatalog will automatically create links for you within your latest version of your document. Users will also be able to navigate to any version by adding the version in the url (e.g /docs/channels/OrdersChannel/1.0.2 would load the 1.0.2 version of this channel).

![Example](../../img/channels/versions.png)