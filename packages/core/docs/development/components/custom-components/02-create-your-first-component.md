---
sidebar_position: 2
sidebar_label: Create your first component
title: Create your first component
description: Create a small reusable component and render it in a catalog page.
---

In this guide, we will create a simple component and add it to a service page.

## Create the component

Create a new file in your catalog.

```txt title="File"
/components/service-note.astro
```

Add the component markup.

```jsx title="/components/service-note.astro"
---
const { title = 'Service note' } = Astro.props;
---

<aside class="not-prose rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
  <p class="m-0 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
  <p class="mb-0 mt-2 text-sm text-gray-600 dark:text-gray-300">
    This note is rendered from a custom EventCatalog component.
  </p>
</aside>
```

The `not-prose` class keeps the documentation page typography from changing the spacing and styles inside your component.

## Add it to a page

Open one of your service pages and import the component.

```markdown title="/services/OrderService/index.mdx"
---
id: OrderService
name: Order Service
version: 0.0.1
summary: Handles customer orders.
---

import ServiceNote from '@catalog/components/service-note.astro';

# Order Service

<ServiceNote title="About this service" />
```

## Check the page

Start your catalog and open the service page.

```bash
npm run dev
```

You should see the custom note rendered inside the service documentation.

<div className="not-prose my-8 flex flex-col items-center gap-2">
  <img src="/img/docs/custom-components/first-component.png" alt="Custom service note component rendered in EventCatalog" className="rounded-lg border border-gray-200 shadow-sm dark:border-gray-800" />
  <span className="text-center text-sm italic text-gray-500 dark:text-gray-400">A custom component rendered inside an EventCatalog service page.</span>
</div>

:::tip
Start small. Once you can render one component, the same pattern works for richer cards, tables, status panels, and diagrams.
:::
