---
sidebar_position: 1
keywords:
  - backstage
sidebar_label: Backstage configuration
title: Backstage configuration
description: Getting started with Backstage and EventCatalog plugin
---

## Overview {#overview}

Add the following to your `app-config.yaml` file.

```yaml title="app-config.yaml"
# Backstage configrations...

# eventcatalog plugin configuration
eventcatalog:
  # URL of your catalog (has to be public, if private please raise and issue and we can fix this)
  URL: "https://demo.eventcatalog.dev"
```

### Mapping your resources

You can use backstage `annotations` to map your resources to EventCatalog resources.

```yaml title="example-service.yaml"
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: example-service
  annotations:
    # The id of the resource in EventCatalog
    eventcatalog.dev/id: "example-service"
    # The version of the resource in EventCatalog (optional, latest is used if not provided)
    eventcatalog.dev/version: "1.0.0" 
    # The collection of the resource in EventCatalog (optional, uses the entity kind if not provided)
    eventcatalog.dev/collection: "services"
```

| Annotation | Required | Default | Description |
|------------|----------|---------|-------------|
| `eventcatalog.dev/id` | Yes | - | The id of the resource in EventCatalog |
| `eventcatalog.dev/version` | No | `latest` | The version of the resource in EventCatalog |
| `eventcatalog.dev/collection` | No | Uses the entity kind | The collection of the resource in EventCatalog. Options include `services`, `domains`, `queries`, `commands`, `events` |




Looking for more mappings? Let us know! Raise an issue on [GitHub](https://github.com/event-catalog/backstage-plugin-eventcatalog).

