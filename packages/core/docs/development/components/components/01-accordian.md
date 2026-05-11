---
sidebar_position: 2
keywords:
- components
sidebar_label: Accordion
title: Accordion
description: Component for EventCatalog
---

The accordion component renders collapsable section in EventCatalog.

```jsx /events/OrderAmended/index.mdx
<Accordion title="Learn how to raise this event">
    This will be rendered as a child inside a collapsible section.
</Accordion>
```
**Example with code as child**

```jsx /events/OrderAmended/index.mdx
<Accordion title="Learn how to raise this event">
  You can run the following command to raise this event.

  ```sh
  bin/kafka-topics.sh --create --topic OrderAmended --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
  ``
</Accordion>
```

### Output

![Example output](./img/accordian.png)

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `title` (required)                 | `string`  | (empty)           | Title to render in your accordion block                              |
| `children`             | `string`  | (empty)           | Content that goes inside your accordion|

### Support

The `<Accordion/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
