---
sidebar_position: 5
keywords:
- build
- deploy
sidebar_label: Build (Static Mode)
title: Building Eventcatalog
description: This document describes step by step how to deploy EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

By default, EventCatalog exports a static HTML site. This means you can deploy your application anywhere you want.

:::tip Have large or slow deployments?
Some users have large catalogs, and slow deployments. This is because the static mode builds the entire catalog into HTML files.

If you have a large catalog you may want to use [SSR mode](/docs/development/deployment/build-ssr-mode), this will give you a server-side rendered application. 
This reduces build times, and renders pages on the fly. 
:::


## Building your EventCatalog (Static)

To build your Catalog you will need to run:

```bash
npm run build
```

This will output one directory

- `dist` - Your EventCatalog as Static HTML

### Passing custom options

<AddedIn version="2.16.5" />

EventCatalog uses [Astro](https://astro.build/) to build the application. You can pass custom options to the build command by using the `--` prefix.

```bash title="Passing custom options"
npx eventcatalog dev --debug -- --env=production --port=3000
```

### Compression

You can opt into our build step which will compress your static assets. 

You can enable this by setting the [compress option](/docs/api/config#compress) to `true` in your `eventcatalog.config.js` file.

:::info "Why is compression disabled by default?"
Compression can increase your build time and the amount of memory required to build your catalog.

If you want to enable this feature, you might also want to increase your build memory using the `max_old_space_size` value.
:::

### Memory limits

If you get any `JavaScript heap out of memory` errors, you can increase the memory limit by setting the `NODE_OPTIONS` environment variable. This gives astro more memory to work with.

```bash title="Increasing the memory limit"
NODE_OPTIONS=--max_old_space_size=8196 npm run build
```

If you are still experiencing issues, you can try:


- Turning off HTML compression ([see documentation](/docs/api/config#compress))
- Turning on MDX optimization ([see documentation](/docs/api/config#mdxOptimize))
- Rendering EventCatalog in [SSR mode](/docs/development/deployment/build-ssr-mode). 
    - This requires you to run your EventCatalog on a server. But your pages are rendered on the fly, so you don't need to build the entire catalog into HTML files. This can also save you a lot of time when deploying your catalog.
