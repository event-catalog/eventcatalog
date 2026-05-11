---
keywords:
- EventCatalog flows
sidebar_label: Adding flows to domains
title: Adding flows to domains
description: Associate flows with domains in EventCatalog
---

Adding [flows](/docs/development/guides/flows/introduction) to your domains helps document which business processes or workflows belong to a particular domain.

When adding flows to your domain EventCatalog will:

- Show the flows in the domain sidebar
- Create clear relationships between domains and the processes they contain

You can also place flow files directly inside a domain directory. EventCatalog discovers any `index.mdx` inside a `flows` folder at any depth, so `/domains/Orders/flows/ProcessOrder/index.mdx` is a valid location.

## Add flows using frontmatter

To add flows to a domain you need to add them to the `flows` array within your domain frontmatter API.

```md title="/domains/Orders/index.mdx (example)"
---
id: OrdersDomain
... # other domain frontmatter
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

The `flows` frontmatter in your domain tells EventCatalog that these documented flows belong to this domain.

In the example above we can see that the flows `OrderProcessing` and `PaymentFlow` belong to the `OrdersDomain`.

