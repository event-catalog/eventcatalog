---
sidebar_position: 1
keywords:
  - EventCatalog search
  - full-content search
  - indexed search
  - pagefind
  - search configuration
sidebar_label: Search
title: Search
description: Configure resource metadata search or opt-in to full-content indexed search
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.36.0" />

EventCatalog ships with two search modes. The default is a fast metadata search that works with no extra configuration. An opt-in indexed mode adds full-content search powered by [Pagefind](https://pagefind.app/).

## Understand the modes

**Resource search (default)** indexes the metadata of every catalog resource — names, summaries, badges, types, and identifiers. It is fast, requires no build step, and works in both `static` and `server` output modes.

**Indexed search (opt-in)** builds a static index of the full markdown content of your catalog at build time. It can find matches inside the body of a page, changelogs, custom docs, and resource docs — not just the frontmatter fields.

## Enable indexed search

Set `search.type` to `'indexed'` in `eventcatalog.config.js`:

```js title="eventcatalog.config.js"
module.exports = {
  search: {
    type: 'indexed',
  },
};
```

No other changes are required. The index is built automatically as part of `eventcatalog build` and also during `eventcatalog dev`.

## What gets indexed

When indexed search is enabled, the following content is included in the index:

- All catalog resources: events, commands, queries, services, domains, subdomains, channels, containers, data products, entities, and flows
- Custom docs pages
- Resource docs
- Changelogs

## When the index is built

During `eventcatalog build`, the indexer runs after the Astro build and writes the index to `<outDir>/pagefind`.

During `eventcatalog dev`, the index is built on startup and rebuilt automatically whenever any `.md` or `.mdx` file changes (debounced to avoid excessive rebuilds). The first build may take a few seconds depending on the size of your catalog. Subsequent incremental rebuilds are faster.

## Result ranking

Indexed results are ranked by relevance. Matches in the resource title and identifier score highest, followed by matches in the summary and type. Content-body matches score lower than title matches but are still surfaced when no title match is found.

## Auth and the `/pagefind` assets

:::warning Private catalogs
If your catalog uses authentication (an `eventcatalog.auth.js` file is present), the generated `/pagefind` directory is served as static client-readable assets. Anyone who can load the page can download the index, which contains the full text of all indexed content.

Ensure your deployment platform protects the `/pagefind` path behind the same authentication layer as the rest of your catalog.
:::

## Keep resource search

To stay on the default resource search, either omit the `search` key entirely or set the type explicitly:

```js title="eventcatalog.config.js"
module.exports = {
  search: {
    type: 'resource', // default, no index built
  },
};
```

Existing catalogs are not affected by this feature — no changes are needed unless you want to opt in.
