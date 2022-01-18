---
sidebar_position: 1
id: service-frontmatter
slug: /api/serivce-frontmatter
---

# `Service Frontmatter Config`

## Overview {#overview}

Services are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of the event frontmatter you will find in your event files.

```mdx"
---
name: Basket Service
summary: |
  CRUD based API to handle Basket interactions for users of the shopping website.
owners:
    - dboyne
repository:
  language: JavaScript
  url: https://github.com/boyney123/pretend-basket-service
---
```

## Required fields {#required-fields}

### `name` {#name}

- Type: `string`

Name of the service.

```mdx title="Example"
---
  name: Basket Service
---
```

## Optional fields {#optional-fields}

### `summary` {#summary}

Short summary of your service, shown on service summary pages.

```mdx title="Example"
---
  summary: |
    CRUD based API to handle Basket interactions for users of the shopping website.
---
```

### `repository` {#repository}

The repository for the service.

```mdx title="Example"
---
  repository:
    language: JavaScript
    url: https://github.com/boyney123/pretend-basket-service
---
```

You can specify the language and url for your service repository and EventCatalog will render these out.


### `owners` {#owners}

An array of user ids that own the service.

```mdx title="Example"
---
  owners:
    - dboyne
    - mSmith
---
```

:::tip How to configure users

You can configure users in the `eventcatalog.config.js` file. Find out more reading the [users configuration](/docs/api/eventcatalog-config#users)

:::

### `externalLinks` {#externalLinks}

List of URLs that can be used when people want to reference to external documentation for the service.

- Type: `Tag`
  - `label`: value that gets rendered on the UI
  - `href`: URL for link

```mdx title="Example"
---
  externalLinks: 
    - label: AsyncAPI Specification
      url: https://studio.asyncapi.com/#schema-lightMeasuredPayload
---
```