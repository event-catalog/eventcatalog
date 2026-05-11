---
sidebar_position: 7
keywords:
    - changelog 
    - data stores
sidebar_label: Adding a changelog
title: Data store changelogs 
description: Adding changelogs to your data stores
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.59.0" />

EventCatalog supports changelogs for [domains](/docs/domains), [services](/docs/services), [messages](/docs/messages) and [data stores](/docs/data).

When you [version a data store](/docs/development/guides/data/versioning-and-lifecycle/versioning) in EventCatalog, you can also attach a `changelog.mdx` to that data store or versioned data store.

### Adding a changelog

1. Add a `changelog.mdx` to your data store (or versioned data store)
    - example `/services/{Service Name}/containers/{DataStore}/changelog.mdx`
    - versioned example `/services/{Service Name}/containers/{DataStore}/versioned/1.0.0/changelog.mdx`

**Example**
```md title="/docs/services/PaymentService/containers/PaymentDatabase/changelog.md"
---
createdAt: 2024-08-01
badges:
    - content: New table added
      backgroundColor: green
      textColor: green
---

### New Table added to the PaymentDatabase

The PaymentDatabase now has a new table called `PaymentTransactions`.

<!-- Other details about the change here -->

``` 

Navigate to your change log page for your data store (example [/docs/services/PaymentService/containers/PaymentDatabase/0.0.1/changelog](https://demo.eventcatalog.dev/docs/services/PaymentService/containers/PaymentDatabase/0.0.1/changelog)) or **click on the Changelog button** on your data store page.

:::tip "What do add to your change log?"
Changelogs are just markdown files, this allows you to add anything you want (e.g code blocks, tables)

EventCatalog code blocks supports diffs, code labels which are great features for changelogs. You can [read more here](/docs/api/code-blocks).

:::

### Why add changelogs?

Changelogs can provide your team with the context behind the reasons and choices for changes within your data store and also be used for auditing purposes.



