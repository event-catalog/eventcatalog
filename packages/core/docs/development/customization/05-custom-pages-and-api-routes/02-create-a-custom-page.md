---
sidebar_position: 2
keywords:
  - EventCatalog custom pages
  - Astro page
  - custom routes
sidebar_label: Create a custom page
title: Create a custom page
description: Add a custom Astro page to your EventCatalog.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

This guide shows you how to add a custom page to your catalog.

Use this when you want a new route for an internal report, dashboard, onboarding page, or catalog-specific workflow. The page can be static, built from catalog data, or use browser-side code to call API routes and other systems.

## Create the page file

Create a top-level `pages` directory and add an `.astro` file.

<ProjectTree
  items={[
    {
      name: 'pages',
      type: 'folder',
      defaultOpen: true,
      children: [
        { name: 'reports.astro', highlight: true },
      ],
    },
  ]}
/>

```js title="pages/reports.astro"
---
// Use the EventCatalog layout so your page keeps the catalog header and sidebar.
import Layout from '@catalog/layouts/Layout.astro';

// Use @catalog/utils to read catalog resources from your custom page.
import { getServices } from '@catalog/utils';

// getAllVersions: false returns the latest version of each service.
const services = await getServices({ getAllVersions: false });
---

<Layout title="Service reports" description="Operational views built from catalog data.">
  <div class="not-prose space-y-6">
    <div>
      <h1 class="text-3xl font-semibold">Service reports</h1>
      <p class="text-gray-600">There are {services.length} services in this catalog.</p>
    </div>

    <ul class="grid gap-3 md:grid-cols-2">
      {services.map((service) => (
        <li class="rounded-lg border border-gray-200 p-4">
          <h2 class="font-semibold">{service.data.name}</h2>
          <p class="text-sm text-gray-600">{service.data.summary}</p>
        </li>
      ))}
    </ul>
  </div>
</Layout>
```

## Run your catalog

Start EventCatalog.

```bash
npm run dev
```

Open `/custom/reports`.

## Add the page to your navigation

Custom pages are available by URL as soon as you create them. To make the page easier for users to find, add it to your application sidebar.

Add a custom navigation item in `eventcatalog.config.js`.

```js title="eventcatalog.config.js"
export default {
  navigation: {
    groups: [
      {
        id: 'tools',
        label: 'Tools',
        items: [
          {
            id: 'service-reports',
            label: 'Service reports',
            icon: 'ChartBar',
            href: '/custom/reports',
            match: ['/custom/reports'],
          },
        ],
      },
    ],
  },
};
```

The `href` is the custom page route. The `match` value tells EventCatalog when to mark the navigation item as active.

For more navigation options, see [Application sidebar](/docs/development/customization/application-sidebar).

## Add a custom component

You can reuse Astro components from your catalog's top-level `components` directory.

<ProjectTree
  items={[
    {
      name: 'components',
      type: 'folder',
      defaultOpen: true,
      children: [{ name: 'ReportCard.astro', highlight: true }],
    },
    {
      name: 'pages',
      type: 'folder',
      defaultOpen: true,
      children: [{ name: 'reports.astro' }],
    },
  ]}
/>

```js title="components/ReportCard.astro"
---
// Props are values passed into this component from the page that renders it.
const { title, description } = Astro.props;
---

<article class="rounded-lg border border-gray-200 p-4">
  <h2 class="font-semibold">{title}</h2>
  <p class="text-sm text-gray-600">{description}</p>
</article>
```

Import the component into your custom page.

```js title="pages/reports.astro"
---
import Layout from '@catalog/layouts/Layout.astro';

// Components in your catalog's top-level components directory are available from @catalog/components.
import ReportCard from '@catalog/components/ReportCard.astro';
---

<Layout title="Reports">
  <ReportCard title="Service health" description="Operational view for catalog services." />
</Layout>
```

## Add a dynamic page

Use Astro dynamic route segments when the route needs a parameter.

```js title="pages/reports/[id].astro"
---
import Layout from '@catalog/layouts/Layout.astro';

// Dynamic route parameters come from the filename. Here, [id].astro provides Astro.params.id.
const { id } = Astro.params;
---

<Layout title={`Report: ${id}`}>
  <h1>Report: {id}</h1>
</Layout>
```

This page is available at `/custom/reports/:id`, for example `/custom/reports/orders`.

## Learn more

Custom pages follow Astro's routing model. See the [Astro pages documentation](https://docs.astro.build/en/basics/astro-pages/) if you want to go deeper.
