---
sidebar_position: 7
sidebar_label: Reference
title: Custom components reference
description: Reference for custom components in EventCatalog.
---

## Component directory

Custom components live in the `components` directory at the root of your catalog.

```txt
my-catalog/
└── components/
    ├── service-card.astro
    └── reusable-note.mdx
```

## Import path

Use the `@catalog/components` alias to import custom components.

```tsx
import ServiceCard from '@catalog/components/service-card.astro';
```

## Supported file types

| File type | Use for |
| --- | --- |
| `.astro` | Reusable UI, props, data fetching, browser scripts, and styling |
| `.mdx` | Reusable Markdown content |

## Astro component structure

Astro components have a component script and a component template.

```jsx
---
// Component script
const { title } = Astro.props;
---

<!-- Component template -->
<h2>{title}</h2>
```

Read the [Astro components documentation](https://docs.astro.build/en/basics/astro-components/) for the full syntax.

## Props

Read props with `Astro.props`.

```jsx
---
const { title, summary } = Astro.props;
---
```

Pass props from MDX.

```tsx
<ServiceCard title="Order Service" summary="Handles customer orders." />
```

## Frontmatter

Resource frontmatter can be passed into components from MDX pages.

```tsx
<ServiceCard title={frontmatter.name} summary={frontmatter.summary} />
```

## Catalog config

Import `eventcatalog.config.js` values with `@config`.

```jsx
---
import config from '@config';
---

<span>{config.title}</span>
```

## Data fetching

Use `await fetch()` in Astro component frontmatter for build-time data.

```jsx
---
const response = await fetch('https://api.example.com/status');
const status = await response.json();
---
```

Use browser JavaScript when data should be fetched after the page loads.

```jsx
<div data-status class="not-prose">Loading...</div>

<script>
  const response = await fetch('/status.json');
  const data = await response.json();
  document.querySelector('[data-status]').textContent = data.status;
</script>
```

## Related documentation

- [Using components](/docs/development/components/using-components)
- [Built-in components](/docs/components)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Astro data fetching](https://docs.astro.build/en/guides/data-fetching/)
- [Astro client-side scripts](https://docs.astro.build/en/guides/client-side-scripts/)
