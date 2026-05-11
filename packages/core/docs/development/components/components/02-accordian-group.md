---
sidebar_position: 2
keywords:
- components
sidebar_label: AccordionGroup
title: AccordionGroup
description: Component for EventCatalog
---

The accordion group component renders a collection of accordions.

**Basic Example**

```jsx /events/OrderAmended/index.mdx
<AccordionGroup>
  <Accordion title="Example 1">Hello</Accordion>
  <Accordion title="Example 2">Hello this is an example</Accordion>
  <Accordion title="Example 3">Another example</Accordion>
  <Accordion title="Example 4">Final example</Accordion>
</AccordionGroup>
```

**Code example**

Add code inside the Accordion to render code snippets.

```jsx /events/OrderAmended/index.mdx
<AccordionGroup>
  <Accordion title="Code snippet 1">
    ```js
    console.log('My code here');
    ``
  </Accordion>
  <Accordion title="Code snippet 2">
  ```js
    console.log('My other code snippet');
  ``
  </Accordion>
  <Accordion title="Schema example">
  ```json
  { "test": true}
  ``
  </Accordion>
</AccordionGroup>
```

### Output
![Example output](./img/accordiangroup.png)

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `children`             | `Accordion`  | (empty)           | Accordion components that are contained within the group|

### Support

The `<AccordionGroup/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
