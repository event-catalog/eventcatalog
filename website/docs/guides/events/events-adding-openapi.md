---
id: events-adding-openapi
title: Adding OpenAPI Specifications
sidebar_label: Adding OpenAPI Specs
slug: /events/adding-event-openapi
---

With EventCatalog you can add your OpenAPI Specifications to your events.

To use the feature you will need to do two things:

1. Add your `openapi.yaml` or `openapi.json` file into your event
    - example `/events/{Your Event}/openapi.yaml`
2. Add the Component [OpenAPI](/docs/components/overview#openapi-) inside your event markdown file.

This will load your OpenAPI file into your Event Page.

```mdx title="Example of loading OpenAPI into Service file"
---
name: OrderCreated
version: 0.0.1
summary: |
  Event represents when an order has been created. 
producers:
    - Orders Service
consumers:
    - Data Lake
owners:
    - dboyne
    - mSmith
---

<NodeGraph title="Consumer/Producer Diagram" />

## OpenAPI Schema

OpenAPI schema for the event can be found below.

<OpenAPI  />

```

### Example Output

![OpenAPI Example](/img/guides/mdx/openapi-full.jpeg)