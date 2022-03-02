---
title: Introducing Domains
authors: [dboyne]
tags: [release, feature]
image: /img/blog/domains/cover.png
---

![cover](/img/blog/domains/cover.png)

We are happy to announce that EventCatalog now supports **domains**.

**This feature allows you to document domains and group events and services to them**.

[EventCatalog is focused on making Event Architecture documentation simple and useful](/docs/introduction#motivation). Grouping your events and services using domains makes it easier to maintain and describe your event architectures.

:::info
**Want to see the Demo?** You can view it here: [https://app.eventcatalog.dev/domains/](https://app.eventcatalog.dev/domains/)
:::

## How do domains work?

EventCatalog is designed to help you build Event Architecture Documentation using folders and markdown files. There are three main concepts to EventCatalog `events`, `services` and `domains`.

You can use EventCatalog to group your **events** and **services** using domains, and you can also create pages for your domains, helping you document them and use [custom MDX components](/docs/components/domains).

Adding domains can be done with some simple steps:

1. Create your domain folder `/domains/{Your Domain}`
    - example: `/domains/Orders`
2. Add details about your domain (title, summary, components)
    - example: `/domains/Orders/index.md`
3. Add **events** or **services** to your domain
    - event example: `/domains/Orders/events/OrderCreated/index.md`
    - service example: `/domains/Orders/services/OrderCreated/index.md`

EventCatalog uses markdown and the file system to help you encapsulate and document your domains.

## How can you get started?

If you already have EventCatalog and want to use the new **domains** feature checkout the [migration guide](/docs/domains/adding-domain#migrating-events-and-services-into-domains)

If you have yet to try EventCatalog, head over to our [getting started guide](/docs/installation), where you can get a catalog started within minutes using our NPM packages.

## Summary

EventCatalog was launched in January 2022 and so far we have had thousands of catalogs created, a great community building and some great momentum.

Supporing Domains in EventCatalog the top requested feature.

The project community provided some great feedback and ideas on how we could support **domains** and we are super excited and happy with the outcome!

Domains are a key core part of Event Architectures and we are super excited to now support them and help you document your event architectures.

If you have any ideas or feedback feel free to raise an issue on [GitHub](https://github.com/boyney123/eventcatalog/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) or come join us on [Discord](https://discord.gg/3rjaZMmrAm).


Enjoy!
