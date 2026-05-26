---
sidebar_position: 18
keywords:
  - components
  - prompt
  - ai
  - cursor
  - clipboard
sidebar_label: Prompt
title: Prompt
description: Embed copyable AI prompts into resource documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.32.2" />

`<Prompt />` lets you embed ready-to-use AI prompts directly in your documentation pages. Readers can copy the prompt to their clipboard or open it straight in Cursor with one click.

Place the prompt text as the slot content and configure the label and actions via props.

**Copy only (default)**

```jsx /events/OrderCreated/index.mdx
<Prompt description="Generate test cases for this event">
  You are a senior QA engineer. Review the OrderCreated event schema above and write
  Jest test cases that cover the happy path and the top three failure modes.
</Prompt>
```

**Copy and open in Cursor**

```jsx /services/OrdersService/index.mdx
<Prompt
  description="Generate Gherkin scenarios for this service"
  actions={["copy", "cursor"]}
  icon="sparkles"
>
  You are a senior QA engineer. Read the attached service documentation and produce
  Gherkin Given/When/Then scenarios covering the happy path and the top three failure modes.
</Prompt>
```

### Output
![Example output](./img/prompt.png)

### Props

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `description` (required) | `string` | — | Short label shown to the reader, e.g. "Generate test cases for this event". |
| `actions` (optional) | `('copy' \| 'cursor')[]` | `['copy']` | Buttons to render. `'copy'` adds a clipboard button; `'cursor'` adds an "Open in Cursor" deep-link button. |
| `icon` (optional) | `string` | — | Lucide icon name to display beside the description. Accepts kebab-case, snake_case, or space-separated input (e.g. `"sparkles"`, `"bot-message-square"`). |

### Understand the actions

Use `actions={["copy"]}` (the default) when you only need clipboard support. Add `"cursor"` to the array when your team works in Cursor and you want a one-click "Open in Cursor" button that pre-fills the prompt.

Both actions derive their text from the slot content. HTML tags are stripped automatically, so plain text is always passed to the clipboard and the Cursor deep-link.

### Use the icon prop

Pass any [Lucide](https://lucide.dev/icons/) icon name to the `icon` prop. The component normalises the value to PascalCase internally, so `"bot-message-square"`, `"bot_message_square"`, and `"Bot Message Square"` all resolve to the same icon.

If the icon name is not found in the Lucide library, no icon is rendered and no error is thrown.

### Support

The `<Prompt />` component is supported in domains, services, all messages, changelogs, and custom documentation pages.
