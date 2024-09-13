---
id: InventoryService
version: 0.0.2
name: Inventory Service
summary: |
  Service that handles the inventory
owners:
    - dboyne
    - full-stack
    - mobile-devs
receives:
  - id: OrderConfirmed
    version: 0.0.1
  - id: OrderCancelled
    version: 0.0.1
  - id: OrderAmended
    version: 0.0.1
  - id: UpdateInventory
    version: 0.0.3
  - id: AddInventory
    version: x
sends:
  - id: InventoryAdjusted
    version: 0.0.4
  - id: OutOfStock
    version: 0.0.3
repository:
  language: JavaScript
  url: https://github.com/boyney123/pretend-shipping-service
---

import Footer from '@catalog/components/footer.astro';



## Overview

The Inventory Service is a critical component of the system responsible for managing product stock levels, tracking inventory movements, and ensuring product availability. It interacts with other services to maintain accurate inventory records and supports operations such as order fulfillment, restocking, and inventory audits.

<Tiles >
    <Tile icon="DocumentIcon" href={`/docs/services/${frontmatter.id}/${frontmatter.version}/changelog`}  title="View the changelog" description="Want to know the history of this service? View the change logs" />
    <Tile icon="UserGroupIcon" href="/docs/teams/full-stack" title="Contact the team" description="Any questions? Feel free to contact the owners" />
    <Tile icon="BoltIcon" href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Sends ${frontmatter.sends.length} messages`} description="This service sends messages to downstream consumers" />
    <Tile icon="BoltIcon"  href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Receives ${frontmatter.receives.length} messages`} description="This service receives messages from other services" />
</Tiles>


## Architecture diagram

<NodeGraph title="Hello world" />

<Footer />