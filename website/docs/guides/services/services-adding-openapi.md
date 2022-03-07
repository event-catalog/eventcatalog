---
id: adding-service-openapi
title: Adding OpenAPI Specifications
sidebar_label: Adding OpenAPI Specs
slug: /services/adding-service-openapi
---

With EventCatalog you can add your OpenAPI Specifications to your services.

To use the feature you will need to do two things:

1. Add your `openapi.yaml` or `openapi.json` file into your service
    - example `/services/{Your Service}/openapi.yaml`
2. Add the Component [OpenAPI](/docs/components/overview#openapi-) inside your service markdown file.

This will load your OpenAPI file into your Service Page.


```mdx title="Example of loading OpenAPI into Service file"
---
name: Payment Service
summary: |
  Event based application that integrates with Stripe.
owners:
  - dboyne
---

The payment service is our own internal payment service that listens to events from stripe and handles them within our own domain. 

We use Stripe to handle services and use this Payment service to enrich events for internal use.

<OpenAPI />

<NodeGraph />


```

### Example Output

![OpenAPI Example](/img/guides/mdx/openapi-full.jpeg)