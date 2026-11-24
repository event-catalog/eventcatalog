---
sidebar_position: 1.5
keywords:
- EventCatalog header navigation
- header links
- navigation bar
sidebar_label: Header links
title: Header links
description: Add links to the header, like a docs site's navigation bar.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="5.18.0" />

Add your own links to the header with `navigation.header`, the way a docs site does. They show at the top of every page, before the theme toggle. Use them for the pages people visit most, or for places outside the catalog: your runbooks, a status page, your team's chat channel.

```js title="eventcatalog.config.js"
export default {
  navigation: {
    header: [
      { label: 'Architecture', href: '/visualiser/system-context-map', match: '/visualiser' },
      { label: 'Docs', href: '/docs/custom', match: '/docs/custom' },
      { label: 'Schemas', href: '/schemas/explorer', match: '/schemas' },
      {
        label: 'Resources',
        items: [
          { label: 'Teams', href: '/directory/teams', icon: 'Users', description: 'Who owns what' },
          { label: 'Status page', href: 'https://status.example.com', icon: 'Activity', description: 'Live health of our services' },
        ],
      },
    ],
  },
};
```

An entry with `href` is a link. An entry with `items` is a dropdown.

If you don't set `navigation.header`, the header shows no links.

:::info Header links vs the application sidebar

`navigation.header` adds links to the header. To change the vertical sidebar on the left, use [`navigation.groups`](/docs/development/customization/application-sidebar).

:::

### Link options

| Property | Type | Description |
| --- | --- | --- |
| `label` | `string` | The link's text. Required. |
| `href` | `string` | A page in your catalog (starting with `/`) or another site. Required. |
| `match` | `string \| string[]` | Paths that mark the link as the current section. Defaults to the link's own path. |
| `icon` | `string` | Shown next to the link in a dropdown. Any icon exported by [lucide-react](https://lucide.dev/icons/), such as `BookOpen` or `LifeBuoy`. |
| `description` | `string` | Shown under the link's label in a dropdown. |

An `href` starting with `/` is a page in your catalog, and the catalog's [base path](/docs/api/config#base) is added. Full `https://` URLs open in a new tab. `mailto:` and `tel:` links also work. A link with any other scheme is left out.

### Dropdowns

A dropdown has a `label` and `items`. Each item is a link, or a section with a `label` and its own `items`. Sections are shown side by side as columns.

```js title="eventcatalog.config.js"
export default {
  navigation: {
    header: [
      {
        label: 'Resources',
        items: [
          {
            label: 'Run',
            items: [
              { label: 'Runbooks', href: '/docs/custom/runbooks', icon: 'LifeBuoy', description: 'On-call guides' },
              { label: 'Teams', href: '/directory/teams', icon: 'Users', description: 'Who owns what' },
            ],
          },
          {
            label: 'Learn',
            items: [
              { label: 'Event standards', href: '/docs/custom/standards', icon: 'BookOpen', description: 'How we design events' },
              { label: 'Schema explorer', href: '/schemas/explorer', icon: 'FileCode', description: 'Every schema in one place' },
            ],
          },
        ],
      },
    ],
  },
};
```

The dropdown opens on hover, and when its button is clicked, tapped or selected with the keyboard. Press Escape to close it.

### The current section

The link for the section you're in is highlighted, and so is a dropdown that contains it.

By default, a link counts as current on its own page and on every page under it. A link to `/docs/custom` is current on `/docs/custom/platform/overview`, for example. Use `match` when the link goes to one page but stands for a whole section:

```js title="eventcatalog.config.js"
export default {
  navigation: {
    header: [
      // Goes to the events list, but is current on every Discover page
      { label: 'Discover', href: '/discover/events', match: '/discover' },
      // Current on either section
      { label: 'Standards', href: '/docs/custom/standards', match: ['/docs/custom/standards', '/docs/custom/adrs'] },
    ],
  },
};
```

A link to your catalog's homepage (`/`) is only current on the homepage.

### Small screens

When the header doesn't have room for its links (on a phone, or on a laptop with the sidebar open), they move into a menu behind the menu button.
