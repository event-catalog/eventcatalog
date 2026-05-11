---
sidebar_position: 7
keywords:
    - domain integration map
    - domains
sidebar_label: Domain Integration Map
title: Domain Integration Map
description: Component list for domains 
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.45.0" />

The **GlobalDomain Integration Map** (see [demo](https://demo.eventcatalog.dev/visualiser/domain-integrations)) is a powerful visualization feature in EventCatalog that provides a high-level view of your domains, services and messages. It displays domains containing their services, with cross-domain message flows clearly visualized as connections between domains.

![Example](../img/domains/domain-integration.png)

This feature is particularly valuable for organizations practicing Domain-Driven Design (DDD) and event-driven architecture, where understanding the interactions between domains is crucial for system design and evolution.

## How it works?

EventCatalog will visualize messages that are being sent between domains in EventCatalog.

As you write domains, services and messages in EventCatalog, some of these communications will be cross domain and boundary.
This can be intentional or accidental.

Using the Domain Integration Map, you can see these cross-domain communications and understand the dependencies between domains.


## How to see the Global Domain Integration Map

To see the Domain integration map, you need at least one domain in your EventCatalog.

1. Click on the **Global Domain Integration Map** section in the navigation bar for any domain in your EventCatalog.

You can a demo of the Domain Integration Map in the [EventCatalog Demo](https://demo.eventcatalog.dev/visualiser/domain-integrations).




