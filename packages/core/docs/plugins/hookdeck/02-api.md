---
sidebar_position: 2
keywords:
  - components
sidebar_label: Generator configuration
title: Hookdeck Generator API
description: Getting started with Hookdeck plugin
---

## Overview {#overview}

API for the EventCatalog Hookdeck generator.

**Example eventcatalog.config.js file**

```js title="eventcatalog.config.js"
export default {
  title: 'OurLogix',
  tagline: 'A comprehensive logistics and shipping management company',
  organizationName: 'OurLogix',
  homepageLink: 'https://eventcatalog.dev/',
  landingPage: '',
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
  trailingSlash: false,
  base: '/',
  logo: {
    alt: 'EventCatalog Logo',
    src: '/logo.png',
    text: 'OurLogix',
  },
  docs: {
    sidebar: {
      showPageHeadings: true,
    },
  },
  generators: [
    [
      "@hookdeck/eventcatalog-generator",
      {
        hookdeckApiKey: process.env.HOOKDECK_API_KEY,
        domain: "Payments",
        connectionSourcedMatch: "payments-.*",
        processMaxEvents: 200,
        logLevel: "debug",
      },
    ],
  ],
};

```

## Required fields {#required-fields}

### `hookdeckApiKey` {#hookdeckApiKey}

- Type: `String`

Hookdeck Project API Key to generate an EventCatalog visualization from.

```js title="eventcatalog.config.js"
[
  '@hookdeck/eventcatalog-generator',
  {
    hookdeckApiKey: process.env.HOOKDECK_API_KEY,
  },
],
```

## Optional fields {#optional-fields}

### `domain` {#domain}

The domain you want the services be associated with in your catalog.

- Type: `String`

```js title="eventcatalog.config.js"
[
  '@hookdeck/eventcatalog-generator',
  {
    hookdeckApiKey: process.env.HOOKDECK_API_KEY,
    domain: "Payments",
  },
],
```

### `connectionSourcedMatch` {#connectionSourcedMatch}

Regular expression match for Source names on Connections.

- Type: `String`

```js title="eventcatalog.config.js"
[
  '@hookdeck/eventcatalog-generator',
  {
    hookdeckApiKey: process.env.HOOKDECK_API_KEY,
    connectionSourcedMatch: "payments-.*",
  },
],
```

### `processMaxEvents` {#processMaxEvents}

The maximum number of Requests/Events to process per Source/Destination

- Type: `Integer`

```js title="eventcatalog.config.js"
[
  '@hookdeck/eventcatalog-generator',
  {
    hookdeckApiKey: process.env.HOOKDECK_API_KEY,
    processMaxEvents: 200,
  },
],
```

### `logLevel` {#logLevel}

The level to log at.

- Type: `fatal` | `error` | `warn` | `info` | `debug` | `trace`

```js title="eventcatalog.config.js"
[
  '@hookdeck/eventcatalog-generator',
  {
    hookdeckApiKey: process.env.HOOKDECK_API_KEY,
    logLevel: "debug",
  },
],
```
