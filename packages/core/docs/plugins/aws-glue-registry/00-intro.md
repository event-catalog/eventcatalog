---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Getting started
description: Getting started with AWS Glue Schema Registry plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';

<PluginLicense url="#commercial-use" />

<iframe width="100%" height="515" src="https://www.youtube.com/embed/cUQDdisz1wg?si=4Sj262A8N6iD8MTV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

[AWS Glue Schema Registry](https://docs.aws.amazon.com/glue/latest/dg/schema-registry.html) is a feature of [AWS Glue](https://aws.amazon.com/glue) that enables you to discover, register, and evolve schemas for your data streams. The Schema Registry helps you centrally store and manage schemas for your event-driven applications and streaming data platforms.

AWS Glue Schema Registry provides schema evolution with full compatibility control, supporting Apache Avro, JSON Schema, and Protocol Buffers formats. It integrates seamlessly with AWS services like Amazon Kinesis, Amazon MSK, and the Apache Kafka ecosystem.

Using [schema versioning and compatibility features](https://docs.aws.amazon.com/glue/latest/dg/schema-registry-concepts.html), as schemas evolve in your applications, they are versioned and stored in the registry. These schemas can be used to help you and your teams understand and discover events in your event-driven architecture, ensuring data quality and contract compliance.

Although Glue Schema Registry offers powerful schema management solutions, [there is still an issue of discoverability and documentation for your events, services and domains](https://www.youtube.com/watch?v=VLUvfIm9wnQ&t=4s). It remains difficult to organize your event-driven architecture for governance and team collaboration.

### Why use EventCatalog with AWS Glue Schema Registry?

Using the EventCatalog AWS Glue Schema Registry integration you can sync your schemas with EventCatalog.

You can map and sync schemas to your services and domains, and then use the EventCatalog to document your architecture.
Giving your teams a single source of truth for your event-driven architecture.

### Core Features

The EventCatalog AWS Glue plugin can provide you with many features:

- Import schemas directly from AWS Glue Schema Registry and keep them in sync with your documentation
- Assign schemas to producers and consumers
- Use filters to assign your schemas to your producer and consumers (e.g tag matching, prefix, suffix, etc)
- Generate domains, services, channels and messages into your catalog
- Add more meaning to your schemas with custom markdown. Persisted between changes to your schemas.
- Visualize your schemas and let your teams download and explore them in your catalog.
- Use EventCatalog MCP and AI features to talk to your schemas, and find insights in seconds.
- and more....

### How it works

![How it works](/img/integrations/aws-glue/glue.png)

EventCatalog supports [generators](/docs/plugins/generators). These are scripts or plugins that can be run to integrate with any external API, system or specification files. EventCatalog also provides an [SDK](/docs/sdk) to give developers easier access to their catalogs through custom scripts or generators.

The EventCatalog AWS Glue Schema Registry plugin lets you document, sync and map your schemas into EventCatalog.

You can use [custom filters (schemaName, prefix, suffix, includes, tags, dataFormat)](/docs/plugins/aws-glue-registry/features) to map which schemas you want your service to produce and consume. This is useful if you have a lot of schemas and you want to map only a subset of them to your services.

You can also use the EventCatalog plugin to map ALL schemas from your registry into your system and not map them into services if you wish to have a direct import.

### Supported Schema Formats

EventCatalog is technology agnostic, and supports all schema formats.

The plugin supports all AWS Glue Schema Registry formats:

- **Apache Avro** - For efficient serialization in streaming applications
- **JSON Schema** - For JSON data validation and documentation  
- **Protocol Buffers** - For language-neutral, platform-neutral serialization


### See an example

If you would like to get started with our example project, [you can find it on GitHub](https://github.com/event-catalog/generators/tree/main/examples/generator-glue-registry/basic).



## Commercial and License

This plugin requires a license key to be used. 

You can get a 14 day trial license key to try the plugin out by going to [EventCatalog Cloud](https://eventcatalog.cloud).

After the trial you can purchase a license to continue using this plugin, we have different plans to suit your organization. 

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._

## License FAQ

### What is the license key for?
The license key is required to use the AWS Glue Schema Registry plugin with EventCatalog. It helps support ongoing development and maintenance of the plugin and project.

### How do I get a license key?
You can obtain a license key by visiting [EventCatalog Cloud](https://eventcatalog.cloud). New users can start with a 14-day free trial.

### Terms
- **Trial Period**: 14 days free trial no credit card required
- **Support**: Discord community support (extra for priority support)

After your trial period ends, you can purchase a full license through [EventCatalog Cloud](https://eventcatalog.cloud) to continue using the plugin.

## Issues

If you have any problems or feature requests please feel free to raise them on GitHub. https://github.com/event-catalog/generators