---
sidebar_position: 1
keywords:
- apicurio
- schema registry
sidebar_label: Introduction
title: Introduction
description: Getting started with Apicurio Registry plugin
---


import AddedIn from '@site/src/components/MDX/AddedIn';

import PluginLicense from '@site/src/components/MDX/PluginLicense';

<PluginLicense url="#commercial-use" />


<iframe width="100%" height="415" src="https://www.youtube.com/embed/0DmGWa0sr6w?si=KsE4D9C_yN7998Vo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


---

Many teams building event-driven architectures use schema registries to manage their message schemas and API specifications.

[Apicurio Registry](https://www.apicur.io/registry/) is an open-source schema registry that provides a centralized location to store and manage schemas for your event-driven applications. It supports multiple schema formats including Avro, JSON Schema, Protobuf, AsyncAPI, and OpenAPI.

We believe schema registries are a great foundation, but there's significant value in adding semantic meaning to your schemas, assigning them to services and domains, and creating comprehensive documentation around your architecture.

The [EventCatalog Apicurio Registry plugin](https://github.com/event-catalog/generators/tree/main/packages/generator-apicurio) allows you to import your schemas and specifications from Apicurio Registry into EventCatalog. Keep your architecture documentation in sync with your registry while unlocking additional visualization and documentation capabilities.

:::info
**What is Apicurio Registry?**: An open-source schema registry for event-driven architectures. Use it to store and manage your event schemas and API specifications. Learn more at the [Apicurio website](https://www.apicur.io/registry/).
:::

### Core Features of the Apicurio Registry plugin

The EventCatalog Apicurio Registry plugin provides you with many powerful features:

- ⭐️ Import schemas and specifications from your Apicurio Registry into EventCatalog
- ⭐️ Keep schemas in sync with your architecture documentation
- ⭐️ Automatic versioning - as your schemas change they are versioned in EventCatalog alongside your documentation
- ⭐️ Support for multiple schema formats (Avro, JSON Schema, Protobuf, AsyncAPI, OpenAPI)
- ⭐️ Add semantic meaning (markdown) to your schemas - provide business context and added value
- ⭐️ Use custom filters (prefix, suffix, exact matches) to select which schemas to import
- ⭐️ Assign schemas to services and domains
- ⭐️ Document your schemas as commands, events, or queries
- ⭐️ Integrate with OpenAPI and AsyncAPI plugins to generate complete service documentation
- ⭐️ Visualize your event-driven architecture with the [EventCatalog Visualizer](/features/visualization)
- ⭐️ Download and view schemas directly in EventCatalog
- ⭐️ Talk to your schemas, services, and domains with the [EventCatalog Chat](/features/ai-assistant)
- ⭐️ Support for Bearer token authentication for secured registries
- ⭐️ and more....

### How it works

1. Install the Apicurio Registry plugin
1. Configure the plugin (schemas, services, domains, specifications)
1. Run the plugin to import your schemas into EventCatalog
1. View and deploy your catalog

![Apicurio Registry plugin](./images/apicurio.png)

**What are generators?**

EventCatalog supports [generators](/docs/plugins/generators). These are scripts or plugins that can be run to integrate with any external API, system, or specification files. EventCatalog also provides an [SDK](/docs/sdk) to give developers easier access to their catalogs through custom scripts or generators.

The EventCatalog Apicurio Registry plugin is a generator. It will import your schemas and specifications from your Apicurio Registry into EventCatalog.

## Commercial and License

This plugin requires an EventCatalog Scale license key to be used.

You can get a 30-day trial Scale license key by going to [EventCatalog Cloud](https://eventcatalog.cloud).

After the trial, you can continue using this plugin with EventCatalog Scale.

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._

## Need a demo?

If you would like a demo of the plugin, please feel free to reach out to us and book a time to chat at hello@eventcatalog.dev.

## License FAQ

### What is the license key for?
The EventCatalog Scale license key is required to use the Apicurio Registry plugin with EventCatalog. It helps support ongoing development and maintenance of the plugin and project.

### How do I get an EventCatalog Scale license key?
You can obtain an EventCatalog Scale license key by visiting [EventCatalog Cloud](https://eventcatalog.cloud). New users can start with a 30-day free trial.

### Terms
- **Trial Period**: 30-day free trial no credit card required
- **Support**: Discord community support (extra for priority support)

After your trial period ends, you can continue with EventCatalog Scale through [EventCatalog Cloud](https://eventcatalog.cloud).

## Any questions or need help?

If you have questions or need help, you can join our [Discord community](https://eventcatalog.dev/discord) or raise an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues).
