---
keywords:
- EventCatalog components
sidebar_label: Configuring main catalog
title: Setup main catalog
description: Configuring federation in your EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';

<!-- <Beta /> -->
<AddedIn version="2.18.0" />
<PluginLicense url="/docs/development/guides/custom-components%20copy/introduction#commercial-use" />

EventCatalog Federation is powered by the [EventCatalog Federation Generator](https://github.com/event-catalog/generators), this let's you define the repositories you want to merge into your main catalog.

### Getting started

If you haven't already, you will need to create a new EventCatalog instance that will be your main catalog, this will be the one you will use to generate your documentation and host your documentation for your users.

You can create a new empty EventCatalog instance using the `eventcatalog` CLI.

```bash
npx @eventcatalog/create-eventcatalog@latest main-catalog --empty
```

Next you will need to install the `federation` generator (in your main catalog).

```bash
npm install @eventcatalog/generator-federation
```

#### Configuring the federation generator

You need to configure the federation generator in your main catalog, this is done by adding the generator to the `generators` section of your `eventcatalog.config.js` file.

Using the federation generator you need to specify:

- The source repository to pull from (your teams catalogs)
- The branch to pull from (default is `main`)
- The files to copy from the source repository to your main catalog 
- If you want to override any conflicts (`last-write-wins`)
- If you want the plugin to error if there are duplicate resources in your main catalog

Here is an example of how you can configure the federation generator.
 This demo shows:

- Pulling information from a GitHub repository
- Pulling information from a GitLab repository
- Copying files from the source repository to your main catalog
- Overriding any conflicts (`last-write-wins`)
- Enforcing unique resources in your main catalog

```js
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  cId: 'fe4efb73-11db-4bea-ad2b-d7e1d424a0c1',
  title: 'OurLogix',
  tagline: 'A comprehensive logistics and shipping management company',
  organizationName: 'OurLogix',
  homepageLink: 'https://eventcatalog.dev/',
  landingPage: '',
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
  trailingSlash: false,
  base: '/',
  logo: {
    alt: 'EventCatalog Logo',
    src: '/logo.png',
    text: 'OurLogix',
  },
  docs: {
    sidebar: {
      showPageHeadings: true,
    },
  },
  // Add the federation generator to your main catalog
  generators: [
    [
      '@eventcatalog/generator-federation',
      {
        // Pulling information from a GitHub repository (this would be your teams catalogs)
        source: 'git@github.com:event-catalog/eventcatalog.git',

        // specifying the branch to pull from (default is main)
        branch: 'main',

        // specify which files you want to copy from the repository 
        copy: [
          { 
            // specify the path in the external catalog
            content: 'examples/default/components',

            // specify the target path in your main catalog
            destination: path.resolve(__dirname, 'components')
          },
          { 
            // specify the path in the external catalog
            content: 'examples/default/domains/Orders/services',

            // specify the target path in your main catalog
            destination: path.resolve(__dirname, 'services')
          },
          {
            // specify the path in the external catalog
            content: 'examples/default/teams',

            // specify the target path in your main catalog
            destination: path.resolve(__dirname, 'teams')
          },
          {
            // specify the path in the external catalog
            content: 'examples/default/domains/Payment/services',

            // specify the target path in your main catalog
            destination: path.resolve(__dirname, 'services')
          }
        ],

        // optional, if you want to merge and override any conflicts then set to true (default is false)
        override: true,

        // optional, if you want the plugin to error 
        // if there are duplicate resources in your 
        // main catalog then set to true (default is false)
        enforceUniqueResources: true
      },
    ],
    [
      // This example does not specify the files to copy, the plugin will find all the files in the repository and copy them to your main catalog
      '@eventcatalog/generator-federation',
      {
        // Pulling information from a GitLab repository, it will check for events, queries, domains, services, teams, etc
        // Any matching files will be copied to your main catalog
        source: 'git@gitlab.com:boyneyy123/eventcatalog-gitlab-example.git',
        branch: 'main',
        destination: path.resolve(__dirname),
        override: true,
        enforceUniqueResources: true
      },
    ],
  ],
};

```

Generator options:

- `source` - The source repository to pull from (required)
- `branch` - The branch to pull from (default is `main`)
- `copy` - The files to copy from the source repository to your main catalog (optional, if not specified the plugin will find all the files in the repository and copy them to your main catalog)
- `override` - If you want to override any conflicts (`last-write-wins`) (default is `false`)
- `enforceUniqueResources` - If you want the plugin to error if there are duplicate resources in your main catalog (default is `false`). 

If you want to learn more about the federation generator you can read the [EventCatalog Federation Generator documentation](https://github.com/event-catalog/generators).

### Running the generator

You will need a license key to run the generator, you can get a free 14 day trial license key from [EventCatalog Cloud](https://eventcatalog.cloud).

Once you have configured the federation generator you can run the generator.

Inside your main catalog run the following command:

```bash
npm run generate
```

This will generate the resources from the source repositories and copy them to your main catalog and handle any conflicts if you have configured the generator to do so.

:::tip Combining multiple generators
EventCatalog offers other plugins including [AsyncAPI](/docs/plugins/asyncapi/intro) and [OpenAPI](/docs/plugins/openapi/intro) plugins. You can combine generators to pull information from multiple sources and generate your documentation.
:::

### Authentication

The federation generator uses `git` under the hood, so you will need to ensure you have the correct authentication setup for your git provider on the machine you are running the generator on.

### View demo

You can view and run a demo of the federation generator on GitHub.

- [View demo](https://github.com/event-catalog/generators/tree/main/examples/generator-federation/basic)

### Need help or got a question?

If you need help or got a question, please [create an issue](https://github.com/event-catalog/eventcatalog/issues/new) or [join the community on Discord](https://eventcatalog.dev/discord).
