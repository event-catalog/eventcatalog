---
sidebar_position: 5
keywords:
- components
sidebar_label: Lucid
title: <Lucid />
description: Embed a Lucid diagram in your documentation
id: lucid
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.34.4" />

The `<Lucid />` component renders a [Lucid diagram](https://lucid.app/) in your documentation.

### Support

The `<Lucid />` component is supported in domains, services, all messages and [custom documentation](/docs/development/bring-your-own-documentation/custom-pages/introduction).

### Usage

1. Include the `<Lucid />` component inside the markdown
    - e.g `/events/MyEvent/index.mdx`

**Basic Example**

```md /events/OrderAmended/index.mdx
---
#event frontmatter
---

<Lucid diagramId="e29f42a0-67e2-4f80-b0d7-6922bb7dd9c5" />
```

### Output example in EventCatalog

![Example output](../components/img/lucid.png)

- [Example: View demo in a domain page](https://demo.eventcatalog.dev/docs/domains/Orders/0.0.3)
- [Example: View demo in custom documentation page](https://demo.eventcatalog.dev/docs/custom/guides/event-storming/01-index)

### Props
| Name                    | Type      | Default           | Required | Description                                                       |
| ----------------------- | --------- | ----------------- | -------- | ----------------------------------------------------------------- |
| `diagramId`               | `string`  |               | Yes      | The ID of the Lucid diagram to embed. You can find the ID in the URL of the Lucid diagram or by clicking "Share" in Lucid and copying the ID from the URL.
