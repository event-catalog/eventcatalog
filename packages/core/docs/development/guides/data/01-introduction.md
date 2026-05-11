---
sidebar_position: 1
keywords:
- EventCatalog services
- Services
sidebar_label: What are data stores?
title: Understanding data stores
description: What are data resources in EventCatalog?
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.59.0" />

In EventCatalog **data stores** (containers) represent data stores that are used in your architecture (e.g. databases, caches, objectStore, searchIndexes, etc).

Using the data store resource in EventCatalog you can define how your [services](/docs/development/guides/services/introduction) read/write to data stores in your architecture, helping your teams understand how your services interact with data in your architecture. You can read more about how to add data stores to services [here](/docs/development/guides/services/adding-to-services/adding-data-stores-to-services).

:::tip Data stores are containers (not docker containers!)

Rather than create a new `data` resource directly, we choose to call these `containers`. 

This follows the C4 naming convention for containers (not docker containers!) in your architecture. To learn more about containers you can read the [c4 model](https://c4model.com/abstractions/container).

**For now we only use the data store from c4 model.**

:::


<!-- 
### Further reading
- [Event-driven architecture and domain-driven design](https://eda-visuals.boyney.io/visuals/eda-and-ddd)
- [Domain, Subdomain, Bounded Context: Problem/Solution Space in DDD: Clearly Defined](https://medium.com/nick-tune-tech-strategy-blog/domains-subdomain-problem-solution-space-in-ddd-clearly-defined-e0b49c7b586c)
- [Building Blocks of DDD](https://redis.io/glossary/domain-driven-design-ddd/) -->