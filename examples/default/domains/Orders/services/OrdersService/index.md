---
id: OrdersService
version: 0.0.3
name: Orders Service
summary: |
  Service that handles orders
owners:
    - dboyne
receives:
  - id: InventoryAdjusted
    version: 0.0.3
  - id: GetOrder
sends:
  - id: OrderAmended
  - id: OrderCancelled
  - id: OrderConfirmed
  - id: AddInventory  
    version: 0.0.3
repository:
  language: JavaScript
  url: https://github.com/event-catalog/pretend-shipping-service
schemaPath: "openapi.yml"
specifications:
  asyncapiPath: order-service-asyncapi.yaml
  openapiPath: openapi.yml
---

import Footer from '@catalog/components/footer.astro';

## Overview

The Orders Service is responsible for managing customer orders within the system. It handles order creation, updating, status tracking, and interactions with other services such as Inventory, Payment, and Notification services to ensure smooth order processing and fulfillment.

<Tiles >
    <Tile icon="DocumentIcon" href={`/docs/services/${frontmatter.id}/${frontmatter.version}/changelog`}  title="View the changelog" description="Want to know the history of this service? View the change logs" />
    <Tile icon="UserGroupIcon" href="/docs/teams/full-stack" title="Contact the team" description="Any questions? Feel free to contact the owners" />
    <Tile icon="BoltIcon" href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Sends ${frontmatter.sends.length} messages`} description="This service sends messages to downstream consumers" />
    <Tile icon="BoltIcon"  href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Receives ${frontmatter.receives.length} messages`} description="This service receives messages from other services" />
</Tiles>

## Architecture diagram 

<NodeGraph />

<Footer />