---
keywords:
    - changelog 
    - events
sidebar_label: Add a changelog
title: Add a changelog
description: Add changelogs to messages.
---

EventCatalog supports changelogs for [domains](/docs/domains), [services](/docs/development/guides/resources/services/introduction) and [messages](/docs/development/guides/resources/messages/what-are-messages).

When you [version a message](/docs/development/guides/resources/messages/versioning-and-lifecycle/version-messages) in EventCatalog, you can also attach a `changelog.mdx` to that message or versioned message.

### Adding a changelog

1. Add a `changelog.mdx` to your message (or versioned message)
    - example `/events|commands|queries/{Message}/changelog.mdx`
    - versioned example `/events|commands|queries/{Message}/versioned/1.0.0/changelog.mdx`

**Example**
```md title="/docs/event/InventoryAdjusted/changelog.md"
---
createdAt: 2024-08-01
badges:
    - content: ⭐️ JSON Schema
      backgroundColor: purple
      textColor: purple
---

### Added support for JSON Schema

InventoryAdjusted uses Avro but now also supports JSON Draft 7.

```json title="Employee JSON Draft"
// labeled-line-markers.jsx
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Employee",
  "properties": {
    "Name": {
      "type": "string"
    },
    "Age": {
      "type": "integer"
    },
    "Town": {
      "type": "string"
    }
  },
  "required": ["Name", "Age", "Town"]
}

``
``` 

Navigate to your change log page for your message (example [/docs/events/InventoryAdjusted/1.0.0/changelog](https://demo.eventcatalog.dev/docs/events/InventoryAdjusted/1.0.0/changelog)) or **click on the Changelog button** on your  message page.

:::tip "What do add to your change log?"
Changelogs are just markdown files, this allows you to add anything you want (e.g code blocks, tables)

EventCatalog code blocks supports diffs, code labels which are great features for changelogs. You can [read more here](/docs/api/code-blocks).

:::

### Why add changelogs?

Changelogs can provide your team with the context behind the reasons and choices for changes within your message and also be used for auditing purposes.

Changelogs are visualized by EventCatalog.


