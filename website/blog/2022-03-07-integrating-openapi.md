---
title: EventCatalog and OpenAPI
authors: [dboyne]
tags: [release, feature]
image: /img/blog/open-api/cover.png
---

![cover](/img/blog/open-api/cover.png)

We are happy to announce that users can now use OpenAPI to help them document their services within EventCatalog!

This is a great feature from [Rodolfo Toro](https://github.com/rtoro) ⭐️

**This feature will allow you to easily display [Swagger UI](https://swagger.io/tools/swagger-ui/) within EventCatalog in a few steps.**.

[EventCatalog is focused on making Event Architecture documentation simple and useful](/docs/introduction#motivation). Having OpenAPI support for your services is another great reason to try out EventCatalog to help you document your Event Architectures.

:::info
**Want to see the Demo?** You can view it here: [https://app.eventcatalog.dev/services/Payment%20Service/](https://app.eventcatalog.dev/services/Payment%20Service/)
:::

## How does EventCatalog work with OpenAPI?

EventCatalog allows you to document your events, domains and services using Markdown and custom components.

We have now introduced [a new component](/docs/components/overview#openapi-) that allows you to display your OpenAPI spec files within any of your services.

You can add OpenAPI specification files to your services following these steps:

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

:::info
**Want to see the Demo?** You can view it here: [https://app.eventcatalog.dev/services/Payment%20Service/](https://app.eventcatalog.dev/services/Payment%20Service/)
:::

## How can you get started?

If you already have EventCatalog then you will need to add the file `openapi.yaml` or `openapi.json` to your **service** folder. Then add the `<OpenAPI />` component to your Markdown.

If you have yet to try EventCatalog, head over to our [getting started guide](/docs/installation), where you can get a catalog started within minutes using our NPM packages.

## Summary

This is a great feature from [Rodolfo Toro](https://github.com/rtoro) and it is starting to show how the EventCatalog community is starting to grow!

Thank you [Rodolfo Toro](https://github.com/rtoro) for your great contribution and we hope you all find it useful!


If you have any ideas or feedback feel free to raise an issue on [GitHub](https://github.com/boyney123/eventcatalog/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) or come join us on [Discord](https://discord.gg/3rjaZMmrAm).


Enjoy!
