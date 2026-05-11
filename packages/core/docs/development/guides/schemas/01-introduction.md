---
sidebar_position: 1
keywords:
- EventCatalog Schemas
sidebar_label: Getting started
title: Getting started with schemas
description: Getting started with schemas in EventCatalog
---

EventCatalog supports **any schema or specification format**, including (but not limited to):

- JSON / YAML
- Avro
- Protobuf
- GraphQL
- OpenAPI
- AsyncAPI

Schemas are **optional**, but they add valuable context to your messages and services by making data structures explicit and discoverable.

---

## Why add schemas?

By adding schemas to your messages and services, you unlock several benefits:

- **Schema Explorer** – Quickly find and browse schemas [(see demo)](https://demo.eventcatalog.dev/schemas/explorer)
- **Fields Explorer** – Browse every schema field catalog-wide, search across formats, and trace fields to the services that produce and consume them [(see guide)](/docs/development/guides/schemas/fields-explorer)
- **API access** – Access schemas programmatically through the EventCatalog API [(see guide)](/docs/development/guides/schemas/schema-api)
- **Ask questions** – Query and explore schemas using the [EventCatalog MCP](/docs/development/ask-your-architecture/mcp-server/introduction)
- **Visualization** – Help developers understand data structures using [schema property search and visualization](/docs/development/components/components/schema-viewer)
- **Field Usage** – Track which services depend on specific fields to understand the impact of schema changes [(see guide)](/docs/development/guides/schemas/field-usage)

---

## Adding schemas to messages

You can attach one or more schemas to any message type:

- **Commands** -
- **Queries**
- **Events**

Get started by following the relevant guide:

- [Adding schemas to commands](/docs/development/guides/messages/common/adding-schemas)
- [Adding schemas to queries](/docs/development/guides/messages/common/adding-schemas)
- [Adding schemas to events](/docs/development/guides/messages/common/adding-schemas)

---

## Adding specifications to services

In addition to message-level schemas, services can render full API and messaging specifications, including:

- **AsyncAPI**
- **OpenAPI**
- **GraphQL**

Use the guides below to add specifications to your services:

- [Adding AsyncAPI specifications to services](/docs/development/guides/services/adding-to-services/asyncapi)
- [Adding OpenAPI specifications to services](/docs/development/guides/services/adding-to-services/openapi)
- [Adding GraphQL schemas to services](/docs/development/guides/services/adding-to-services/graphql)
