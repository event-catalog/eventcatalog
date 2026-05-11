---
keywords:
- EventCatalog components
sidebar_label: Component styling
title: Component styling
description: Adding custom components to your catalog
---

EventCatalog uses [Tailwind](https://tailwindcss.com/). This means your custom components can be styled with tailwind.

```md title="/components/my-component.astro"
---
# Import data from your eventcatalog.config.js file
import config from "@config"
# Access passed-in component props, like `<MyComponent title="Hello, World" />`
const { subtitle } = Astro.props;
---

<main class="flex justify-center">
    <span class="block bg-red-500">This catalog belongs to the company:{config.organizationName}</span>
    <span class="block bg-yellow-500">Data given to this component {subtitle}</span>
</main>

```

Read the full [astro guide here](https://docs.astro.build/en/basics/astro-components/#the-component-script).

