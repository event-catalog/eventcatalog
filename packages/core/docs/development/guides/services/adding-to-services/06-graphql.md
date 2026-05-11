---
keywords:
- EventCatalog domains
sidebar_label: GraphQL schemas
title: Adding GraphQL schemas
description: Add a GraphQL schema to your service and render them in your documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<AddedIn version="2.6.0" />

Services in EventCatalog allow you to render GraphQL schemas ([see demo](https://demo.eventcatalog.dev/docs/services/BillingService/0.0.1/graphql/schema)).

![Example](../../img/services/graphql-spec.png)

You have two options for adding GraphQL schemas to your service:

- [Adding GraphQL files to EventCatalog](#adding-graphql-files-to-eventcatalog)
- [Reference the GraphQL file from a remote URL](#reference-the-graphql-file-from-a-remote-url)

:::tip Why not automate your EventCatalog from your GraphQL files?
  Did you know you can automate your documentation, visualizations and owners using your GraphQL Files?

  We have a [GraphQL plugin](/docs/plugins/graphql/intro) that can generate your catalog from your GraphQL files, transforming your operations into commands, queries and events. You can assign these to services and domains and much more...
:::

## Adding GraphQL files to EventCatalog

This option is useful if you want to keep your GraphQL files in your EventCatalog.

To add a GraphQL schema to your service you will need to include the file itself inside the service directory.

- `/services/{Service Name}/graphql.schema` 
  - (example `/services/Orders/graphql.schema`)

Then you need to reference the file in the service frontmatter.

```md title="example: /services/Orders/index.mdx"
---
  specifications:
    - type: graphql
      # Path to the OpenAPI file relative to the service directory
      path: graphql.schema
      # Friendly name for the specification
      name: GraphQL Specification
---
```  

## Reference the GraphQL file from a remote URL

<AddedIn version="2.61.2" />

This can be useful if you want to keep your GraphQL files in a remote repository and render them in EventCatalog.

The pages will be built at build time, so the URL needs to be accessible by the build machine.

If your schemas changes you need to rebuild your EventCatalog as the pages are built at build time.

```md title="example: /services/Orders/index.mdx"
---
  specifications:
    - type: graphql
      # Path to the OpenAPI file from a remote URL (accessible by the build machine)
      path: https://raw.githubusercontent.com/event-catalog/generator-graphql/refs/heads/main/examples/product-api/graphql.schema
      # Friendly name for the specification
      name: Product API
---
```

## Multiple GraphQL Files

<AddedIn version="2.39.1" />

You can also assign multiple GraphQL files to a single service.

This can be useful if your service exposes multiple APIs or versions of the same API.

```mdx title="example: /services/Orders/index.mdx"
---
  specifications:
    - type: graphql
      path: graphql-v1.schema
      name: v1
    - type: graphql
      path: graphql-v2.schema
      name: v2
---
```

This will render a list of schema files on your service page and navigation bar.



