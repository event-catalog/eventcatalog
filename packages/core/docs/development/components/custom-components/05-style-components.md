---
sidebar_position: 5
sidebar_label: Style components
title: Style components
description: Style custom EventCatalog components with Tailwind CSS.
---

EventCatalog includes Tailwind CSS. You can use Tailwind classes inside your custom components.

```jsx title="/components/service-card.astro"
---
const { name, summary } = Astro.props;
---

<article class="not-prose rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
  <h2 class="m-0 text-base font-semibold text-gray-900 dark:text-gray-100">{name}</h2>
  <p class="mb-0 mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{summary}</p>
</article>
```

Use the component from a catalog page.

```tsx title="/services/OrderService/index.mdx"
import ServiceCard from '@catalog/components/service-card.astro';

<ServiceCard name={frontmatter.name} summary={frontmatter.summary} />
```

## Keep components readable

Custom components usually sit inside documentation pages, so keep them simple.

- Use small, focused components.
- Prefer readable text over dense layouts.
- Support light and dark mode.
- Avoid large custom layouts unless the component needs them.

## Use local styles when needed

Astro components can include a `<style>` block.

```jsx title="/components/status-pill.astro"
---
const { status } = Astro.props;
---

<span class="not-prose status-pill">{status}</span>

<style>
  .status-pill {
    border: 1px solid var(--ifm-color-emphasis-300);
    border-radius: 999px;
    display: inline-flex;
    font-size: 0.875rem;
    padding: 0.125rem 0.5rem;
  }
</style>
```

Use Tailwind for most styling, and local CSS when a component needs a small custom rule.
