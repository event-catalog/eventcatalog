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

<AddedIn version="2.6.0"/>
<PluginLicense url="#commercial-use" />

<iframe width="100%" height="415" src="https://www.youtube.com/embed/MeBuwAflwM4?si=rhio4gjfDPau4eqB" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

[Amazon EventBridge](https://aws.amazon.com/eventbridge/) is an AWS service that helps developers build event-driven applications at scale. Amazon EventBridge offers mutiple solutions including [Event Bus](https://aws.amazon.com/eventbridge/), [Amazon EventBridge Pipes](https://aws.amazon.com/eventbridge/) and [Amazon EventBridge Scheduler](https://aws.amazon.com/eventbridge/).

Amazon EventBridge also offers [a schema registry](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema.html). This registry help you store your events in JSON and OpenAPI formats, give you the ability to download code bindings and also manage schema versions with automatic schema discovery.

Using the [schema discovery feature](https://aws.amazon.com/blogs/compute/introducing-amazon-eventbridge-schema-registry-and-discovery-in-preview/), as events are put onto the event bus they are versioned and stored in the registry. These schemas can be used to help you and your teams understand and discover events in your event-driven architecture.

Although EventBridge offers managed schema solutions, [there is a still an issue of discoverabilty and documentation for your events, services and domains](https://www.youtube.com/watch?v=VLUvfIm9wnQ&t=4s). It still remains difficult to organize your event-driven architecture for governance. 

### Why use EventCatalog with EventBridge?

Using the EventCatalog EventBridge generator you can automate and generate your EventCatalog. Enable your teams to quickly find events from EventBridge, what services they belong too and how to start consuming them.


### Core Features

The EventCatalog Amazon EventBridge plugin can provide you with many features:

- ⭐️ Generate domains, services, channels and messages into your catalog
- ⭐️ [Automatically version your changes in EventCatalog in sync with your registry versions](#automatic-versioning)
- ⭐️ [Allow you to write and persist custom markdown between changes](#persist-markdown)
- ⭐️ [Display your JSONDraft and OpenAPI schemas for each event in EventCatalog](#downloading-schemas)
- ⭐️ [Filter events to match to your services](#using-filters-to-map-events-to-your-services)
- ⭐️ Visualize your architecture
- ⭐️ Download schemas and code bindings
- ⭐️ and more....

### How it works

![Example](/img/integrations/eventbridge/eventbridge.png)

EventCatalog supports [generators](/docs/plugins/generators). These are scripts or plugins that can be run to integrate with any external API, system or specification files. EventCatalog also provides an [SDK](/docs/sdk) to give developers easier access to their catalogs through custom scripts or generators.

The EventCatalog EventBridge plugin let's you map your events into domains and services. You can use [custom filters (prefix, suffix, detailType and source)](#using-filters-to-map-events-to-your-services) to map which events you want your service to produce and consume.

You can also use the EventCatalog plugin to map ALL events from your registry into your system and not map them into services if you wish to have a direct import.

