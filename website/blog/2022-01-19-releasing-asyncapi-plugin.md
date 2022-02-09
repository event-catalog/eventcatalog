---
title: Integrate AsyncAPI with EventCatalog
authors: [dboyne]
tags: [release, plugin]
image: /img/blog/asyncapi-plugin/cover.png
---


![cover](/img/blog/asyncapi-plugin/cover.png)

EventCatalog now supports integration and document generation from your [AsyncAPI](https://www.asyncapi.com/) specification files.

The new [asyncapi-plugin](/docs/api/plugins/@eventcatalog/plugin-doc-generator-asyncapi) has now been released which allows you to generate documents from your **events** and **services** automatically.

## How plugins work with EventCatalog

EventCatalog is built to support many brokers, languages and specifications. This allows us to remain technology agnostic and integrate with users existing solutions.

EventCatalog supports `generation plugins` which you can use to generate documentation from any third party source.

:::tip
Want to integrate with something else? You can write your own plugin! You can use the `@eventcatalog/utils` to help you too!
:::

Let's take a quick look at how the generation works...

![architecture](/img/blog/asyncapi-plugin/architecture.png)

As we see in the diagram above, EventCatalog supports a `generation` phase. This means when you run `npm run generate` on your catalog it will go through all your [configured plugins](/docs/api/plugins/) and execute them.

## How does generation work with AsyncAPI?

When you configure and install the `asyncapi-plugin` and run `npm run generate` your AsyncAPI file is parsed and **services**, **events** and **schemas** are extracted from it.

![test](/img/blog/asyncapi-plugin/asyncapi-plugin.png)

This information is then stored inside the correct places within your catalog and you should be good to go!

:::tip
If your AsyncAPI version has changed since last time, EventCatalog will version your previous events and use the new ones at the latest version.
:::

## What happens to content already in the Catalog?

If you already have events and services documented in your catalog, the `asyncapi-plugin` can version your events for you (configurable) before overriding them.

Any [content](/docs/events/adding-event#example) you add in your existing events or services will be used and not overridden on the next generation phase. This means you can keep all your custom markdown content without replacing it every time you generate your documents. The [frontmatter](/docs/api/event-frontmatter) of your services and events will be the only things that are replaced.


## Summary

[AsyncAPI](https://www.asyncapi.com/) is a great way for people to document their architectures, allowing you to describe servers, services, events, schemas and much more.

EventCatalog now supports integration with AsyncAPI which hopefully helps you get all the benefits of the catalog alongside your AsyncAPI files.

To get started head over to the [async-api plugin api](/docs/api/plugins/@eventcatalog/plugin-doc-generator-asyncapi) documentation.

If you have any ideas or feedback feel free to raise an issue on [GitHub](https://github.com/boyney123/eventcatalog/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) or come join us on [Discord](https://discord.gg/3rjaZMmrAm).

Enjoy!
