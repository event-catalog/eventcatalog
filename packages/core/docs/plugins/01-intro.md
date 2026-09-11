---
sidebar_position: 1
keywords:
- EventCatalog Contributing
sidebar_label: Getting started with plugins
title: Understanding EventCatalog Plugins
description: Understand how to use EventCatalog plugins
---

EventCatalog is technology agnostic, which means we can integrate with any system in the world that exposes an API.

This can be schema registries, brokers, cloud providers and more.

EventCatalog intergrates with systems using [generators](/docs/plugins/generators).

### What are generators?    

Generators are scripts that are executed before your build time. They can be used to integrate with brokers, cloud providers and many more systems.

EventCatalog will use generators to pull schemas from registries, or generate messages from your OpenAPI or AsyncAPI files and much more.

You can create your own generators or use the [EventCatalog plugins](#official-eventcatalog-plugins) which are updated and maintained by the EventCatalog team.

#### Official EventCatalog plugins

These plugins are maintained by the EventCatalog team and are updated regularly, to get started click the link below to view the documentation for each plugin.

- [AsyncAPI Plugin](/docs/plugins/asyncapi/intro) - Generate documentation from your AsyncAPI files
- [OpenAPI Plugin](/docs/plugins/openapi/intro) - Generate documentation from your OpenAPI files
- [GraphQL Plugin](/docs/plugins/graphql/intro) - Generate documentation from your GraphQL files
- [Github Plugin](/docs/plugins/github/intro) - Sync your schemas from GitHub to EventCatalog
- [Backstage Plugin](/docs/plugins/backstage/intro) - Use EventCatalog features within Backstage
- [Amazon EventBridge](/docs/plugins/eventbridge/intro) - Sync Amazon EventBridge schemas to EventCatalog
- [Amazon API Gateway](/docs/plugins/amazon-apigateway/intro) - Generate documentation from your Amazon API Gateway
- [Confluent Schema Registry](/docs/plugins/confluent-schema-registry/intro) - Sync your schemas from Confluent Schema Registry to EventCatalog
- [EventCatalog Federation](/docs/plugins/eventcatalog-federation/introduction) - Merge multiple EventCatalog instances into a single catalog.

#### Community plugins

- [Atlassian Compass](https://github.com/IsmaelMartinez/generator-atlassian-compass-event-catalog) - Integration with Atlassian Compass. 
- [Hookdeck](/docs/plugins/hookdeck/intro) - Integration with Hookdeck.

## Custom integrations

EventCatalog can integrate with anything that has an API. 

We offer support and services to build custom integrations for your EventCatalog.

If you would like to explore custom integrations and have us build your integrate for you please contact us at `hello@eventcatalog.dev`.