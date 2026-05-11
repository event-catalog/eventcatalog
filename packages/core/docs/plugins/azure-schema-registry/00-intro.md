---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Introduction
description: Getting started with Azure Schema Registry plugin
---

<!-- import PluginLicense from '@site/src/components/MDX/PluginLicense'; -->

<!-- <PluginLicense url="#commercial-use" /> -->

---


The [EventCatalog Azure Schema Registry plugin](https://github.com/event-catalog/generators/tree/main/packages/generator-azure-schema-registry) allows you to import schemas from Azure Schema Registry into EventCatalog and keep them in sync alongside your documentation. 

<iframe width="100%" height="515" src="https://www.youtube.com/embed/rNDa2JDyr_A?si=uFAbZbAiAxiy9dqJ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


:::info
**What is Azure Schema Registry?**: A schema registry for Azure Event Hubs. Use this to store and manage your schemas for event-driven applications. You can read more about it on the [Microsoft Learn website](https://learn.microsoft.com/en-us/azure/event-hubs/schema-registry-overview).
:::

### Why use EventCatalog with Azure Schema Registry?

The EventCatalog Azure Schema Registry plugin can provide you with many features, including:

- Keep your schemas in sync with your architecture documentation
- Automatic versioning; as your schemas change they are versioned in EventCatalog alongside your documentation
- Understand how your schemas have evolved over time with the Schema diff explorer with the [Schema Explorer](/docs/development/guides/schemas/schema-explorer)
- Add meaning (markdown) to your schemas. Provide business context to your schemas and add value
- Quickly find who is producing or consuming your schemas
- Visualize your Azure Event Hubs architecture with the [EventCatalog Visualizer](/features/visualization)
- Download and view schemas in EventCatalog (Avro, JSON Schema) or through the [Schema API](/docs/development/guides/schemas/schema-api)
- Use [EventCatalog MCP server](/docs/development/ask-your-architecture/mcp-server/introduction) to get schemas for your LLMs

### How it works

1. Install the Azure Schema Registry plugin
1. Configure the plugin (schemas, services, domains, message types)
1. Get an Azure access token using Azure CLI: `az account get-access-token --resource https://eventhubs.azure.net`
1. Set the token as an environment variable: `AZURE_SCHEMA_REGISTRY_TOKEN`
1. Run the plugin to import your schemas into EventCatalog
1. View and deploy your catalog

<!-- ![Example](/img/integrations/azure-schema-registry/azure-example.png) -->

**What are generators?**

EventCatalog supports [generators](/docs/plugins/generators). These are scripts or plugins that can be run to integrate with any external API, system or specification files. EventCatalog also provides an [SDK](/docs/sdk) to give developers easier access to their catalogs through custom scripts or generators.

The EventCatalog Azure Schema Registry plugin is a generator. It will import your schemas from your Azure Schema Registry into EventCatalog.

## Authentication

The plugin uses Azure's REST API with Bearer token authentication. You need to provide an Azure access token via the `AZURE_SCHEMA_REGISTRY_TOKEN` environment variable.

:::info Why use the REST API vs the Azure SDK?

The schema registry SDK is limiting and doesn't allow you to fetch all schemas from a registry. It also doesn't allow you to fetch schemas from multiple registries in one configuration.

We use the REST API because it is simpler and more flexible. It doesn't require you to install any Azure SDK packages and works seamlessly across different environments without requiring any code changes.

:::

## Commercial and License

This plugin requires a license key to be used.

You can get a 14 day trial license key to try the plugin out by going to [EventCatalog Cloud](https://eventcatalog.cloud).

After the trial you can purchase a license to continue using this plugin, we have different plans to suit your organization based on where you are in your governance and documentation journey.

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._

## License FAQ

### What is the license key for?
The license key is required to use the Azure Schema Registry plugin with EventCatalog. It helps support ongoing development and maintenance of the plugin and project.

### How do I get a license key?
You can obtain a license key by visiting [EventCatalog Cloud](https://eventcatalog.cloud). New users can start with a 14-day free trial.

### Terms
- **Trial Period**: 14 days free trial no credit card required
- **Support**: Discord community support (extra for priority support)

After your trial period ends, you can purchase a full license through [EventCatalog Cloud](https://eventcatalog.cloud) to continue using the plugin.
