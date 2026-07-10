---
keywords:
- EventCatalog schemas
- AsyncAPI
sidebar_position: 2
sidebar_label: AsyncAPI
title: Add AsyncAPI specifications
description: Attach an AsyncAPI specification to your service and render it in your documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

Services in EventCatalog allow you to attach one or more AsyncAPI specifications to them and render them in the Catalog. ([see demo](https://demo.eventcatalog.dev/docs/services/OrdersService/0.0.3/asyncapi/order-service-asyncapi)).

![Example](../../../img/services/asyncapi-spec.png)

You have two options for adding AsyncAPI specifications to your service:

- [Adding AsyncAPI files to EventCatalog](#adding-asyncapi-specifications-to-eventcatalog)
- [Reference the AsyncAPI file from a remote URL](#reference-the-asyncapi-file-from-a-remote-url)

:::tip Why not automate your EventCatalog from your AsyncAPI files?
  Did you know you can automate your documentation, visualizations and owners using your AsyncAPI Files?

  We have a [AsyncAPI plugin](/docs/plugins/asyncapi/intro) that can generate your catalog from your AsyncAPI files, transforming your operations into commands, queries and events. You can assign these to services and domains and much more...
:::

## Adding AsyncAPI files to EventCatalog

This option is useful if you want to keep your AsyncAPI files in your EventCatalog.

To add an AsyncAPI file to your service you will need to include the file itself inside the service directory.

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
            { name: 'asyncapi.yml', highlight: true },
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
    - type: asyncapi
      # Path to the AsyncAPI file relative to the service directory
      path: asyncapi.yml
      # Friendly name for the specification
      name: AsyncAPI Specification
---
```  

### Remove AsyncAPI file

This can be useful if you want to keep your AsyncAPI files in a remote repository and render them in EventCatalog.

The pages will be built at build time, so the URL needs to be accessible by the build machine.

If your specifications changes you need to rebuild your EventCatalog as the pages are built at build time.

```md title="example: /services/Orders/index.mdx"
---
  specifications:
    - type: asyncapi
      # Path to the AsyncAPI file from a remote URL (accessible by the build machine)
      path: https://raw.githubusercontent.com/event-catalog/generator-asyncapi/refs/heads/main/examples/product-api/asyncapi.yml
      # Friendly name for the specification
      name: Product API
---
```

### Multiple AsyncAPI Files

You can also assign multiple AsyncAPI files to a single service.

This can be useful if your service exposes multiple APIs or versions of the same API.

```mdx title="example: /services/Orders/index.mdx"
---
  specifications:
    - type: asyncapi
      path: asyncapi-v1.yml
      name: v1
    - type: asyncapi
      path: asyncapi-v2.yml
      name: v2
---
```

This will render a list of specification files on your service page and navigation bar.

