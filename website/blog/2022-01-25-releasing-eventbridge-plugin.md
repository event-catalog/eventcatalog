---
title: Integrate Amazon EventBridge with EventCatalog
authors: [dboyne]
tags: [release, plugin]
image: /img/blog/amazon-eventbridge-plugin/cover.png
---


![EventCatalog with Amazon EventBridge](/img/blog/amazon-eventbridge-plugin/cover.png)

EventCatalog now supports integration and document generation from [Amazon EventBridge](https://aws.amazon.com/eventbridge/).

The new [amazon-eventbridge-plugin](/docs/api/plugins/@eventcatalog/plugin-doc-generator-amazon-eventbridge) has now been released which allows you to generate documentation from your Schema Registry, Targets, Rules and much more.

## Plugin Features

- 📄 Automatic documentation with versioning
- 👨‍⚕️ Add owners (people/teams) to your events
- 📊 Visualise Targets and Rules for Each Event
- 🌎 Quick access to AWS Console within each Event
- 🗄 JSONDraft4 and OpenAPI Schemas
- 💅 Customise and add content to each event (capture information, and details)
- ⚡️ Powered by markdown, setup in seconds.


## How plugins work with EventCatalog

EventCatalog is built to support many brokers, languages and specifications. This allows us to remain technology agnostic and integrate with users existing solutions.

EventCatalog supports `generation plugins` which you can use to generate documentation from any third party source.

:::tip
Want to integrate with something else? You can write your own plugin! You can use the `@eventcatalog/utils` to help you too!
:::

Let's take a quick look at how the generation works...

![architecture](/img/blog/asyncapi-plugin/architecture.png)

As we see in the diagram above, EventCatalog supports a `generation` phase. This means when you run `npm run generate` on your catalog it will go through all your [configured plugins](/docs/api/plugins/) and execute them.

## How does generation work with Amazon EventBridge?

When you configure and install the `amazon-eventbridge-plugin` and run `npm run generate` EventCatalog will request data from your EventBridge Schema Registry and parse your event information into documentation that is rendered by your EventCatalog.

![architecture](/img/api/plugins/amazon-eventbridge/plugin-architecture.png)

When parsing your schemas EventCatalog will render documentation that has Graphs, Quick Links to AWS Console, JSONDraft4 and OpenAPI schemas and much more...

You can read more details on the [features and installation guide](/docs/api/plugins/@eventcatalog/plugin-doc-generator-amazon-eventbridge).


## How does your content stay up to date?

Once you configure your plugin, every time you call `npm run generate` the new information is pulled down from AWS and transformed inside your catalog.

The EventBridge plugin will check for version changes and version your old events when it needs too.

The core requirement for EventCatalog is to allow people to easily create and maintain documentation for their Event Architectures. You can add any meta information you want to your schema documentation and that information will be used for future events. This means you can add things like event context, team information or schema information once, and this will be persisted across your events (if you choose).


## Getting Started

To get started head over to the [plugin installion guide](/docs/api/plugins/@eventcatalog/plugin-doc-generator-amazon-eventbridge).

## Summary

This is the [second](/blog/2022/01/19/releasing-asyncapi-plugin) plugin to be officially released and we also have a small community of users that are also building more plugins for EventCatalog.

Amazon EventBridge is a great serverless offering that allows us to write Event Driven Applications and EventCatalog allows you to easily document your event schemas.

Documenting your schemas/events for your teams can help your team discover what events are available in your architecture and understand why your events are created in the first place. 

EventCatalog is powered by markdown, which means you can add as much context to your EventBridge schemas as you like and share them around with the static website that EventCatalog generates.

If you have any ideas or feedback feel free to raise an issue on [GitHub](https://github.com/boyney123/eventcatalog/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) or come join us on [Discord](https://discord.gg/3rjaZMmrAm).

Enjoy!
