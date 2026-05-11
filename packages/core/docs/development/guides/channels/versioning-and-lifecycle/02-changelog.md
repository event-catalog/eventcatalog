---
keywords:
    - changelog 
    - channels
sidebar_label: Adding a changelog
title: Service changelogs 
description: Adding changelogs to your channels
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.13.0" />

EventCatalog supports changelogs for [domains](/docs/domains), [services](/docs/services), [messages](/docs/messages) and [channels](/docs/channels).

When you [version a channel](/docs/development/guides/channels/versioning-and-lifecycle/versioning) in EventCatalog, you can also attach a `changelog.mdx` to that service or versioned service.

### Adding a changelog

1. Add a `changelog.mdx` to your channel (or versioned channel)
    - example `/channels/{Channel}/changelog.mdx`
    - versioned example `/channels/{Channel}/versioned/1.0.0/changelog.mdx`

**Example**
```md title="/channels/OrdersChannel/changelog.mdx"
---
createdAt: 2024-08-01
badges:
    - content: New channel created
      backgroundColor: green
      textColor: green
---

### Channel protocol update

The OrdersChannel now accepts messages using kafka.

``` 

Navigate to your change log page for your channel or **click on the Changelog button** on your channel page.

:::tip "What do add to your change log?"
Changelogs are just markdown files, this allows you to add anything you want (e.g code blocks, tables)

EventCatalog code blocks supports diffs, code labels which are great features for changelogs. You can [read more here](/docs/api/code-blocks).

:::

### Why add changelogs?

Changelogs can provide your team with the context behind the reasons and choices for changes within your channel and also be used for auditing purposes.

Changelogs are visualized by EventCatalog.



