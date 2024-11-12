---
id: NotificationService
version: 0.0.2
name: Notifications
summary: |
  Service that handles orders
owners:
    - dboyne
receives:
  - id: InventoryAdjusted
    version: ">1.0.0"
  - id: PaymentProcessed
    version: ^1.0.0
  - id: GetUserNotifications
    version: x
  - id: GetNotificationDetails
    version: x
sends:
  - id: OutOfStock
    version: latest
  - id: GetInventoryList
    version: 0.0.x
repository:
  language: JavaScript
  url: https://github.com/event-catalog/pretend-shipping-service
---

import Footer from '@catalog/components/footer.astro';

## Overview

The Notification Service is responsible for managing and delivering notifications to users and other services. It supports various notification channels such as email, SMS, push notifications, and in-app notifications. The service ensures reliable and timely delivery of messages and integrates with other services to trigger notifications based on specific events.

<Tiles >
    <Tile icon="DocumentIcon" href={`/docs/services/${frontmatter.id}/${frontmatter.version}/changelog`}  title="View the changelog" description="Want to know the history of this service? View the change logs" />
    <Tile icon="UserGroupIcon" href="/docs/teams/full-stack" title="Contact the team" description="Any questions? Feel free to contact the owners" />
    <Tile icon="BoltIcon" href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Sends ${frontmatter.sends.length} messages`} description="This service sends messages to downstream consumers" />
    <Tile icon="BoltIcon"  href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Receives ${frontmatter.receives.length} messages`} description="This service receives messages from other services" />
</Tiles>


## Architecture diagram

<NodeGraph />

## Core Concepts

<AccordionGroup>
  <Accordion title="Notification">
    - Description: A message that is sent to a user or a service.
    - Attributes: notificationId, type, recipient, content, channel, status, timestamp
  </Accordion>
  <Accordion title="Channel">
    - Description: The medium through which the notification is delivered (e.g., email, SMS, push notification).
    - Attributes: channelId, name, provider, configuration 
  </Accordion>
</AccordionGroup>

<Footer />