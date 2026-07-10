---
sidebar_position: 7
keywords:
- EventCatalog resource icons
- custom icons
- resource customization
sidebar_label: Resource icons
title: Resource icons
description: Customize the icons shown for resources in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="3.28.1" />

Resource icons let you replace the default icon EventCatalog uses for a resource.

Use them when you want services, messages, data stores, agents, or other catalog resources to show the technology, platform, vendor, or domain-specific concept they represent.

Resource icons can appear in places like:

- Resource page headers
- Search and discover results
- Resource references
- Sidebar navigation
- Visualizer nodes

## Set a resource icon

Add `styles.icon` to the resource frontmatter.

```md title="/services/Orders/index.mdx"
---
id: Orders
name: Orders
version: 1.0.0
summary: Handles order placement and order history.
styles:
  icon: /icons/languages/nodejs.svg
---
```

The icon value must be either:

- a path to a file in your catalog's `public` folder
- an absolute `https://` or `http://` URL

## Use icons from your catalog

Put icon files in your catalog's `public` folder.

<ProjectTree
  items={[
    {
      name: 'public',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'icons',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'languages',
              type: 'folder',
              defaultOpen: true,
              children: [
                { name: 'nodejs.svg', highlight: true },
                { name: 'go.svg', highlight: true },
              ],
            },
            {
              name: 'database',
              type: 'folder',
              defaultOpen: true,
              children: [{ name: 'postgresql.svg', highlight: true }],
            },
          ],
        },
      ],
    },
  ]}
/>

Files in `public` are served from the root of your catalog, so `public/icons/languages/nodejs.svg` is referenced as `/icons/languages/nodejs.svg`.

## Use external icon URLs

You can also use an absolute URL.

```md title="/services/StripePayments/index.mdx"
---
id: StripePayments
name: Stripe Payments
version: 1.0.0
summary: External payment provider used for card payments.
externalSystem: true
styles:
  icon: https://cdn.simpleicons.org/stripe
---
```

[Simple Icons CDN](https://cdn.simpleicons.org) is useful for common technology and vendor logos.

## Examples

### Service icon

```md title="/services/Orders/index.mdx"
---
id: Orders
name: Orders
version: 1.0.0
styles:
  icon: /icons/languages/java.svg
---
```

### Data store icon

```md title="/containers/orders-db/index.mdx"
---
id: orders-db
name: Orders DB
version: 1.0.0
container_type: database
technology: postgres@16
styles:
  icon: /icons/database/postgresql.svg
---
```

### Message icon

```md title="/events/OrderPlaced/index.mdx"
---
id: OrderPlaced
name: Order Placed
version: 1.0.0
summary: Raised when an order is placed.
styles:
  icon: /icons/events/eventbridge.svg
---
```

## Supported file types

Use image files that browsers can render, such as:

- SVG
- PNG
- WEBP

SVG icons usually work best because they stay sharp at different sizes.

## Resource icons vs sidebar icons

Resource icons use file paths or URLs through `styles.icon`.

```md
styles:
  icon: /icons/languages/nodejs.svg
```

Application and documentation sidebar icons are different. Those use icon names from [Lucide](https://lucide.dev/icons/) in your sidebar configuration.

```js title="eventcatalog.config.js"
export default {
  navigation: {
    groups: [
      {
        id: 'main',
        items: [{ id: 'docs', icon: 'BookOpen' }],
      },
    ],
  },
};
```

Use `styles.icon` when you want to customize a resource. Use sidebar icon names when you want to customize navigation.

## Tips

- Keep icons simple and readable at small sizes.
- Prefer square or near-square assets.
- Store shared icons under `public/icons`.
- Use consistent folder names, such as `/icons/languages`, `/icons/database`, or `/icons/tools`.
- Use external URLs only when you are comfortable depending on that external service at runtime.
