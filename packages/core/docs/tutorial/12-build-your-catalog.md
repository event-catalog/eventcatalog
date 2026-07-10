---
sidebar_position: 10
sidebar_label: Build and deploy
title: Build and deploy your catalog
description: Build your EventCatalog site and choose a deployment path.
---

import ChapterOverview from '@site/src/components/MDX/ChapterOverview';

In this step, you will build your catalog and decide how you want to deploy it.

Most new EventCatalog projects build as a static site. That means EventCatalog creates HTML files that you can host on most static hosting platforms.

<ChapterOverview
  items={[
    {
      icon: 'code',
      text: 'Run a production build.',
    },
    {
      icon: 'eye',
      text: 'Preview the built catalog locally.',
    },
    {
      icon: 'server',
      text: 'Choose a deployment path for your team.',
    },
  ]}
/>

### Build the catalog

Run:

```bash
npm run build
```

EventCatalog creates a production-ready build in the `dist` folder.

You can learn more in the [develop and build guide](/docs/development/getting-started/develop-and-build) and the [static build guide](/docs/development/deployment/build-and-deploy).

### Preview the build

After the build finishes, preview the built catalog locally:

```bash
npm run preview
```

This lets you check the production build before you publish it.

If the build fails, check the error in your terminal first. Common issues are broken links, invalid frontmatter, schema path mistakes, or missing files.

### Choose a deployment path

For most first catalogs, static hosting is the simplest path. You can deploy the `dist` folder to the hosting platform your team already uses.

EventCatalog also supports server-side rendering for larger catalogs or features that need a server.

Useful deployment docs:

- [Build and deploy](/docs/development/deployment/build-and-deploy)
- [Hosting options](/docs/development/deployment/hosting-options)
- [Deployment workflows](/docs/development/deployment/deployment-workflows)
- [SSR mode](/docs/development/deployment/build-ssr-mode)

### What you have now

You now know how to:

- build the catalog for production
- preview the production build locally
- choose between static hosting and server-side rendering


### Next

Continue to [Next steps](/docs/tutorial/next-steps).
