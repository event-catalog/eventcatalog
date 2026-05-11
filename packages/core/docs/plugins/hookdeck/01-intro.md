---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Getting started
description: Getting started with Hookdeck plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';

[Hookdeck](https://hookdeck.com?ref=eventcatalog-docs) is an event gateway that provides serverless infrastructure, features, tooling to enable the full software development lifecycle of event-driven applications.

Using the EventCatalog Hookdeck plugin you can extract information from Hookdeck to gain further understanding of event sources, destinations, and flows within the Hookdeck platform.

### Core Features

The Hookdeck plugin can provide you with the following features:

- ⭐️ [Generate EventCatalog Services](#generate-services) from Hookdeck Sources and Destinations
- ⭐️ [Auto-generate EventCatalog Messages](#generate-messages) from Hookdeck Requests and Events
- ⭐️ [Auto-generate EventCatalog Message Schemas](#generate-schemas) from Hookdeck Requests and Events
- ⭐️ [Provide insight into Hookdeck Filters](#filtered-messages) by indicating Requests that are received by an EventCatalog Service but are not connected to destination Service.

### How it works

EventCatalog supports [generators](/docs/plugins/generators). These are scripts or plugins that can be run to integrate with any external API, system or specification files. EventCatalog also provides an [SDK](/docs/sdk) to give developers easier access to their catalogs through custom scripts or generators.

The EventCatalog Hookdeck plugin queries the [Hookdeck API](https://hookdeck.com/docs/api?ref=eventcatalog-docs) to generate an EventCatalog visualization including Services and Messages. It also generates inferred Message schemas.

The plugin can either be used as a plugin within an EventCatalog instance or as a CLI configured to point to an EventCatalog instance.


### Getting started

#### 1. Install the plugin

```sh
npm i @hookdeck/eventcatalog-generator
```

#### 2. Configure your generator in your `eventcatalog.config.js` file

```js title="eventcatalog.config.js"
/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
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

#### 3. Run the generate command

_This command will run the generators in your eventcatalog.config.js file._

```sh
npm run generate
```

#### 4. View your catalog

Run your catalog locally to see the changes:

```sh
npm run dev
```

![Example](/img/integrations/hookdeck/example.png)

## Hookdeck Concepts

### Sources

A Hookdeck [Source](https://hookdeck.com/docs/sources?ref=eventcatalog-docs) represents any service that makes an HTTP request to Hookdeck. The HTTP requests can be inbound events such as webhooks or asynchronous API calls.

### Destinations

A Hookdeck [Destination](https://hookdeck.com/docs/destinations?ref=eventcatalog-docs) represents the destination for an event to be routed to. A destination can be connected to one or many Sources.

### Connections

[Connections](https://hookdeck.com/docs/connection?ref=eventcatalog-docs) in Hookdeck route an event from a Source to a Destination. Connections can reuse sources and destinations, allowing one event to be routed to multiple destinations.

### Event lifecycle

The following represent different stages of the lifecycle of an event within Hookdeck:

- [Requests](https://hookdeck.com/docs/requests?ref=eventcatalog-docs): An HTTP request received by a Source URL defined within Hookdeck, such as a webhook.
- [Events](https://hookdeck.com/docs/events?ref=eventcatalog-docs): An outbound event payload that Hookdeck has queued for delivery.
- [Attempts](https://hookdeck.com/docs/attempts?ref=eventcatalog-docs): An HTTP delivery attempt to the URL defined by a Destination.

## Features

### Generate EventCatalog Services {#generate-services}

The Hookdeck plugin generates EventCatalog Services from Sources and Destinations that are used within defined Hookdeck Connections. The Sources and Destinations that have Services created can be filtered using the `connectionSourcedMatch` configuration option which performs a regular expression match on the connection source name.

### Auto-generate EventCatalog Messages {#generate-message}

EventCatalog Messages are generated for Requests received by a Source and Events received by a Destination. The number of Hookdeck Request and Events to have EventCatalog Messages generated can be set using the `processMaxEvents` configuration option.

By default, the plugin search for a `type` or `eventType` property on the event payload to uniquely identify a Request or Event type. If the property cannot be found, each Request or Event is treated as a unique Message within EventCatalog.

### Auto-generate EventCatalog Message Schemas {#generate-schemas}

Hookdeck does not presently support schemas. Therefore, a Message schema can only be inferred from an event payload. The Hookdeck EventCatalog plugin generates inferred schemas for the first instance of an Event type and Request type it processes.

### Provide insight into Hookdeck Filters {#filtered-messages}

Hookdeck supports the ability to [filter events](https://hookdeck.com/docs/filters?ref=eventcatalog-docs) based on header or body contents. This can result in Sources receiving Requests but not Events being generated. EventCatalog's visual representation help you identify where events are being entirely filtered out and not delivered to any destination service.

## Commercial Use

This plugin is free to use for commercial use.

## Source

https://github.com/hookdeck/eventcatalog-generator

## Issues

If you have any problems or feature requests please raise them on GitHub: https://github.com/hookdeck/eventcatalog-generator/issues

