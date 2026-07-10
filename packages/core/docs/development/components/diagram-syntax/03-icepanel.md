---
sidebar_position: 3
keywords:
- icepanel
- diagrams
- architecture
sidebar_label: IcePanel
title: Using IcePanel
description: Understanding how to embed IcePanel diagrams in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.2.1" />

EventCatalog supports embedding [IcePanel](https://icepanel.io/) diagrams in all your markdown files.

IcePanel is a collaborative diagramming tool designed for visualizing software architecture using the [C4 model](https://c4model.com/). It helps teams create interactive system context, container, and component diagrams that can be shared and explored.

![Example output](/img/ice-panel.png)

## Using IcePanel in EventCatalog

To embed an IcePanel diagram, use the `<IcePanel />` component in any markdown file.

### Getting your IcePanel share URL

1. Open your diagram in IcePanel
2. Click the **Share** button
3. Copy the share/embed URL (it should look like `https://s.icepanel.io/...`)

### Basic Example

```markdown
---
# your frontmatter
---

<IcePanel url="https://s.icepanel.io/OpQVdslrqhZkyb/0QfB" />
```

### Example with title and description

```markdown
---
# your frontmatter
---

<IcePanel
  url="https://s.icepanel.io/OpQVdslrqhZkyb/0QfB"
  title="System Architecture"
  description="Overview of our microservices architecture showing how services communicate."
  height="800"
/>
```

### Full screen mode

Each embedded IcePanel diagram includes a full screen button, allowing your teams to explore the diagram in detail without leaving EventCatalog.

### Props

| Name          | Type     | Default | Required | Description                                                                                                     |
| ------------- | -------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `url`         | `string` |         | Yes      | The share URL of the IcePanel diagram. To get the URL, click "Share" in IcePanel and copy the embed/share URL. |
| `title`       | `string` |         | No       | The title to display above the diagram.                                                                         |
| `description` | `string` |         | No       | A description to display below the title.                                                                       |
| `height`      | `string` | `600`   | No       | The height of the embedded diagram in pixels.                                                                   |
| `width`       | `string` | `100%`  | No       | The width of the embedded diagram.                                                                              |

### More resources

- [IcePanel documentation](https://docs.icepanel.io/) - Learn more about IcePanel and how to use it
- [C4 model](https://c4model.com/) - Learn about the C4 model for visualizing software architecture
