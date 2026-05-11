---
keywords:
- EventCatalog flows
sidebar_label: Adding flows to services
title: Adding flows to services
description: Associate flows with services in EventCatalog
---

Adding [flows](/docs/development/guides/flows/introduction) to your services helps document which business processes or workflows involve a particular service.

When adding flows to your service EventCatalog will:

- Show the flows in the service sidebar
- Create clear relationships between services and the processes they participate in

You can also place flow files directly inside a service directory. EventCatalog discovers any `index.mdx` inside a `flows` folder at any depth, so `/services/PaymentService/flows/ProcessPayment/index.mdx` is a valid location.

## Add flows using frontmatter

To add flows to a service you need to add them to the `flows` array within your service frontmatter API.

```md title="/services/Orders/index.mdx (example)"
---
id: OrdersService
... # other service frontmatter
flows:
    # id of the flow you want to add
    - id: OrderProcessing
    # (optional) The version of the flow you want to add.
      version: 1.0.0

    # Note: version is optional. If no version is given the latest version of the flow will be used.
    - id: PaymentFlow
---

<!-- Markdown content... -->

```

The `flows` frontmatter in your service tells EventCatalog that these documented flows involve this service.

In the example above we can see that the flows `OrderProcessing` and `PaymentFlow` involve the `OrdersService`.
