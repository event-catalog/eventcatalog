---
id: GetSubscriptionStatus
name: Get subscription status
version: 0.0.2
summary: |
  GET request that will return the current subscription status for a specific user, identified by their userId.
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

The `GetSubscriptionStatus` message is a query used to retrieve the current subscription status for a specific user, identified by their `userId`. This query returns detailed information about the user's subscription, such as its current status (active, canceled, expired), the subscription tier or plan, and the next billing date. It is typically used by systems that manage user subscriptions, billing, and renewal processes to ensure that users are aware of their subscription details and any upcoming renewals.

This query is particularly useful in managing subscriptions for SaaS products, media services, or any recurring payment-based services where users need to manage and view their subscription information.

<NodeGraph />

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />