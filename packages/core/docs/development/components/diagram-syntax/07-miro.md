---
sidebar_position: 7
keywords:
- components
sidebar_label: Miro
title: <Miro />
description: Embed a Miro board in your documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.33.4" />

The `<Miro />` component renders a [Miro board](https://miro.com/) in your documentation.

Each Miro board embedded can also be loaded in a full screen mode, letting your teams edit the board live ([view demo](https://demo.eventcatalog.dev/miro?autoplay=true&embedMode=view_only_without_ui&moveToWidget=3074457347671667709&boardId=uXjVIHCImos=/&back=/docs/domains/Orders/0.0.3)).

### Support

The `<Miro />` component is supported in domains, services, all messages and [custom documentation](/docs/development/bring-your-own-documentation/custom-pages/introduction).

### Usage

1. Include the `<Miro />` component inside the markdown
    - e.g `/events/MyEvent/index.mdx`

**Basic Example**

```md /events/OrderAmended/index.mdx
---
#event frontmatter
---

<Miro boardId="uXjVIHCImos=/" edit={false} />
```
**Example with edit enabled and scroll to default widget in Miro**

```md /events/OrderAmended/index.mdx
---
#event frontmatter
---

<Miro boardId="uXjVIHCImos=/" moveToWidget="3074457347671667709" edit={false} />
```

### Output example in EventCatalog

![Example output](../components/img/miro.png)

- [Example: View demo in a domain page](https://demo.eventcatalog.dev/docs/domains/Orders/0.0.3)
- [Example: View demo in custom documentation page](https://demo.eventcatalog.dev/docs/custom/guides/event-storming/01-index)
- [Example: View demo of screen Miro board in EventCatalog](https://demo.eventcatalog.dev/miro?autoplay=true&embedMode=view_only_without_ui&moveToWidget=3074457347671667709&boardId=uXjVIHCImos=/&back=/docs/domains/Orders/0.0.3#undefined-miro-title)

### Props
| Name                    | Type      | Default           | Required | Description                                                       |
| ----------------------- | --------- | ----------------- | -------- | ----------------------------------------------------------------- |
| `boardId`               | `string`  |               | Yes      | The ID of the Miro board to embed. ([miro docs](https://developers.miro.com/docs/miro-live-embed-with-a-direct-link#get-the-board-id))
| `edit`                  | `boolean` | `false`           | No       | Whether to enable edit mode for the Miro board.                    |
| `moveToViewport`        | `string`  |        | No       | The ID of the widget to scroll to. ([miro docs](https://developers.miro.com/docs/miro-live-embed-with-a-direct-link#set-the-initial-view-based-on-a-specific-viewport))                                |
| `moveToWidget`          | `string`  |        | No       | The ID of the widget to scroll to. ([miro docs](https://developers.miro.com/docs/miro-live-embed-with-a-direct-link#set-the-initial-view-based-on-a-specific-board-item))                                |
| `height`                | `string`  | `500`             | No       | The height of the Miro board.                                        |
| `title`                 | `string`  |        | No       | The title of the Miro board.                                        |
| `autoplay`              | `boolean` | `true`            | No       | Whether to skip the preloader of the miro board. ([miro docs](https://developers.miro.com/docs/miro-live-embed-with-a-direct-link#skip-the-preloader-screen))                                  |
