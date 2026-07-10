---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Getting started
description: Getting started with Amazon EventBridge plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';

<PluginLicense url="#commercial-use" />

<!-- <iframe width="100%" height="415" src="https://www.youtube.com/embed/MeBuwAflwM4?si=rhio4gjfDPau4eqB" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe> -->

---

[API Gateway](https://aws.amazon.com/api-gateway/) is an AWS service that allows you to create, publish, maintain, monitor, and secure APIs at any scale.

### Why use EventCatalog with Amazon API Gateway?

Using the EventCatalog Amazon API Gateway integration you can import your API Gateway specifications into EventCatalog. 

This allows you to visualize your API's, their endpoints, and the messages they send and receive. You can map the endpoints to commands, events and queries in your catalog and assign these to services and domains and teams in your organization.

EventCatalog will also allow you to download and view your OpenAPI specifications in the catalog directly, download schemas for each endpoint and see the requests/responses for each endpoint.

### Core Features

The EventCatalog Amazon API Gateway plugin can provide you with many features:

- ⭐️ Generate domains, services, channels and messages into your catalog
- ⭐️ Import and map your API Gateway specifications into EventCatalog
- ⭐️ Map API Gateway routes to commands, events and queries in your catalog
- ⭐️ Add semantic meaning to your API Gateway routes
- ⭐️ and more....

### How it works

![Example](/img/integrations/amazon-apigateway/amazon-apigateway.png)

This plugin will download OpenAPI specifications from your API Gateway and import them into EventCatalog. The API Gateway integration will add custom EventCatalog extensions onto your OpenAPI specification and then use the [OpenAPI plugin](/docs/plugins/openapi/intro) to import the specification into EventCatalog.

This will map your routes into commands, events and queries in your catalog and assign these to services and domains and teams in your organization.

## Commercial and License

This plugin requires an EventCatalog Scale license key to be used.

You can get a 30-day trial Scale license key by going to [EventCatalog Cloud](https://eventcatalog.cloud).

After the trial, you can continue using this plugin with EventCatalog Scale. 

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._

## License FAQ

### What is the license key for?
The EventCatalog Scale license key is required to use the Amazon API Gateway plugin with EventCatalog. It helps support ongoing development and maintenance of the plugin and project.

### How do I get an EventCatalog Scale license key?
You can obtain an EventCatalog Scale license key by visiting [EventCatalog Cloud](https://eventcatalog.cloud). Your organization can start with a 30-day trial.

### Terms
- **Trial Period**: 30-day free trial no credit card required
- **Support**: Discord community support (extra for priority support)

After your trial period ends, you can continue with EventCatalog Scale through [EventCatalog Cloud](https://eventcatalog.cloud).

## Issues

If you have any problems or feature requests please feel free to raise them on GitHub. https://github.com/event-catalog/generators or join our [Discord community](https://eventcatalog.dev/discord) to chat with the team and other users.