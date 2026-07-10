---
sidebar_position: 1
keywords:
- EventCatalog Federation
sidebar_label: Installation
title: Installation
description: Installation of the EventCatalog Federation plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';

<PluginLicense url="#commercial-use" />

The EventCatalog Federation plugin is designed for your [main catalog](/docs/plugins/eventcatalog-federation/configuration).

This plugin will allow you to merge multiple EventCatalog instances into a single catalog.

## Prerequisites

- [Installed EventCatalog](/docs/development/getting-started/installation)

## Installation

Run the command below to install the EventCatalog Federation plugin.

```sh
npm i @eventcatalog/generator-federation
```

## Configuration

Configure the plugin in your `eventcatalog.config.js` file.

Add the plugin to the `generators`.

```js title="eventcatalog.config.js"
// ...
generators: [
    [
      '@eventcatalog/generator-federation',
      {
        // Pulling information from a GitHub repository, (generator supports any Git source e.g GitLab, Bitbucket, etc)
        source: 'git@github.com:event-catalog/generators.git',

        // specifying the branch to pull from (default is main)
        branch: 'main',

        // optional (specify which files you want to copy from the repository)
        copy: [
          {
            // importing content from the customer-experience-team catalog
            content: 'examples/generator-federation/basic/customer-experience-team/services',
            // specify the target path in your main catalog, here we are importing the services from the customer-experience-team catalog
            destination: path.resolve(__dirname, 'services')
          },
          {
            // importing content from the customer-experience-team catalog
            content: 'examples/generator-federation/basic/customer-experience-team/teams',
            // specify the target path in your main catalog, here we are importing the services from the customer-experience-team catalog
            destination: path.resolve(__dirname, 'teams')
          },
          {
            // importing content from the customer-experience-team catalog
            content: 'examples/generator-federation/basic/customer-experience-team/users',
            // specify the target path in your main catalog, here we are importing the services from the customer-experience-team catalog
            destination: path.resolve(__dirname, 'users')
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
    // Payment Team
    // When no `copy` values are provided, the plugin will copy eventcatalog files for you.
    [
      '@eventcatalog/generator-federation',
      {
        // Pulling information from a GitHub repository
        source: 'git@github.com:event-catalog/generators.git',

        // specifying the directory of the eventcatalog in your project (default it the root directory)
        // This example clones the generators repository, and looks for the eventcatalog in the my-project-eventcatalog directory
        sourceRootDir: 'my-project-eventcatalog'

        // specifying the branch to pull from (default is main)
        branch: 'main',

        // optional, if you want to merge and override any conflicts then set to true (default is false)
        override: true,

        // optional, if you want the plugin to error 
        // if there are duplicate resources in your 
        // main catalog then set to true (default is false)
        enforceUniqueResources: true
      },
    ],
  ],
```

### Configure license key

The EventCatalog Federation plugin requires an EventCatalog Scale license key to work with EventCatalog.

You can get a trial Scale license key from [EventCatalog Cloud](https://eventcatalog.cloud).

You have a few options for setting the license key:

1. [Setting license key in `.env` file (recommended)](#setting-license-key-in-env-file-recommended)
2. [Setting license key in eventcatalog.config.js](#setting-license-key-in-eventcatalogconfigjs)

#### 1. Setting license key in `.env` file (recommended) {#setting-license-key-in-env-file-recommended}

<AddedIn version="2.35.4" />

Create a `.env` file in the root of your project and add the following:

```bash title=".env"
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key
```

:::tip Using an Older API Key?

If you already have an older Federation plugin key, you can still use it with the Federation-specific environment variable.

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_FEDERATION=your-license-key
```

:::

#### 2. Setting license key in eventcatalog.config.js {#setting-license-key-in-eventcatalogconfigjs}

If you prefer, you can set the license key in the `eventcatalog.config.js` file
using the `licenseKey` property in the EventCatalog Federation plugin.

```js title="eventcatalog.config.js"
export default {
  generators: [
    [
      '@eventcatalog/generator-federation',
      {
        licenseKey: '[INSERT_YOUR_LICENSE_KEY]', // or process.env.EVENTCATALOG_SCALE_LICENSE_KEY
      },
    ],
  ],
};
```

#### White listing EventCatalog domains

If you are behind a firewall you will need to white list the domain `https://api.eventcatalog.cloud` in your firewall. This is because the plugin needs to verify your license key.

## Run the generator

Once you have configured the plugin and license key you can run the generator.

```sh
npm run generate
```

## View your catalog

Run your catalog locally to see the changes.

```sh
npm run dev
```

## Any questions or need help?

If you get stuck, find an issue or need help, please raise an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues) or join our [Discord community](https://eventcatalog.dev/discord).


