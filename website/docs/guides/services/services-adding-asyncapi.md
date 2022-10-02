---
id: adding-service-asyncapi
title: Adding AsyncAPI Specifications
sidebar_label: Adding AsyncAPI Specs
slug: /services/adding-service-asyncapi
---

With EventCatalog you can add your AsyncAPI Specifications to your services, or if you prefer to render pages based on your AsyncAPI spec then you can read the [AsyncAPI Plugin](/docs/api/plugins/@eventcatalog/plugin-doc-generator-asyncapi).

To use the feature you will need to do two things:

1. Add your `asyncapi.yaml` file into your service
    - example `/services/{Your Service}/asyncapi.yaml`
2. Add the Component [AsyncAPI](/docs/components/overview#asyncapi-) inside your service markdown file.

This will load your AsyncAPI file into your Service Page.

```mdx title="Example of loading AsyncAPI into Service file"
---
name: Payment Service
summary: |
  Event based application that integrates with Stripe.
owners:
  - dboyne
---

The payment service is our own internal payment service that listens to events from stripe and handles them within our own domain. 

We use Stripe to handle services and use this Payment service to enrich events for internal use.

<AsyncAPI />
```

### Example Output

![AsyncAPI Example](/img/guides/mdx/asyncapi.gif)