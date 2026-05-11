---
sidebar_position: 2
keywords:
- components
sidebar_label: <FigJam />
title: <FigJam />
description: Embed a FigJam diagram in your documentation
id: figjam
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.34.6" />

The `<FigJam />` component renders a [FigJam diagram](https://www.figma.com/figjam/) in your documentation.

### Support

The `<FigJam />` component is supported in domains, services, all messages and [custom documentation](/docs/development/bring-your-own-documentation/custom-pages/introduction).

### Usage

1. Include the `<FigJam />` component inside the markdown
    - e.g `/events/MyEvent/index.mdx`

**Basic Example**

```md /events/OrderAmended/index.mdx
---
#event frontmatter
---

<FigJam url="{embed_url_from_figjam}" />
```

### Output example in EventCatalog

![Example output](../components/img/figjam.png)

### Props
| Name                    | Type      | Default           | Required | Description                                                       |
| ----------------------- | --------- | ----------------- | -------- | ----------------------------------------------------------------- |
| `url`               | `string`  |               | Yes      | The embed URL of the FigJam diagram. To get the URL, click "Shared", "Get embed code", then copy the URL from the iframe.

