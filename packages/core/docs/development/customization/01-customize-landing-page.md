---
sidebar_position: 1
keywords:
- EventCatalog landing page
sidebar_label: Custom landing page
title: Customize landing page
description: Customize landing pages in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.37.1" />

EventCatalog provides a landing page for your catalog, this is the first page that users see when they visit your catalog. See the demo [here](https://demo.eventcatalog.dev/).

You can customize the landing page with your own content, HTML and EventCatalog components.

:::info 
Landing page customization is only available for customers on [paid plans](https://www.eventcatalog.dev/pricing). You can get a 14 day free trial of EventCatalog Starter Plan on [EventCatalog Cloud](https://eventcatalog.cloud).
:::

### Example of a custom landing page

You can add any HTML you want to your landing page, in this example we have added custom content using EventCatalog components, which includes the
visualizer for a domains, subdomains and flows.

<div className="space-y-2 text-center mb-8">
<img src="/img/landing-page-example.png" alt="EventCatalog Custom Landing Page" className="rounded-lg mb-0" />
<a href="https://demo.eventcatalog.dev" className="block p-0 m-0">View custom landing page demo</a>
</div>

## How to customize your landing page

1. Setup and configure your [EventCatalog Starter or Scale License key](/docs/development/getting-started/configuration-overview#configuring-environment-variables).
    - You can get a 14 day free trial of EventCatalog Starter Plan on [EventCatalog Cloud](https://eventcatalog.cloud).
1. Create a new folder called `pages` and an Astro file called `homepage.astro`
    - Example: `/pages/homepage.astro`
1. Add the contents to your Astro file.
    - You can see a full example of this on our [GitHub repository](https://github.com/event-catalog/eventcatalog/blob/main/examples/default/pages/homepage.astro).
1. Run `npm run dev` or `npm run build` to see your changes.

:::info What is Astro?
[Astro](https://astro.build/) is a static site builder that powers EventCatalog. You can learn more about Astro [here](https://docs.astro.build/en/getting-started/).
:::

**Example of homepage.astro**

```md title="/pages/homepage.astro"
---
# Import EventCatalog components to use in your landing page
const { Tile, Tiles, Flow, NodeGraph, Admonition } = Astro.props.components;
---

<div class="p-8 pt-2 max-w-8xl mx-auto">
  <h1 class="text-4xl font-bold text-gray-800 mb-4">Welcome to FlowMart's EventCatalog</h1>
  <p class="text-lg text-gray-600 mb-8">Explore the events, services, and domains that power the FlowMart ecosystem. This catalog provides a centralized place to discover and understand our asynchronous architecture.</p>

  <Admonition type="info" title="Demo application">
    <p>This is a demo of the EventCatalog and what it can do. The company is called FlowMart and they are an e-commerce company.</p>
    <p>Using EventCatalog, we documented their systems (domains, services, events, commands, flows) and how they fit together.</p>
  </Admonition>

  <div class="grid grid-cols-2 gap-4 border-b border-gray-200 pb-8 pt-4">
    <div class="col-span-1">
      <h2 class="text-2xl font-semibold text-gray-700 mb-2">E-Commerce Domain</h2>
      <p class="text-gray-500 mb-2">The core domain of FlowMart, responsible for all e-commerce operations.</p>
      <NodeGraph id="E-Commerce" version="1.0.0" type="domain" />
    </div>
    <div class="col-span-1">
      <h2 class="text-2xl font-semibold text-gray-700 mb-2">Orders Domain</h2>
      <p class="text-gray-500 mb-2">The sub-domain responsible for all orders.</p>
      <NodeGraph id="Orders" version="0.0.3" type="domain" />
    </div>
    <div class="col-span-1">
      <h2 class="text-2xl font-semibold text-gray-700 mb-2">Payment Domain</h2>
      <p class="text-gray-500 mb-2">The sub-domain responsible for all payments.</p>
      <NodeGraph id="Payment" version="0.0.1" type="domain" />
    </div>
    <div class="col-span-1">
      <h2 class="text-2xl font-semibold text-gray-700 mb-2">Subscription Domain</h2>
      <p class="text-gray-500 mb-2">The sub-domain responsible for all subscriptions.</p>
      <NodeGraph id="Subscription" version="0.0.1" type="domain" />
    </div>
  </div>

  <div class="bg-blue-50 p-6 rounded-lg shadow-md mb-12">
    <h2 class="text-2xl font-semibold text-blue-800 mb-3">Discover Our Architecture</h2>
    <p class="text-gray-700 mb-4">
      Navigate through our Domains to understand the different business capabilities, explore Services to see the microservices involved, and dive into Events and Commands to see how they communicate.
    </p>
    <p class="text-gray-700">
      Use the search bar above or browse the sections in the sidebar to get started.
    </p>
  </div>

  <div class="grid grid-cols-2 gap-4 border-b border-gray-200 pb-8">
    <div class="col-span-1">
      <h2 class="text-2xl font-semibold text-gray-700 mb-2">Cancel Subscription Flow</h2>
      <p class="text-gray-500 mb-2">This flow is triggered when a user cancels their subscription.</p>
      <Flow id="CancelSubscription" version="latest" includeKey={false} />
    </div>
    <div class="col-span-1">
      <h2 class="text-2xl font-semibold text-gray-700 mb-2">Payment Flow</h2>
      <p class="text-gray-500 mb-2">This flow documents how a payment is processed at FlowMart.</p>
      <Flow id="PaymentFlow" version="latest" includeKey={false} />
    </div>
  </div>

  <div class="border-b border-gray-200 pb-8 py-4">
    <h2 class="text-3xl font-semibold text-gray-700 py-4">Quick Links</h2>
    <p class="text-gray-700 mb-4">Learn how to get started with EventCatalog, create domains, services, events, and commands.</p>
    <Tiles columns={3}>
      <Tile icon="BookOpenIcon" href="https://eventcatalog.dev/docs/development/getting-started" title="Getting started with EventCatalog" description="How to get started with EventCatalog" />
      <Tile icon="RectangleGroupIcon" href="https://eventcatalog.dev/docs/development/guides/domains/creating-domains/adding-domains" title="Creating domains" description="Learn how to create domains in your event catalog" />
      <Tile icon="ServerIcon" href="https://eventcatalog.dev/docs/development/guides/services/adding-services" title="Creating services" description="Learn how to create services in your event catalog" />
      <Tile icon="ChatBubbleLeftIcon" iconColor="text-blue-500" href="https://eventcatalog.dev/docs/development/guides/messages/commands/introduction" title="Creating commands" description="Learn how to create commands in your event catalog" />
      <Tile icon="BoltIcon" iconColor="text-orange-500" href="https://eventcatalog.dev/docs/development/guides/messages/events/introduction" title="Creating events" description="Learn how to create events in your event catalog" />
      <Tile icon="UserGroupIcon" iconColor="text-green-500" href="https://eventcatalog.dev/docs/owners" title="Assigning owners to resources" description="Learn how to assign owners to resources in your event catalog" />
    </Tiles>
  </div>

  <div class="pb-8 py-4">
    <h2 class="text-3xl font-semibold text-gray-700 mb-6 pt-4">Join the community</h2>

    <p class="text-gray-700 mb-4">Our project and community is growing fast. We have over 1000+ members in our <a href="https://eventcatalog.dev/discord" class="text-blue-500 hover:text-blue-600">Discord community</a>.</p>

    <Tiles columns={2}>
      <Tile icon="UserGroupIcon" iconColor="text-green-500" href="https://eventcatalog.dev/discord" title="Join the Discord community" description="Join the community to get help and support" />
      <Tile icon="StarIcon"  iconColor="text-yellow-500" href="https://github.com/event-catalog/eventcatalog/stargazers" title="Star EventCatalog on GitHub" description="If you like the project, please star it on GitHub to show your support ❤️" />
    </Tiles>
  </div>

</div>


```

See the example output [here](https://demo.eventcatalog.dev)


### Using components

You can use EventCatalog components in your custom landing page.

These include embedding visuals, flows, and more.

Example:

```md
<Tiles columns={3}>
  <Tile icon="BookOpenIcon" href="https://eventcatalog.dev/docs/development/getting-started" title="Getting started with EventCatalog" description="How to get started with EventCatalog" />
</Tiles>
```

You can get a list of components [here](/docs/components).
