---
sidebar_position: 0
id: plugins-overview
title: 'EventCatalog plugins'
sidebar_label: Plugins overview
slug: '/api/plugins'
---

## Generator plugins {#generator-plugins}

EventCatalog allows you to generate documentation/schemas and much more using it's Plugin API. You can generate documentation from any third party system.

## How Generator Plugins Work

EventCatalog is built to support many brokers, languages and specifications. This allows us to remain technology agnostic and integrate with users existing solutions.

EventCatalog supports `generation plugins` which you can use to generate documentation from any third party source.

:::tip
Want to integrate with something else? You can write your own plugin! You can use the `@eventcatalog/utils` to help you too!
:::

Let's take a quick look at how the generation works...

![architecture](/img/blog/asyncapi-plugin/architecture.png)

As we see in the diagram above, EventCatalog supports a `generation` phase. This means when you run `npm run generate` on your catalog it will go through all your [configured plugins](/docs/api/plugins/) and execute them.




## Want to build your own plugin?

It is possible to build your own plugin for any third party system you may have.

**Generator Plugins** are scripts that run before the EventCatalog runs. You can use the `@eventcatalog/utils` node package to help you create your plugins (writeEvents, getEventsFromCatalog).

For an example of how to write your own we recommened looking at the current plugins we have on GitHub.

If you want to know more or need help we highly recommend you join us on [Discord](https://discord.gg/3rjaZMmrAm) where we can help.



:::note
We are currently working on Plugin API and Documentation.
:::

### Generator Plugins

These plugins can be used to generate documentation from third party solutions.

- [@eventcatalog/plugin-doc-generator-asyncapi](plugins/@eventcatalog/plugin-doc-generator-asyncapi)
- [@eventcatalog/plugin-doc-generator-amazon-eventbridge](plugins/@eventcatalog/plugin-doc-generator-amazon-eventbridge)

