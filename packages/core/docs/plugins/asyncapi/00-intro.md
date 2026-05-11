---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Introduction
description: Getting started with AsyncAPI plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';

import PluginLicense from '@site/src/components/MDX/PluginLicense';

<AddedIn version="2.5.0"/>
<PluginLicense url="#commercial-use" />

<iframe width="100%" height="415" src="https://www.youtube.com/embed/XglwSNAnpKY?si=CtM_M0odLSPB8nhY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

Many folks building event-driven architectures are using and defining [AsyncAPI](https://www.asyncapi.com/en) files. The files are used to describe the service, it's messages it sends and receives and channels it uses to communicate.

Using the EventCatalog AsyncAPI generator you can generate and maintain your EventCatalog.

:::tip Try it now
Want to see what your AsyncAPI file looks like in EventCatalog? [Try the playground](https://try.eventcatalog.dev) — drop your file and see the result in seconds.
:::


:::info
**What is AsyncAPI?**: An industry standard for defining asynchronous APIs. Use this specification to document your service, channels and messages.
:::

### Core Features

The EventCatalog AsyncAPI plugin can provide you with many features:

- ⭐️ Generate domains, services and messages into your catalog from your AsyncAPI specification files
- ⭐️ [Automate your EventCatalog and fetch AsyncAPI files by URL](/docs/plugins/asyncapi/features#fetch-asyncapi-files-by-url)
- ⭐️ [Map commands, queries and events from your OpenAPI file using custom extensions](/docs/plugins/asyncapi/features#mapping-messages-events-commands-or-queries)
- ⭐️ [Automatically version your changes in EventCatalog in sync with your AsyncAPI versions](#automatic-versioning)
- ⭐️ [Allow you to write and persist custom markdown between changes](#persist-markdown)
- ⭐️ [Display your message schemas in the catalog](#downloading-schemas)
- ⭐️ [Fetch AsyncAPI files from any URL](#fetch-asyncapi-files-by-url)
- ⭐️ Ability to download your message schemas and AsyncAPI files (also versioned)
- ⭐️ Ability to draft services and endpoints in EventCatalog from your AsyncAPI files
- ⭐️ and more....

### How it works

![Example](/img/integrations/asyncapi/asyncapi.jpeg)

EventCatalog supports [generators](/docs/plugins/generators). These are scripts or plugins that can be run to integrate with any external API, system or specification files. EventCatalog also provides an [SDK](/docs/sdk) to give developers easier access to their catalogs through custom scripts or generators.

The EventCatalog AsyncAPI plugin let's you define 1 or many AsyncAPI files. When running the generate command the scripts populate your eventcatalog. You can choose how your AsyncAPI services are added to EventCatalog and which domain they belong to.

## Commercial and License

This plugin requires a license key to be used. 

You can get a 14 day trial license key to try the plugin out by going to [EventCatalog Cloud](https://eventcatalog.cloud).

After the trial you can purchase a license to continue using this plugin, we have different plans to suit your organization. 

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._

## License FAQ

### What is the license key for?
The license key is required to use the OpenAPI plugin with EventCatalog. It helps support ongoing development and maintenance of the plugin and project.

### How do I get a license key?
You can obtain a license key by visiting [EventCatalog Cloud](https://eventcatalog.cloud). New users can start with a 14-day free trial.

### Terms
- **Trial Period**: 14 days free trial no credit card required
- **Support**: Discord community support (extra for priority support)

After your trial period ends, you can purchase a full license through [EventCatalog Cloud](https://eventcatalog.cloud) to continue using the plugin.
