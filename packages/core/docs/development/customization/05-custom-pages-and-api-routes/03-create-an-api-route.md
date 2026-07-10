---
sidebar_position: 3
keywords:
  - EventCatalog API routes
  - Astro endpoints
  - server mode
sidebar_label: Create an API route
title: Create an API route
description: Add a custom API route to your EventCatalog.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

This guide shows you how to add a custom API route to your catalog.

Use this when you want to expose catalog data, receive form submissions, or power a custom page with server-side logic. API routes are also useful when a custom page needs data from another internal system and you want that integration to live inside EventCatalog.

## Enable server mode

Custom API routes require EventCatalog to run in server mode when you build the catalog.

Set `output: 'server'` in `eventcatalog.config.js`.

```js title="eventcatalog.config.js"
export default {
  output: 'server',
};
```

## Create the endpoint file

Create a file inside `pages/api`.

<ProjectTree
  items={[
    {
      name: 'pages',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'api',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'services.ts', highlight: true }],
        },
      ],
    },
  ]}
/>

```js title="pages/api/services.ts"
import type { APIRoute } from 'astro';

// Use @catalog/utils to read catalog resources from your API route.
import { getServices } from '@catalog/utils';

// Export a function named after the HTTP method this route should handle.
export const GET: APIRoute = async () => {
  // getAllVersions: false returns the latest version of each service.
  const services = await getServices({ getAllVersions: false });

  return Response.json({
    services: services.map((service) => ({
      id: service.data.id,
      name: service.data.name,
      version: service.data.version,
    })),
  });
};
```

This route is served at `/custom/api/services`.

## Add another HTTP method

Astro calls exported functions that match the request method, such as `GET`, `POST`, or `DELETE`.

```js title="pages/api/reviews.ts"
import type { APIRoute } from 'astro';

// This function handles POST requests sent to /custom/api/reviews.
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  return Response.json({
    status: 'received',
    resource: body.resource,
  });
};
```

This route receives `POST` requests at `/custom/api/reviews`.

## Call an API route from a custom page

You can call your API route from a custom page like any other endpoint.

```js title="pages/reports.astro"
---
// Use the EventCatalog layout so your page keeps the catalog header and sidebar.
import Layout from '@catalog/layouts/Layout.astro';
---

<Layout title="Reports">
  <button id="load-services">Load services</button>
  <pre id="services-output"></pre>
</Layout>

<script>
  const button = document.querySelector('#load-services');
  const output = document.querySelector('#services-output');

  button?.addEventListener('click', async () => {
    // This calls the custom API route defined in pages/api/services.ts.
    const response = await fetch('/custom/api/services');
    const data = await response.json();

    if (output) {
      output.textContent = JSON.stringify(data, null, 2);
    }
  });
</script>
```

## Learn more

Custom API routes follow Astro's endpoint model. See the [Astro endpoints documentation](https://docs.astro.build/en/guides/endpoints/) if you want to go deeper.
