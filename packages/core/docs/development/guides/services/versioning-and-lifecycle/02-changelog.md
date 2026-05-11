---
keywords:
    - changelog 
    - services
sidebar_label: Adding a changelog
title: Service changelogs 
description: Adding changelogs to your services
---

EventCatalog supports changelogs for [domains](/docs/domains), [services](/docs/services) and [messages](/docs/messages).

When you [version a service](/docs/development/guides/services/versioning-and-lifecycle/versioning) in EventCatalog, you can also attach a `changelog.mdx` to that service or versioned service.

### Adding a changelog

1. Add a `changelog.mdx` to your service (or versioned service)
    - example `/services/{Service}/changelog.mdx`
    - versioned example `/services/{Service}/versioned/1.0.0/changelog.mdx`

**Example**
```md title="/docs/services/PaymentService/changelog.md"
---
createdAt: 2024-08-01
badges:
    - content: New event published
      backgroundColor: green
      textColor: green
---

### Service now publishes a new event

The PaymentService now publishes a new event called `PaymentAccepted`

``` 

Navigate to your change log page for your service (example [/docs/services/PaymentService/0.0.1/changelog](https://demo.eventcatalog.dev/docs/domains/Orders/0.0.2/changelog)) or **click on the Changelog button** on your service page.

:::tip "What do add to your change log?"
Changelogs are just markdown files, this allows you to add anything you want (e.g code blocks, tables)

EventCatalog code blocks supports diffs, code labels which are great features for changelogs. You can [read more here](/docs/api/code-blocks).

:::

### Why add changelogs?

Changelogs can provide your team with the context behind the reasons and choices for changes within your service and also be used for auditing purposes.

Changelogs are visualized by EventCatalog.



