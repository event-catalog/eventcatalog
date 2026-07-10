---
sidebar_position: 8
sidebar_class_name: hidden
keywords:
    - changelog 
    - domains
sidebar_label: Add a changelog
title: Add a changelog
description: Adding changelogs to your domains
---

EventCatalog supports changelogs for [domains](/docs/domains), [services](/docs/development/guides/resources/services/introduction) and [messages](/docs/development/guides/resources/messages/what-are-messages).

When you [version a domain](/docs/development/guides/domains/version-domains) in EventCatalog, you can also attach a `changelog.mdx` to that domain or version.

### Adding a changelog

1. Add a `changelog.mdx` to your domain (or versioned domain)
    - example `/domains/{Domain}/changelog.mdx`
    - versioned example `/domains/{Domain}/versioned/1.0.0/changelog.mdx`

**Example**
```md title="/docs/domains/Orders/changelog.md"
---
createdAt: 2024-08-01
badges:
    - content: ⭐️ JSON Schema
      backgroundColor: purple
      textColor: purple
---

### Added new service to the domain

Added the Payment service into the domain.

``` 

Navigate to your change log page for your domain (example [/docs/domains/Orders/0.0.2/changelog](https://demo.eventcatalog.dev/docs/domains/Orders/0.0.2/changelog)) or **click on the Changelog button** on your domain page.

:::tip "What do add to your change log?"
Changelogs are just markdown files, this allows you to add anything you want (e.g code blocks, tables)

EventCatalog code blocks supports diffs, code labels which are great features for changelogs. You can [read more here](/docs/api/code-blocks).

:::

### Why add changelogs?

Changelogs can provide your team with the context behind the reasons and choices for changes within your domain and also be used for auditing purposes.

Changelogs are visualized by EventCatalog.

