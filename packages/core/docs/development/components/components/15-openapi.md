---
sidebar_position: 15
keywords:
- components
sidebar_label: OpenAPI
title: OpenAPI
description: Component for EventCatalog
---


:::warning
This component is now deprecated. Please read the frontmatter API documentation [here](/docs/development/guides/resources/schemas/add-specifications-to-services/add-openapi-specifications).
:::

You can add specifications to any service in EventCatalog using the specifications frontmatter API. You can read more about it [here](/docs/development/guides/resources/schemas/add-specifications-to-services/add-openapi-specifications).

If you are interested in automating your EventCatalog with OpenAPI files, you can use the [OpenAPI plugin](/docs/plugins/openapi/intro).

<!-- A component to render [OpenAPI specification files](https://swagger.io/specification/) into EventCatalog.

:::tip
 OpenAPI files can be great for your services. Remember you can version your services and all files that associate with it. This allows you to version your OpenAPI files with EventCatalog.
:::

### Usage

1. Add your `openapi.yml` file to your folder
    - e.g `/events/MyEvent/openapi.yml`

When you include the component three things happen:

- You get a section in your document with a link to the spec file
- A button is rendered in the sidebar for the document
- A new page is rendered loading the OpenAPI file.

**Example**

```jsx /events/MyEvents/index.mdx
<OpenAPI/>
```

### Output
![Example output](./img/openapi.png)

**New page that is created for your OpenAPI spec**

![Example openapi page](./img/openapi-page.png)

### Props

_No configuration required._ -->

### Support

The `<OpenAPI/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
