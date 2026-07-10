---
sidebar_position: 1
sidebar_label: Introduction
title: Write your own components
description: Learn when and why to create custom components in EventCatalog.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

EventCatalog is powered by [Astro](https://docs.astro.build/en/basics/astro-components/). This means you can create your own components and use them inside your catalog pages.

Custom components are useful when you want to reuse the same block of UI or logic across services, events, domains, teams, and custom documentation pages.

For example, you can create components for:

- service health cards
- ownership summaries
- links to runbooks or dashboards
- API status panels
- scorecards
- custom diagrams
- metadata from another system

## What you will create

In this section, we will create a small component, render it in a service page, pass catalog data into it, fetch data from another system, and add simple browser behavior.

By the end, you will have the main patterns you need to build your own reusable components.

## Component types

EventCatalog supports two types of custom component:

- `.astro` components for reusable UI, JavaScript, data fetching, and dynamic rendering
- `.mdx` components for reusable Markdown content

Most custom components should be `.astro` files. They give you the most flexibility and match how EventCatalog renders built-in components.

## Where components live

Create custom components in the `components` directory at the root of your catalog.

<ProjectTree
  items={[
    {
      name: 'my-catalog',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'components',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'service-summary.astro', highlight: true }],
        },
        { name: 'services', type: 'folder' },
        { name: 'events', type: 'folder' },
        { name: 'eventcatalog.config.js' },
      ],
    },
  ]}
/>

You can import these components into any MDX page using the `@catalog/components` alias.

```tsx title="/services/OrderService/index.mdx"
import ServiceSummary from '@catalog/components/service-summary.astro';

<ServiceSummary />
```

:::tip
Astro has its own component model. If you want to go deeper, read the [Astro components documentation](https://docs.astro.build/en/basics/astro-components/).
:::
