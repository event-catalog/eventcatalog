---
sidebar_position: 2
sidebar_label: Supported resources
title: Supported resources
description: Resource types and capabilities currently supported by EventCatalog Editor.
---

EventCatalog Editor can browse and edit the main EventCatalog resource types.

| Resource type | Browse | Edit docs | Edit metadata | Create | Delete | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| [Domain](/docs/development/guides/domains/introduction) | Yes | Yes | Yes | Yes | Yes | Supports services, messages, entities, specifications, and ubiquitous language |
| [Service](/docs/development/guides/resources/services/introduction) | Yes | Yes | Yes | Yes | Yes | Supports message relationships, data store relationships, and specifications |
| [Event](/docs/development/guides/resources/messages/message-types/events) | Yes | Yes | Yes | Yes | Yes | Supports schemas and producer/consumer relationships |
| [Command](/docs/development/guides/resources/messages/message-types/commands) | Yes | Yes | Yes | Yes | Yes | Supports schemas, operations, and producer/consumer relationships |
| [Query](/docs/development/guides/resources/messages/message-types/queries) | Yes | Yes | Yes | Yes | Yes | Supports schemas, operations, and producer/consumer relationships |
| [Channel](/docs/development/guides/resources/messages/message-channels/introduction) | Yes | Yes | Yes | Yes | Yes | Supports common metadata |
| [Entity](/docs/development/guides/resources/entities/introduction) | Yes | Yes | Yes | Yes | Yes | Supports common metadata |
| [Data store](/docs/development/guides/resources/data/introduction) | Yes | Yes | Yes | Yes | Yes | Represented as EventCatalog container resources |
| [Flow](/docs/development/guides/resources/flows/introduction) | Yes | Yes | Yes | Yes | Yes | Supports flow step editing |
| [User](/docs/development/guides/owners/what-are-teams-and-users) | Yes | Yes | Yes | Yes | Yes | Versionless |
| [Team](/docs/development/guides/owners/what-are-teams-and-users) | Yes | Yes | Yes | Yes | Yes | Versionless |

## Schemas

Schemas are supported on:

- [Events](/docs/development/guides/resources/messages/message-types/events)
- [Commands](/docs/development/guides/resources/messages/message-types/commands)
- [Queries](/docs/development/guides/resources/messages/message-types/queries)

## Specifications

Specifications are supported on:

- [Domains](/docs/development/guides/domains/introduction)
- [Services](/docs/development/guides/resources/services/introduction)

Supported specification types:

- OpenAPI
- AsyncAPI
- GraphQL

## Versionless resources

Users and teams are versionless in EventCatalog. Other resources use versions.

## Beta limitations

Some advanced resource fields may still require source mode. If a visual field is missing, switch to source mode and edit the underlying Markdown, MDX, or frontmatter directly.
