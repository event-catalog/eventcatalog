---
keywords:
- EventCatalog components
sidebar_label: Configuring team catalogs
title: Configuring team catalogs
description: Configuring federation in your EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';

<!-- <Beta /> -->
<AddedIn version="2.18.0" />
<PluginLicense url="/docs/plugins/eventcatalog-federation/intro#commercial-use" />

Multiple teams can own their own EventCatalog, this is useful if you have multiple teams that want to own their own EventCatalog / Documentation.

**Why would your teams want their own EventCatalog?**

- They want to own their own documentation
- They want to keep their documentation close to their code
- They want to control their own teams documentation but share it with the rest of the organization

### Getting started

To get started you will need to create a new EventCatalog instance for your team.

You can run the following command in any directory you want to create your team catalog in.

```bash
npx @eventcatalog/create-eventcatalog@latest team-catalog
```

This will create a new EventCatalog instance in the current directory called `team-catalog`.

Your team can document their own services, messages and domains in this catalog, and these can be merged into the main catalog using the federation generator.

To help you get started:

- [Creating domains in EventCatalog](/docs/development/guides/domains/introduction)
- [Creating services in EventCatalog](/docs/development/guides/resources/services/introduction)
- [Creating events in EventCatalog](/docs/development/guides/resources/messages/message-types/events)
- [Creating commands in EventCatalog](/docs/development/guides/resources/messages/message-types/commands)
- [Creating queries in EventCatalog](/docs/development/guides/resources/messages/message-types/queries)

Once your teams have created their own documentation you can [merge them into the main catalog using the federation generator](https://github.com/event-catalog/generators).

### Mocking out dependencies in your Catalog

<AddedIn version="2.18.0" />

If you have many team catalogs you can mock out `dependencies` in your catalog. 

**Why would you want to mock out dependencies?**

- Team A wants to consume an event from Team B, but Team B owns the event documentation
- Team A mocks out the event using the `dependencies` section of their `eventcatalog.config.js` file
- EventCatalog renders a mocked page for Team B event.
- When merging the catalogs, the federation generator will resolve events.

**How to use dependencies?**

You can define dependencies in your `eventcatalog.config.js` file in the `dependencies` section.

```js title="eventcatalog.config.js"
// rest of your config
dependencies: {
  events: [{
    id: 'OrderPlaced',
    version: '1.0.0', // optional
  }, {
    id: 'OrderShipped',
    version: '1.0.0', // optional
  }]
}
// rest of your config
```

This will mock out the `OrderPlaced` and `OrderShipped` events in the catalog and EventCatalog will render a mocked page for these events.

You can also mock out domains, services, events, commands and queries by changing the key to `domains`, `services`, `events`, `commands` and `queries` respectively.

Example:

```js title="eventcatalog.config.js"
// rest of your config
dependencies: {
  domains: [{
    id: 'Order',
    version: '1.0.0', // optional
  }]
}
// rest of your config
```

