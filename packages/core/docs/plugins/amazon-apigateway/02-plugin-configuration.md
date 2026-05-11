---
sidebar_position: 1
keywords:
- Amazon API Gateway
sidebar_label: Plugin Configuration
title: Plugin Configuration
description: Configuration of the Amazon API Gateway plugin
---

This plugin requires a license key. You can get a 14 day free trial license key by signing up to [EventCatalog Cloud](https://eventcatalog.dev/cloud).

Once you have your license key you can set the `EVENTCATALOG_LICENSE_KEY_AMAZON_APIGATEWAY` environment variable.

## Overview

The Amazon API Gateway plugin is configured in the `eventcatalog.config.js` file inside the `generators` array.

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `output` | string | No | `amazon-apigateway-specs` | The output directory for the OpenAPI specifications (used by the OpenAPI Generator plugin) |
| `credentials` | [AwsCredentialIdentity](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-smithy-types/Interface/AwsCredentialIdentity/) | No | - | AWS credentials to use for the import on AWS. If this is not provided it will default to the credentials on the machine. |
| `licenseKey` | string | No | - | You can either pass the license key directly or set the `EVENTCATALOG_LICENSE_KEY_AMAZON_APIGATEWAY` environment variable. |
| `apis` | API[] | Yes | - | Array of API configurations |

## API Configuration

The `apis` option is an array of API configurations. Each API configuration has the following options:

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `name` | string | Yes | - | Name of the API in AWS |
| `region` | string | Yes | - | AWS region of the API |
| `stageName` | string | Yes | - | Stage name of the API |
| `version` | number | No | 1 | Version of the API. Amazon API Gateway versions using dates. EventCatalog needs to use semver as versions. It will default to `1` but you can specify a different version. |
| `routes` | Route | No | - | Map your routes into EventCatalog information. For example map your routes into commands, queries, events, etc. |

## Route Configuration

The `routes` option is a map of routes. Each route has the following options:

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `type` | string | Yes | - | Type of the route. Can be `command`, `query`, or `event`. |
| `id` | string | No | - | EventCatalog ID, if you want to override it. |
| `name` | string | No | - | Give the message (route) a name in EventCatalog |
| `description` | string | No | - | Define a description for the message |

## Example Configuration

```js title="eventcatalog.config.js"
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  cId: "10b46030-5736-4600-8254-421c3ed56e47",
  title: "EventCatalog",
  tagline: "Discover, Explore and Document your Event Driven Architectures",
  organizationName: "Your Company",
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
    text: "EventCatalog",
  },
  docs: {
    sidebar: {
      // Should the sub heading be rendered in the docs sidebar?
      showPageHeadings: true,
    },
  },
  generators: [
    [
      "@eventcatalog/generator-amazon-apigateway",
      {
        output: 'amazon-api-gateway-output',
        apis: [
          {
            // The name of the API we want to process
            name: 'EcommerceApi',
            // Assume it's deployed to us-east-1, change this if you deployed somewhere else
            region: 'us-east-1',
            // The API stage name
            stageName: 'prod',
            version: '2',
            // Optional routes, we can map routes to message types
            // give them descriptions and unique ids in eventcatalog
            routes: {
              'post /cart/checkout': {
                type: 'command',
                id: 'CheckoutCart',
                description: 'Request to checkout the cart',
              },
              'post /cart/clear': {
                type: 'command',
                id: 'ClearCart',
                description: 'Request to clear the cart',
              },
            }
          }
        ]
      },
    ],
    // This will process the output of the amazon api gateway generator
    // it will process the OpenAPI file and map it into a service and domain
    // All routes are mapped to messages.
    [
      "@eventcatalog/generator-openapi",
      {
        services: [
          { path: path.join(__dirname, "amazon-api-gateway-output", "EcommerceApi.json"), id: 'ecommerce-api', owners: ['full-stack'] },
        ]
      },
    ],
  ],
};
```

You can view an example configuration in the  [EventCatalog Amazon API Gateway plugin GitHub repository](https://github.com/event-catalog/generators/blob/main/examples/generator-amazon-apigateway/basic/eventcatalog.config.js).






