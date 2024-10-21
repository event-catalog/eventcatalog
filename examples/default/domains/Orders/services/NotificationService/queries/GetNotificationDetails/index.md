---
id: GetNotificationDetails
name: Get notification details
version: 0.0.1
summary: |
  GET request that will return detailed information about a specific notification, identified by its notificationId.
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

The `GetNotificationDetails` message is a query used to retrieve detailed information about a specific notification identified by its `notificationId`. It provides a comprehensive overview of the notification, including the title, message content, status (read/unread), the date it was created, and any additional metadata related to the notification, such as associated orders or system events. This query is helpful in scenarios where users or systems need detailed insights into a particular notification, such as retrieving full messages or auditing notifications sent to users.

Use cases include viewing detailed information about order updates, system notifications, or promotional messages, allowing users to view their full notification history and details.

<NodeGraph />

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />
