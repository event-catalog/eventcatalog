---
sidebar_position: 5
keywords:
- build
- deploy
sidebar_label: Build (SSR Mode)
title: Building Eventcatalog
description: This document describes step by step how to deploy EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

You can also use EventCatalog in SSR mode, which means you can use EventCatalog as a server-side rendered application.

This can be useful for large catalogs, or for users with slow deployment times.

Certain features like **Authentication** and **EventCatalog Chat** require SSR mode.

### How it works

Rather than building the entire catalog into HTML files, EventCatalog will render the pages on the fly (using server-side rendering).

This means you can use EventCatalog as a server-side rendered application.

## Building your EventCatalog (SSR)

First you need to update your `eventcatalog.config.js` file to use SSR mode.

```js title="eventcatalog.config.js"
export default {
  // defaults to static
  output: 'server', 
}
```

Next you need to build your EventCatalog

```bash
npm run build
```

This will output one directory

- `dist` - Your EventCatalog as a SSR application

## Deployment   

You will need to deploy your EventCatalog to a server that can run Node.js.

The easiest way to do this is to use [a docker container](/docs/development/deployment/hosting-options#hosting-static-website-with-docker).