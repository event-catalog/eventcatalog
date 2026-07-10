---
sidebar_position: 10
keywords:
- components
sidebar_label: Link
title: Link
description: Create links in your documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.32.3" />

The `<Link/>` component renders a link to a resource in EventCatalog.

EventCatalog handles links depending on your configuration file (e.g trailing slashes, etc), using this component creates links that are consistent with your EventCatalog configuration.

**Basic Example**

```jsx /domains/MyDomain/index.mdx
<Link href="/my/awesome/page">My Awesome Page</Link>

```

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `href`             | `string`  | none           | The href of the link. |

### Support

The `<Link/>` component is supported on all EventCatalog pages.
