---
id: adr-016-keep-notifications-async
name: "ADR-016: Keep customer notifications asynchronous"
summary: Notification sending is triggered from events and queues so order and subscription workflows are not blocked by notification providers.
version: 1.0.0
status: accepted
date: 2025-02-06
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: service
    id: NotificationService
  - type: container
    id: notifications-queue
  - type: channel
    id: notifications-queue
  - type: query
    id: GetUserNotifications
related:
  - id: adr-001-choose-event-driven-orders
badges:
  - content: Notifications
    backgroundColor: amber
    textColor: amber
---

## Context

Order and subscription workflows notify customers through email, SMS, and in-app channels. Provider latency should not determine workflow availability.

## Decision

NotificationService consumes events and queue messages asynchronously. Core workflows record intent and continue without waiting for provider delivery.

## Consequences

Customer communication can be retried and observed independently. User-facing screens need notification status queries when delivery confirmation matters.
