---
keywords:
  - EventCatalog components
sidebar_label: Client side scripts
title: Client side scripts
description: Adding client side scripts to EventCatalog components
---

EventCatalog allows you to add client side JavaScript to your components.

```md title="/components/my-component.astro"
---
# component template scripts.
---

<button class="alert">Click me!</button>

<!-- This script will get called in the browser -->
<script>
  // Find all buttons with the `alert` class on the page.
  const buttons = document.querySelectorAll('button.alert');

  // Handle clicks on each button.
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      alert('Button was clicked!');
    });
  });
</script>
```

Read the [astro documentation for more information](https://docs.astro.build/en/guides/client-side-scripts/#using-script-in-astro).
