---
keywords:
- EventCatalog schemas
- GraphQL
sidebar_position: 3
sidebar_label: GraphQL
title: Add GraphQL schemas
description: Add a GraphQL schema to your service and render it in your documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

Services in EventCatalog allow you to attach one or more GraphQL schemas to them and render them in the Catalog. ([see demo](https://demo.eventcatalog.dev/docs/services/BillingService/0.0.1/graphql/schema)).

![Example](../../../img/services/graphql-spec.png)

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

<ProjectTree
  items={[
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Orders',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            { name: 'schema.graphql', highlight: true },
          ],
        },
      ],
    },
  ]}
/>

Then you need to reference the file in the service frontmatter.

```md title="example: /services/Orders/index.mdx"
---
  specifications:
    - type: graphql
      # Path to the GraphQL schema relative to the service directory
      path: schema.graphql
      # Friendly name for the specification
      name: GraphQL Specification
---
```  

## Reference the GraphQL file from a remote URL

This can be useful if you want to keep your GraphQL files in a remote repository and render them in EventCatalog.

The pages will be built at build time, so the URL needs to be accessible by the build machine.

If your schemas changes you need to rebuild your EventCatalog as the pages are built at build time.

```md title="example: /services/Orders/index.mdx"
---
  specifications:
    - type: graphql
      # Path to the GraphQL schema from a remote URL (accessible by the build machine)
      path: https://raw.githubusercontent.com/event-catalog/generator-graphql/refs/heads/main/examples/product-api/schema.graphql
      # Friendly name for the specification
      name: Product API
---
```

### Multiple GraphQL Files

You can also assign multiple GraphQL files to a single service.

This can be useful if your service exposes multiple APIs or versions of the same API.

```mdx title="example: /services/Orders/index.mdx"
---
  specifications:
    - type: graphql
      path: schema-v1.graphql
      name: v1
    - type: graphql
      path: schema-v2.graphql
      name: v2
---
```

This will render a list of schema files on your service page and navigation bar.
