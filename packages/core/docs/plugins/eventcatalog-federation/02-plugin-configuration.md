---
sidebar_position: 1
keywords:
- EventCatalog Federation
sidebar_label: Plugin Configuration
title: Plugin Configuration
description: Configuration of the EventCatalog Federation plugin
---

API Configuration for the EventCatalog Federation plugin



## Overview

The EventCatalog Federation plugin is configured in the `eventcatalog.config.js` file inside the `generators` array.

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `source` | string | Yes | - | Git repository URL (supports any git provider e.g GitHub, GitLab, Bitbucket) |
| `sourceRootDir` | string | No | - | The root directory for your files. For example if your repository is organized with subdirectories, you can specify the root directory to use for the import (e.g `'my-awesome-catalog'`, would be the root directory for the import). |
| `branch` | string | No | `'main'` | Branch to use for the import. Default is `'main'`. |
| `copy` | object | No | - | Copy options for the import. You can pick which files to copy from the remote repository. |
| `copy.content` | string | No | - | Content to copy to the destination. |
| `copy.destination` | string | No | - | Destination path to copy the content to. |
| `debug` | boolean | No | `false` | Enable debug mode. |
| `override` | boolean | No | `false` | Override existing files in the destination. |
| `destination` | string | No | - | Destination path to copy the content to, if you don't specify the `copy` option, the content will be copied to the root of the destination path. |
| `enforceUniqueResources` | boolean | No | `false` | Setting to true. The plugin will enforce unique resources in the destination and error if any resources are not unique. |

## Example Configuration

```js title="eventcatalog.config.js"
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  cId: "10b46030-5736-4600-8254-421c3ed56e47",
  title: "MetaRetail Inc",
  tagline: "Fake Retail Company for EventCatalog Demo",
  organizationName: "MetaRetail Inc",
  homepageLink: "https://eventcatalog.dev/",
  editUrl: "https://github.com/boyney123/eventcatalog-demo/edit/master",
  // By default set to false, add true to get urls ending in /
  trailingSlash: false,
  // Change to make the base url of the site different, by default https://{website}.com/docs,
  // changing to /company would be https://{website}.com/company/docs,
  base: "/",
  // Customize the logo, add your logo to public/ folder
  logo: {
    alt: "EventCatalog Logo",
    src: "/logo.png",
    text: "MetaRetail Inc",
  },
  docs: {
    sidebar: {
      // Should the sub heading be rendered in the docs sidebar?
      showPageHeadings: true,
    },
  },
  generators: [
    [
      '@eventcatalog/generator-federation',
      {
        // Pulling information from a GitHub repository
        source: 'git@github.com:event-catalog/generators.git',

        // specifying the branch to pull from (default is main)
        branch: 'main',

        // specify which files you want to copy from the repository
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
    [
      '@eventcatalog/generator-federation',
      {
        // Pulling information from a GitHub repository
        source: 'git@github.com:event-catalog/generators.git',

        // specifying the branch to pull from (default is main)
        branch: 'main',

        // specify which files you want to copy from the repository
        copy: [
          {
            // importing content from the payment-team catalog
            content: 'examples/generator-federation/basic/payment-team/services',
            // specify the target path in your main catalog, here we are importing the services from the payment-team catalog
            destination: path.resolve(__dirname, 'services')
          },
          {
            // importing content from the payment-team catalog
            content: 'examples/generator-federation/basic/payment-team/teams',
            // specify the target path in your main catalog, here we are importing the services from the payment-team catalog
            destination: path.resolve(__dirname, 'teams')
          },
          {
            // importing content from the payment-team catalog
            content: 'examples/generator-federation/basic/payment-team/users',
            // specify the target path in your main catalog, here we are importing the services from the payment-team catalog
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
    [
      '@eventcatalog/generator-federation',
      {
        // Pulling information from a GitHub repository
        source: 'git@github.com:event-catalog/generators.git',

        // specifying the branch to pull from (default is main)
        branch: 'main',

        // specify which files you want to copy from the repository
        copy: [
          {
            // importing content from the order-management-team catalog
            content: 'examples/generator-federation/basic/order-management-team/services',
            // specify the target path in your main catalog, here we are importing the services from the order-management-team catalog
            destination: path.resolve(__dirname, 'services')
          },
          {
            // importing content from the order-management-team catalog
            content: 'examples/generator-federation/basic/order-management-team/teams',
            // specify the target path in your main catalog, here we are importing the services from the order-management-team catalog
            destination: path.resolve(__dirname, 'teams')
          },
          {
            // importing content from the order-management-team catalog
            content: 'examples/generator-federation/basic/order-management-team/users',
            // specify the target path in your main catalog, here we are importing the services from the order-management-team catalog
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
  ],
};
```

You can view an example configuration in the [EventCatalog Federation plugin GitHub repository](https://github.com/event-catalog/generators/blob/main/examples/generator-federation/basic/central-catalog/eventcatalog.config.js).
















