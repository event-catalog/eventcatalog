---
sidebar_position: 1
id: domain-frontmatter
slug: /api/domain-frontmatter
---

# `Domain Frontmatter Config`

## Overview {#overview}

Domains are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of the domain frontmatter you will find in your domain folders/files.

```mdx"
---
name: Orders
summary: |
  Domain that contains everything about orders
owners:
    - dboyne
    - mSmith
---
```

## Required fields {#required-fields}

### `name` {#name}

- Type: `string`

Name of the domain (needs to match the domain folder name)

```mdx title="Example"
---
  name: Orders
---
```


## Optional fields {#optional-fields}

### `summary` {#summary}

Short summary of your domain, shown on domain summary pages.

```mdx title="Example"
---
  summary: |
    Domain that contains everything about orders
---
```

### `owners` {#owners}

An array of user ids that own the domain.

```mdx title="Example"
---
  owners:
    - dboyne
    - mSmith
---
```

### `externalLinks` {#externalLinks}

List of URLs that can be used when people want to reference to external documentation.

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
