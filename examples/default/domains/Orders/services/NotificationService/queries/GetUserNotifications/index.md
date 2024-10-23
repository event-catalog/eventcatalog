---
id: GetUserNotifications
name: Get user notifications
version: 0.0.1
summary: |
  GET request that will return a list of notifications for a specific user, with options to filter by status (unread or all).
owners:
    - dboyne
badges:
    - content: Recently updated!
      backgroundColor: green
      textColor: green
schemaPath: schema.json
---

import Footer from '@catalog/components/footer.astro';

## Overview

The `GetUserNotifications` message is a query used to retrieve a list of notifications for a specific user. It allows filtering by notification status, such as unread or all notifications. This query is typically utilized by notification services to display user-specific messages, such as order updates, promotional offers, or system notifications. It supports pagination through `limit` and `offset` parameters, ensuring that only a manageable number of notifications are retrieved at once. This query helps users stay informed about important events or updates related to their account, orders, or the platform.

Use cases include delivering notifications for order updates, promotional campaigns, or general system messages to keep the user informed.

<NodeGraph />

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />

