---
sidebar_position: 6
sidebar_label: Client-side scripts
title: Add client-side scripts
description: Add browser JavaScript to custom EventCatalog components.
---

Astro components render HTML by default. If your component needs browser behavior, add a `<script>` tag.

## Add a copy button

Create a component that copies text to the clipboard.

```jsx title="/components/copy-command.astro"
---
const { command } = Astro.props;
---

<div class="not-prose flex items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
  <code class="flex-1 text-sm">{command}</code>
  <button type="button" data-copy-command={command} class="rounded-md border border-gray-200 px-3 py-1 text-sm dark:border-gray-700">
    Copy
  </button>
</div>

<script>
  const buttons = document.querySelectorAll('[data-copy-command]');

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const command = button.getAttribute('data-copy-command');
      await navigator.clipboard.writeText(command);
      button.textContent = 'Copied';
    });
  });
</script>
```

Use it in a page.

```tsx title="/docs/runbooks/deploy-order-service.mdx"
import CopyCommand from '@catalog/components/copy-command.astro';

<CopyCommand command="npm run deploy:orders" />
```

## Pass data through HTML attributes

The component script runs when the page loads in the browser. If it needs values from `Astro.props`, render them as HTML attributes first.

```jsx
---
const { message } = Astro.props;
---

<button data-message={message}>Show message</button>

<script>
  document.querySelectorAll('[data-message]').forEach((button) => {
    button.addEventListener('click', () => {
      alert(button.getAttribute('data-message'));
    });
  });
</script>
```

Read the [Astro client-side scripts documentation](https://docs.astro.build/en/guides/client-side-scripts/) for more details.
