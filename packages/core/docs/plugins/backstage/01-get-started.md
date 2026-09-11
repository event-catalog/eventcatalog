---
sidebar_position: 2
sidebar_label: Get started
title: Embed EventCatalog in your first Backstage entity
description: Install the EventCatalog Backstage plugin and add resource documentation to an entity page.
keywords:
  - backstage
  - tutorial
  - installation
---

In this tutorial, you will connect a Backstage app to an EventCatalog instance and add an EventCatalog documentation tab to a service entity.

You will need:

- a Backstage app with a software catalog entity page
- an EventCatalog instance that the user's browser can reach
- an EventCatalog Scale license for commercial use

## 1. Enable the integration in EventCatalog

Add your Scale license key to the `.env` file in the EventCatalog project:

```bash title=".env"
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key
```

Build and deploy EventCatalog with this environment variable. For license setup and legacy keys, see [Getting a license key for integrations](/docs/development/license-keys/integrations).

## 2. Install the Backstage plugin

From the root of your Backstage app, install the frontend plugin:

```bash
yarn add @eventcatalog/backstage-plugin-eventcatalog
```

## 3. Configure the EventCatalog URL

Add the public base URL of your EventCatalog instance to `app-config.yaml`:

```yaml title="app-config.yaml"
eventcatalog:
  URL: https://demo.eventcatalog.dev
```

Do not add a trailing view path such as `/docs` or `/visualiser`. The plugin builds each embed URL from this base URL.

## 4. Map a Backstage entity

Add EventCatalog annotations to a Backstage catalog entity. This example maps a Backstage component to version `1.0.0` of the `order-service` service in EventCatalog:

```yaml title="catalog-info.yaml"
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: order-service
  description: Handles customer orders
  annotations:
    eventcatalog.dev/id: order-service
    eventcatalog.dev/version: 1.0.0
    eventcatalog.dev/collection: services
spec:
  type: service
  lifecycle: production
  owner: team-orders
```

The annotation values must match the resource ID, version, and collection in EventCatalog.

## 5. Add an EventCatalog tab

Open the file that defines your catalog entity page, commonly `packages/app/src/components/catalog/EntityPage.tsx`.

Import the page component:

```tsx
import { EventCatalogDocumentationEntityPage } from '@eventcatalog/backstage-plugin-eventcatalog';
```

Add a route inside the `EntityLayout` used for your service entities:

```tsx
<EntityLayout.Route path="/eventcatalog-docs" title="EventCatalog: Docs">
  <EventCatalogDocumentationEntityPage page="docs" />
</EntityLayout.Route>
```

## 6. Check the result

Start Backstage and open the mapped service. Select **EventCatalog: Docs**.

You should see the `order-service` documentation from EventCatalog fill the tab. If you see a mapping message instead, check that `eventcatalog.dev/id` is present and that the entity has been re-ingested by Backstage.

You now have a working EventCatalog embed. Next, [add more entity tabs](/docs/plugins/backstage/embed-entity-tabs) or [place visualizations on the overview page](/docs/plugins/backstage/add-overview-cards).
