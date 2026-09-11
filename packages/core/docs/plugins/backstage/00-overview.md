---
sidebar_position: 1
sidebar_label: Overview
title: EventCatalog for Backstage
description: Add EventCatalog documentation, diagrams, schemas, messages, and flows to Backstage entity pages.
keywords:
  - backstage
  - developer portal
  - integration
---

import PluginLicense from '@site/src/components/MDX/PluginLicense';

<PluginLicense url="#licensing" />

The EventCatalog Backstage plugin embeds EventCatalog views in Backstage entity pages. Developers can explore architecture documentation without leaving the software catalog they use for ownership, APIs, dependencies, and operations.

![EventCatalog embedded in a Backstage entity page](/img/integrations/backstage/backstage-eventcatalog.png)

## Choose where to start

- New to the plugin? Follow [Embed EventCatalog in your first Backstage entity](/docs/plugins/backstage/get-started).
- Adding a dedicated entity tab? Use [Embed EventCatalog as entity tabs](/docs/plugins/backstage/embed-entity-tabs).
- Adding content to an existing overview? Use [Add EventCatalog cards to an overview page](/docs/plugins/backstage/add-overview-cards).
- Need exact props or supported components? See the [component reference](/docs/plugins/backstage/components).
- Upgrading from the legacy resource mapping? Follow [Migrate to entity annotations](/docs/plugins/backstage/migrate-to-annotations).

## Supported views

You can embed:

- resource documentation
- resource visualizers
- message discovery tables
- entity maps
- the schema explorer
- the Architecture Graph, focused on a resource at depth 1, 2, or 3
- the System Context Map overview or a specific system and version
- a flow visualizer for a specific flow and version

Every page and card accepts `theme="light"` or `theme="dark"`. If you omit `theme`, EventCatalog uses the visitor's saved EventCatalog theme.

## How the integration fits together

The plugin reads the EventCatalog base URL from Backstage configuration and normally reads the EventCatalog resource identity from annotations on the current Backstage entity. It then renders the selected EventCatalog view in an iframe with embed mode enabled.

Read [How EventCatalog embeds work](/docs/plugins/backstage/how-embeds-work) for the mapping, rendering, and sizing model.

## Licensing

The plugin requires an EventCatalog Scale license for commercial use. You can start a 30-day trial in [EventCatalog Cloud](https://eventcatalog.cloud) and follow [Getting a license key for integrations](/docs/development/license-keys/integrations).

For license terms, see the [plugin repository](https://github.com/event-catalog/backstage-plugin-eventcatalog).
