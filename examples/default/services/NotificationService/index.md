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
    version: 0.0.1
repository:
  language: JavaScript
  url: https://github.com/boyney123/pretend-shipping-service
---

## Overview

The Notification Service is responsible for managing and delivering notifications to users and other services. It supports various notification channels such as email, SMS, push notifications, and in-app notifications. The service ensures reliable and timely delivery of messages and integrates with other services to trigger notifications based on specific events.

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