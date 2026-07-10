---
sidebar_position: 4
sidebar_label: Fetch data
title: Fetch data in components
description: Fetch build-time, runtime, or browser data from custom EventCatalog components.
---

Custom components can fetch data from other systems. This is useful when your documentation needs to show information from tools such as internal platforms, service catalogs, monitoring systems, observability platforms, on-call tools, custom registries, schema registries, or deployment platforms.

Astro components can use `await fetch()` in the component frontmatter. EventCatalog is powered by Astro, so the same pattern works in custom EventCatalog components.

## Fetch and render data

This example fetches a random user and renders their name and location.

```jsx title="/components/random-user.astro"
---
const response = await fetch('https://randomuser.me/api/');
const data = await response.json();
const randomUser = data.results[0];
---

<article class="not-prose rounded-lg border border-gray-200 p-4 dark:border-gray-800">
  <p class="m-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
    {randomUser.name.first} {randomUser.name.last}
  </p>
  <p class="mb-0 mt-2 text-sm text-gray-600 dark:text-gray-300">
    {randomUser.location.city}, {randomUser.location.country}
  </p>
</article>
```

Use the component in a catalog page.

```tsx title="/services/OrderService/index.mdx"
import RandomUser from '@catalog/components/random-user.astro';

<RandomUser />
```

The same pattern can be used to render data from systems your team already uses.

For example, you might fetch:

- a service owner from an internal platform API
- a support rotation from an on-call tool
- a maturity score from a scorecard system
- repository metadata from GitHub
- deployment metadata from your platform

## Static builds

By default, EventCatalog builds a static website.

In a static build, `fetch()` calls in Astro component frontmatter run when the catalog is built. The fetched data is written into the generated HTML.

This means:

- the data is captured at build time
- the page will not refetch that data for every viewer
- the page updates when you rebuild and redeploy the catalog
- a failed API request can fail the build unless you handle the error

Static fetching works well for documentation data that does not need to change every time someone opens the page.

```jsx title="/components/service-score.astro"
---
const { service } = Astro.props;

let score = 'Unknown';

try {
  const response = await fetch(`https://platform.example.com/services/${service}/score`);
  const data = await response.json();
  score = data.score;
} catch {
  score = 'Unavailable';
}
---

<span class="not-prose rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-gray-800">
  Score: {score}
</span>
```

Use this pattern when the data can be slightly stale and tied to your documentation release process.

## SSR builds

EventCatalog can also run in [SSR mode](/docs/development/deployment/build-ssr-mode).

In SSR mode, pages are rendered by a server. Astro frontmatter fetches run at runtime instead of only during the static build.

This means:

- the data can be fresher
- the request can use server-side environment variables
- the catalog needs a running server
- slow APIs can slow down the page unless you cache or handle failures

SSR mode is a better fit when the component needs private or frequently changing data.

You can enable server output in `eventcatalog.config.js`.

```js title="/eventcatalog.config.js"
export default {
  output: 'server',
};
```

Read more about [EventCatalog static and server output](/docs/development/getting-started/develop-and-build#eventcatalog-static-vs-server-output).

## Private APIs and API keys

If the API requires a token, keep the token on the server.

For static builds, the token can be available in your build environment. The fetch runs during the build, and only the rendered result is included in the generated HTML. You can store secrets in your `.env` file or deployment environment variables. Read more about [configuring environment variables](/docs/development/getting-started/configuration-overview#configuring-environment-variables).

```jsx title="/components/internal-service-score.astro"
---
const { service } = Astro.props;

const response = await fetch(`https://platform.example.com/services/${service}/score`, {
  headers: {
    Authorization: `Bearer ${process.env.PLATFORM_API_TOKEN}`,
  },
});

const data = await response.json();
---

<span class="not-prose rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-gray-800">
  Score: {data.score}
</span>
```

For SSR builds, the token is read by the server at runtime.

:::caution
Do not render API keys into the page, pass them to client-side scripts, or expose them through props that end up in HTML.
:::

If the request must happen in the browser, do not call private APIs directly with a secret. Use a server-side endpoint, proxy, or SSR component that keeps the token on the server.

## Browser fetching

Use browser fetching when the data should update after the page loads and does not require a private secret.

```jsx title="/components/live-status.astro"
---
const { endpoint } = Astro.props;
---

<div data-service-status data-endpoint={endpoint} class="not-prose rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
  Loading status...
</div>

<script>
  const elements = document.querySelectorAll('[data-service-status]');

  elements.forEach(async (element) => {
    const endpoint = element.getAttribute('data-endpoint');

    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      element.textContent = `Status: ${data.status}`;
    } catch {
      element.textContent = 'Status unavailable';
    }
  });
</script>
```

Use the component in a page.

```tsx title="/services/OrderService/index.mdx"
import LiveStatus from '@catalog/components/live-status.astro';

<LiveStatus endpoint="https://status.example.com/order-service.json" />
```

## Which pattern should you use?

Use static build fetching when the data can be part of the generated documentation.

Use SSR fetching when the data should be fresh at request time or needs private server-side credentials.

Use browser fetching when the data is public and should update after the page loads.

For more examples, read the [Astro data fetching documentation](https://docs.astro.build/en/guides/data-fetching/).
