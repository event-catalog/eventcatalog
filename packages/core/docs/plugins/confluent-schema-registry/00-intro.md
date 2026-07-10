---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Introduction
description: Getting started with AsyncAPI plugin
---


<!-- import PluginLicense from '@site/src/components/MDX/PluginLicense'; -->

<!-- <PluginLicense url="#commercial-use" /> -->

<iframe width="100%" height="515" src="https://www.youtube.com/embed/NMZKnPKx-L0?si=og1Nvnr3FfPfAqn4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

Many folks building event-driven architecture are using [Apache Kafka](https://kafka.apache.org/) as their broker of choice. 

[Confluent](https://www.confluent.io/) is a popular provider for Kafka and has a [Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html) that can be used to store and manage your schemas.

We believe schema registries can only go so far, and there is a lot of value adding semantic meaning to your schemas, assigning them owners, topics, services and domains.

The [EventCatalog Confluent Schema Registry plugin](https://github.com/event-catalog/generators/tree/main/packages/generator-confluent-schema-registry) allows you to import your schemas into EventCatalog and keep them in sync along side your documentation. You can visualize your architecture and unlock value from your schema registries.

:::info
**What is Confluent Schema Registry?**: A schema registry for Apache Kafka. Use this to store and manage your schemas. You can read more about it on the [Confluent website](https://docs.confluent.io/platform/current/schema-registry/index.html).
:::

### Core Features of the Confluent Schema Registry plugin

The EventCatalog Confluent Schema Registry plugin can provide you with many features:

- ⭐️ Import your schemas from your Confluent Schema Registry into EventCatalog
- ⭐️ Keep schemas in sync with your architecture documentation
- ⭐️ Automatic versioning, as your schemas change they are versioned in EventCatalog along side your documentation
- ⭐️ Add semantic meaning (markdown) to your schemas. Provide business context to your schemas and added value.
- ⭐️ Use custom filters (prefix, suffix, includes) to select which schemas to import
- ⭐️ Assign schemas to topics, services, domains and owners
- ⭐️ Document your schemas as commands or events.
- ⭐️ Visualize your kafka architecture with the [EventCatalog Visualizer](/features/visualization)
- ⭐️ Download and view schemas in EventCatalog (AVRO, JSON, Protobuf)
- ⭐️ Talk to your schemas, topics, producers and consumers with the [EventCatalog Chat](/features/ai-assistant)
- ⭐️ and more....

### How it works

1. Install the Confluent Schema Registry plugin
1. Configure the plugin (example; schemas, topics, commands, events,services, domains)
1. Run the plugin to import your schemas into EventCatalog
1. View and deploy your catalog

![Example](/img/integrations/confluent-schema-registry/confluent.png)

**What are generators?**

EventCatalog supports [generators](/docs/plugins/generators). These are scripts or plugins that can be run to integrate with any external API, system or specification files. EventCatalog also provides an [SDK](/docs/sdk) to give developers easier access to their catalogs through custom scripts or generators.

The EventCatalog Confluent Schema Registry plugin is a generator. It will import your schemas from your Confluent Schema Registry into EventCatalog.

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
The EventCatalog Scale license key is required to use the Confluent Schema Registry plugin with EventCatalog. It helps support ongoing development and maintenance of the plugin and project.

### How do I get an EventCatalog Scale license key?
You can obtain an EventCatalog Scale license key by visiting [EventCatalog Cloud](https://eventcatalog.cloud). New users can start with a 30-day free trial.

### Terms
- **Trial Period**: 30-day free trial no credit card required
- **Support**: Discord community support (extra for priority support)

After your trial period ends, you can continue with EventCatalog Scale through [EventCatalog Cloud](https://eventcatalog.cloud).
