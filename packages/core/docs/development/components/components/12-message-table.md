---
sidebar_position: 12
keywords:
- components
sidebar_label: MessageTable
title: MessageTable
description: Component for displaying messages for services and domains in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.26.0" />

The `<MessageTable/>` component renders a table of messages for a service or domain in EventCatalog.

The component renders a paginated table of messages, with the ability to filter by message type (event, command, query), and text search.

### Use case

- Display all the messages that a service sends and receives.
- Display all the messages that a domain sends and receives.
  - These are all messages that are sent and received in child services of the domain.

**Basic Example**

```jsx /domains/MyDomain/index.mdx
<MessageTable limit={10} showChannels={true} />
```
### Output
![Example output](./img/message-table.png)

See the [demo](https://demo.eventcatalog.dev/docs/domains/Orders/0.0.3) for a full example.

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `format`                  | `string`  | 'all'           | Which messages to render. `all` will render messages that are sent and received. `sends` will render messages that are sent and `receives` will render messages that are received.                               |
| `limit`             | `number`  | 10           | The number of messages to render in the table. Results are paginated. |
| `showChannels`             | `boolean`  | true           | Whether to show the channel information in the table for each message. |

### Support

The `<MessageTable/>` component is supported in domains and services.
