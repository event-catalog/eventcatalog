---
sidebar_position: 3
keywords:
  - components
sidebar_label: Generator CLI
title: Hookdeck Generator CLI
description: Getting started with Hookdeck plugin as a CLI
---

## Overview {#overview}

The Hookdeck EventCatalog plugin can be run as a CLI.

## Run the generator as a CLI

```sh
npx @hookdeck/eventcatalog-generator {flags}
```

Supported flags are:

- `dir`: **Required**. Path the the EventCatalog install directory
- `api-key`: **Required**. Hookdeck Project API Key
- `log-level`: The level to log at - "fatal" | "error" | "warn" | "info" | "debug" | "trace"
- `match`: Regular expression match for Source names on Connections
- `max-events`: The maximum number of Requests/Events to process per Source/Destination

Example:

```sh
npx @hookdeck/eventcatalog-generator \
    --dir ./path/to/eventcatalog/install \
    --api-key {HOOKDECK_API_KEY} \
    --log-level debug \
    --match "stripe-production" \
    --domain Payments \
    --max-events 200
```

The CLI will also use the following environment variables:

- `PROJECT_DIR`: Path the the EventCatalog install directory
- `HOOKDECK_PROJECT_API_KEY`: Hookdeck Project API Key

The environment variables can be within a `.env` file that will automatically be detected.