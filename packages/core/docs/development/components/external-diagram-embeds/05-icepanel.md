---
sidebar_position: 5
keywords:
- components
- icepanel
- diagrams
sidebar_label: <IcePanel />
title: <IcePanel />
description: Embed an IcePanel diagram in your documentation
id: icepanel
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.2.1" />

The `<IcePanel />` component renders an [IcePanel diagram](https://icepanel.io/) in your documentation.

Each IcePanel diagram embedded can also be loaded in a full screen mode, letting your teams explore the diagram in detail.

### Support

The `<IcePanel />` component is supported in domains, services, all messages and [custom documentation](/docs/development/bring-your-own-documentation/custom-pages/introduction).

### Usage

1. Get your IcePanel share URL from your IcePanel diagram (click "Share" and copy the embed URL)
2. Include the `<IcePanel />` component inside the markdown
    - e.g `/events/MyEvent/index.mdx`

**Basic Example**

```md /events/OrderAmended/index.mdx
---
#event frontmatter
---

<IcePanel url="https://s.icepanel.io/OpQVdslrqhZkyb/0QfB" />
```

**Example with title and description**

```md /events/OrderAmended/index.mdx
---
#event frontmatter
---

<IcePanel
  url="https://s.icepanel.io/OpQVdslrqhZkyb/0QfB"
  title="System Architecture"
  description="Overview of our microservices architecture and communication patterns."
  height="800"
/>
```

### Output example in EventCatalog

![Example output](/img/ice-panel.png)

### Props
| Name          | Type     | Default | Required | Description                                                                                                     |
| ------------- | -------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `url`         | `string` |         | Yes      | The share URL of the IcePanel diagram. To get the URL, click "Share" in IcePanel and copy the embed/share URL. |
| `title`       | `string` |         | No       | The title to display above the diagram.                                                                         |
| `description` | `string` |         | No       | A description to display below the title.                                                                       |
| `height`      | `string` | `600`   | No       | The height of the embedded diagram in pixels.                                                                   |
| `width`       | `string` | `100%`  | No       | The width of the embedded diagram.                                                                              |

