---
sidebar_position: 1
id: event-frontmatter
slug: /api/event-frontmatter
---

# `Event Frontmatter Config`

## Overview {#overview}

Events are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of the event frontmatter you will find in your event files.

```mdx"
---
name: EmailSent
version: 0.6.1
summary: |
  Tells us when an email has been sent
producers:
    - Email Platform
owners:
    - dboyne
    - mSmith
---
```

## Required fields {#required-fields}

### `name` {#name}

- Type: `string`

Name of the event.

```mdx title="Example"
---
  name: EmailSent
---
```

### `version` {#version}

- Type: `string`

The version of your event.

```mdx title="Example"
---
  version: 0.0.1
---
```

:::tip
  You can version your events and use EventCatalog to see previous events and changelogs for events. Check out XXX for more information.
:::


## Optional fields {#optional-fields}

### `summary` {#summary}

Short summary of your event, shown on event summary pages.

```mdx title="Example"
---
  summary: |
    Tells us when an email has been sent
---
```

### `producers` {#producers}

An array of `services` that produce the event.

```mdx title="Example"
---
  producers:
    - Email Platform
    - User Service
    - Internal API
---
```

### `consumers` {#consumers}

An array of `services` that consume/subscribe the event.

```mdx title="Example"
---
  consumers:
    - Email Platform
    - User Service
---
```

### `owners` {#owners}

An array of user ids that own the event.

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

### `tags` {#tags}

List of tags related to the event.

- Type: `Tag`
  - `label`: value that gets rendered on the UI
  - `href`: URL for link (optional)

```mdx title="Example"
---
  tags:
    - label: 'Topic: order-requested'
    - label: 'Broker: kafka'
      url: https://kafka.apache.org
---
```
