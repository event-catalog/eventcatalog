---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Introduction
description: Getting started with GitHub plugin
---


<!-- import PluginLicense from '@site/src/components/MDX/PluginLicense'; -->

<!-- <PluginLicense url="#commercial-use" /> -->

<!-- <iframe width="100%" height="515" src="https://www.youtube.com/embed/NMZKnPKx-L0?si=og1Nvnr3FfPfAqn4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe> -->

<iframe width="100%" height="515" src="https://www.youtube.com/embed/o2ryPdBa-68?si=2d1cynW_wgzNhbaV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

Many folks are using GitHub as a source of truth for their schemas. This gives the flexibility to use any schema format, version control, and have review and approval processes.

EventCatalog supports documenting any schema format, and you can use the [EventCatalog GitHub plugin](https://github.com/event-catalog/generators/tree/main/packages/generator-github) to pull your schemas into EventCatalog and keep them in sync along side your documentation.

You can choose either to import all your schemas, or specific folders or files, and assign them to producers, consumers, domains and owners.

:::info Why are people using GitHub as a source of truth for their schemas?
GitHub is a popular tool for version control and collaboration. It gives the flexibility to use any schema format, version control, and have review and approval processes.
:::

### Core Features of the GitHub plugin

The EventCatalog GitHub plugin can provide you with many features:

- 📃 Pull and sync your schemas from your GitHub repository to EventCatalog
- 📃 Keep your schemas in sync with your producers and consumers documentation
- 📃 Supports any schema format (e.g Avro, Protobuf, JSON)
- 📃 Import all schemas, or specific folders/files
- ⭐ **Go beyond a schema.** Add semantic meaning to your schemas, business logic and much more. Help your developers and teams understand the meaning behind the schemas with clear documentation and visualisations.
- 📊 Visualise producers and consumers in your architecture ([demo](https://demo.eventcatalog.dev/visualiser))
- ⭐ Download synced schemas from EventCatalog (e.g Avro, Protobuf, JSON) ([demo](https://demo.eventcatalog.dev/docs/events/InventoryAdjusted/0.0.4))
- 📃 Assign schemas to **events**, **commands** and **queries**
- ⭐ Discoverability feature (search, filter and more) ([demo](https://demo.eventcatalog.dev/discover/events))
- ⭐ And much more...

### How it works

1. Install the GitHub plugin on your EventCatalog instance
1. Configure the plugin (e.g. repository, branch, path to schemas)
1. Run the plugin to import your schemas into EventCatalog
1. View and deploy your catalog

![Example](/img/integrations/github/github-generator.png)

:::info How are my schemas kept in sync?

EventCatalog is a static site generator, and as such the schemas are pulled into EventCatalog when the site is built.

When your schemas change in GitHub, you can re-run your build to pull in the latest changes. You can build EventCatalog as many times as you want, and it will only pull in the changes from GitHub if there are any changes.

Any documentation you add to your schemas in EventCatalog will persist between builds. Only the schemas are updated.

:::

## Commercial and License

This plugin requires a license key to be used. 

You can get a 14 day trial license key to try the plugin out by going to [EventCatalog Cloud](https://eventcatalog.cloud).

After the trial you can purchase a license to continue using this plugin, we have different plans to suit your organization based on where you are in your governance and documentation journey.

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._

## Need a demo?

If you would like a demo of the plugin, please feel free to reach out to us and book a time to chat at hello@eventcatalog.dev.

## License FAQ

### What is the license key for?
The license key is required to use the GitHub plugin with EventCatalog. It helps support ongoing development and maintenance of the plugin and project.

### How do I get a license key?
You can obtain a license key by visiting [EventCatalog Cloud](https://eventcatalog.cloud). New users can start with a 14-day free trial.

### Terms
- **Trial Period**: 14 days free trial no credit card required
- **Support**: Discord community support (extra for priority support)

After your trial period ends, you can purchase a full license through [EventCatalog Cloud](https://eventcatalog.cloud) to continue using the plugin.
