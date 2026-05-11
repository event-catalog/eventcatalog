---
sidebar_position: 3
keywords:
- components
sidebar_label: Workflows  
title: Workflows
description: Workflows of EventBridge with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

There are a few ways to configure the EventBridge plugin depending on your preferred development workflows.
Many companies have different needs, so we have provided a few different workflows to choose from.

- [Storing shared events in your catalog for producers and consumers.](#storing-shared-events-in-your-catalog-for-producers-and-consumers)
- [Shared services between domains.](#shared-services-between-domains)

<!-- - [Simple mapping between AsyncAPI files and EventCatalog services](#simple-mapping-between-asyncapi-files-and-eventcatalog-services)
  - Map a single AsyncAPI file to a single EventCatalog service
- [Independent message versions from your AsyncAPI file](#independent-message-versions-from-your-asyncapi-file)
  - Version your messages independently of the service version
- [Mapping multiple AsyncAPI files to a single EventCatalog service](#mapping-multiple-asyncapi-files-to-a-single-eventcatalog-service)
  - Map multiple AsyncAPI files to a single EventCatalog service
- [Mapping AsyncAPI and OpenAPI files to the same EventCatalog service](#mapping-asyncapi-and-openapi-files-to-the-same-eventcatalog-service) -->
  <!-- - Map an AsyncAPI and OpenAPI file to the same EventCatalog service -->

_If we are missing a workflow that you think is useful, please raise an [issue on GitHub](https://github.com/event-catalog/generators/issues)._  

### Storing shared events in your catalog for producers and consumers.

<AddedIn version="3.3.0" pkg="@eventcatalog/generator-eventbridge" url="https://github.com/event-catalog/generators/releases/"/>

Ownership of events varies by company. Some companies have the producer own the event and contract, others have different patterns.

When you use the EventBridge plugin, EventCatalog will store your events within the service folder you define.

For more usecases this is OK, but if you want more control over where your events are written, in your catalog, you can use the `writeEventsToRoot` option.

When you use the `writeEventsToRoot` option, EventCatalog will write your events to the root of your catalog, but keep your services and domains folder in the same structure you define.

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
  [
    '@eventcatalog/generator-eventbridge',
    {
      writeFilesToRoot: true,
      services: [
        { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
        { id: 'Payment Service', version: '1.0.0', receives: [{ source: "myapp"}] }
      ],
      domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
    },
  ],
],
```

In this situation the events will be written to the root of your catalog, but keep your services and domains folder in the same structure you define.

```md
<!-- events stores in the root, referenced by other resources -->
events/
  payment-created/
    index.mdx
  payment-updated/
    index.mdx
<!-- Domains and services are still in their original location -->
domains/
  orders/
    services/
      payment-service/
        index.mdx
      payment-service/
        index.mdx
    index.mdx
```

This pattern can be useful if your events are references between many resources in your catalog, and you only want to document them in one place.

## Shared services between domains

<AddedIn version="3.3.0" pkg="@eventcatalog/generator-eventbridge" url="https://github.com/event-catalog/generators/releases/"/>

Sometimes you may have services that are shared between domains.

Using the `writeToRoot` option, EventCatalog will write your services to the root of your catalog, but keep your domains folder in the same structure you define.

Your domains will still reference the services you define, but they will be stored in the root of your catalog, allowing you to manage them in a central place, rather than duplicating services in each domain.

In the example below we have two domains, `orders` and `inventory`. We have a shared service between the two domains, the `Payment Service`.

We define the `writeToRoot` option to true, which will write the services to the root of your catalog, but keep your domains folder in the same structure you define.

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
  [
    '@eventcatalog/generator-eventbridge',
    {
      services: [
        { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }], writeToRoot: true }
      ],
      domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
    }
  ],
  [
    '@eventcatalog/generator-eventbridge',
    {
      services: [
        { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }], writeToRoot: true }
      ],
      domain: { id: 'inventory', name: 'Inventory', version: '0.0.1' },
    }
  ],
],
```

The outcome of this configuration will be:

```md
<!-- services stores in the root, referenced by other resources -->
services/
  payment-service/
    index.mdx
<!-- domains are still in their original location and reference the services in the root -->
domains/
  orders/
    index.mdx
  inventory/
    index.mdx
```