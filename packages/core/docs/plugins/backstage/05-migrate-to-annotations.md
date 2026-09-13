---
sidebar_position: 6
sidebar_label: Migrate legacy mappings
title: Migrate legacy resource mappings to entity annotations
description: Replace pre-1.0 Backstage app configuration mappings with EventCatalog entity annotations.
keywords:
  - backstage
  - migration
  - annotations
---

Plugin versions before 1.0 mapped Backstage names to EventCatalog IDs in `app-config.yaml`:

```yaml title="app-config.yaml"
eventcatalog:
  URL: https://demo.eventcatalog.dev
  services:
    - backstage-name: order-service
      eventcatalog-id: order-service
      eventcatalog-version: 1.0.0
```

Move each resource mapping to the matching Backstage entity:

```yaml title="catalog-info.yaml"
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: order-service
  annotations:
    eventcatalog.dev/id: order-service
    eventcatalog.dev/version: 1.0.0
    eventcatalog.dev/collection: services
spec:
  type: service
  lifecycle: production
  owner: team-orders
```

Keep only the EventCatalog base URL in `app-config.yaml`:

```yaml title="app-config.yaml"
eventcatalog:
  URL: https://demo.eventcatalog.dev
```

Re-ingest the entity in Backstage, then open an EventCatalog tab or card and verify that it resolves the expected resource. Repeat for every legacy `services` and `apis` mapping.

See the [configuration reference](/docs/plugins/backstage/configuration) for annotation defaults and supported collections.
