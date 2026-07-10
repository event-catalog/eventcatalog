---
sidebar_position: 3
sidebar_label: Pass data into components
title: Pass data into components
description: Pass props, frontmatter, variables, and config data into custom components.
---

Components become more useful when they can render data from the page they are used on.

## Use props

Props are values passed into the component when you render it.

```jsx title="/components/service-owner.astro"
---
const { team } = Astro.props;
---

<p class="not-prose text-sm">
  Owned by <strong>{team}</strong>
</p>
```

Render the component from a catalog page.

```tsx title="/services/OrderService/index.mdx"
import ServiceOwner from '@catalog/components/service-owner.astro';

<ServiceOwner team="Commerce Platform" />
```

## Use frontmatter

Every EventCatalog resource page has frontmatter. You can pass that data into your component.

```markdown title="/services/OrderService/index.mdx"
---
id: OrderService
name: Order Service
version: 0.0.1
summary: Handles customer orders.
---

import ServiceSummary from '@catalog/components/service-summary.astro';

<ServiceSummary name={frontmatter.name} summary={frontmatter.summary} />
```

Then read those props in your component.

```jsx title="/components/service-summary.astro"
---
const { name, summary } = Astro.props;
---

<section class="not-prose rounded-lg border border-gray-200 p-4 dark:border-gray-800">
  <h2 class="m-0 text-lg font-semibold">{name}</h2>
  <p class="mb-0 mt-2 text-sm text-gray-600 dark:text-gray-300">{summary}</p>
</section>
```

## Use page variables

You can export variables from an MDX page and pass them into a component.

```tsx title="/services/OrderService/index.mdx"
import ServiceStatus from '@catalog/components/service-status.astro';

export const status = 'Stable';

<ServiceStatus status={status} />
```

## Use catalog config

You can import values from `eventcatalog.config.js` using `@config`.

```jsx title="/components/catalog-name.astro"
---
import config from '@config';
---

<span>{config.title}</span>
```

Use this when a component needs shared catalog settings, organization names, or other global values.
