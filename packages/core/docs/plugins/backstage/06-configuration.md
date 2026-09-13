---
sidebar_position: 7
sidebar_label: Configuration reference
title: Backstage plugin configuration reference
description: Reference for the EventCatalog base URL and Backstage entity annotations.
keywords:
  - backstage
  - app-config
  - annotations
---

## Backstage app configuration

Configure one EventCatalog base URL in Backstage:

```yaml title="app-config.yaml"
eventcatalog:
  URL: https://demo.eventcatalog.dev
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `eventcatalog.URL` | string | Yes | Base URL of the EventCatalog instance. The browser displaying Backstage must be able to reach it. |

Configure the EventCatalog origin, without an EventCatalog page path such as `/docs`, `/discover`, or `/visualiser`.

## Entity annotations

Add these annotations to a Backstage catalog entity:

```yaml
metadata:
  annotations:
    eventcatalog.dev/id: order-service
    eventcatalog.dev/version: 1.0.0
    eventcatalog.dev/collection: services
```

| Annotation | Required | Default | Description |
| --- | --- | --- | --- |
| `eventcatalog.dev/id` | Yes for resource views | None | EventCatalog resource ID. |
| `eventcatalog.dev/version` | No | Latest resource page where supported | EventCatalog resource version. Entity maps, specific system context maps, and flows should provide a version. |
| `eventcatalog.dev/collection` | No | Inferred for Backstage services, APIs, and domains | EventCatalog collection containing the resource. |

Supported collections include:

- `agents`
- `commands`
- `containers`
- `data-products`
- `domains`
- `entities`
- `events`
- `flows`
- `queries`
- `services`
- `systems`
- `teams`

For a Backstage `Component` with `spec.type: service`, and for a Backstage `API`, the inferred collection is `services`. For a Backstage `Domain`, it is `domains`. Other entity kinds should set `eventcatalog.dev/collection` explicitly.

## Prop overrides

Component props override annotations. For example, this always displays the `ordering` domain even when the current Backstage entity maps to another resource:

```tsx
<EventCatalogDocumentationEntityPage
  page="entity-map"
  id="ordering"
  version="1.0.0"
  collection="domains"
/>
```

`type` is an alias for `collection` and accepts singular or plural values. Known singular resource types are converted to their plural collection, so `type="service"` resolves to `services`.

## EventCatalog license configuration

For commercial use, set the Scale license key in the EventCatalog deployment rather than the Backstage app:

```bash title=".env"
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key
```

Existing Backstage-specific keys can continue to use `EVENTCATALOG_LICENSE_KEY_BACKSTAGE`, but new deployments should use `EVENTCATALOG_SCALE_LICENSE_KEY`. See [Getting a license key for integrations](/docs/development/license-keys/integrations).
