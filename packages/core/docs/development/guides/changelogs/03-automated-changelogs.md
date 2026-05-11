---
sidebar_position: 2
keywords:
- EventCatalog diffs
sidebar_label: Automated diffs
title: Automated diffs
description: Understanding how EventCatalog automates diffs for your files
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.7.3"/>

EventCatalog allows you to store schemas, API specifications and custom files along side your domains, services and messages. For [example you can add specifications to a service](/docs/development/guides/services/adding-to-services/openapi).

When you version your resources, you can also version the files. When you do this, EventCatalog will match the current version to it's previous version and calculate if any diffs should be displayed in your changelog page.

**Features**

- Automated diffs for your OpenAPI and AsyncAPI files
- Automated diffs for your schemas (any format)

:::info
Automated diffs only work with `.json`, `.avro`, `.yml` and `.yaml` files at the moment. If you would like to support more files please raise an issue on GitHub.
:::

### How it works

Let's say we have a service called Orders, this service has an OpenAPI file.
- `/services/Orders/index.mdx`
- `/services/Orders/openapi.yml`
- `/services/Orders/changelog.mdx`

Let's now version this service, by added the `versioned` folder.

- `/services/Orders/versioned/0.0.1/index.mdx`
- `/services/Orders/versioned/0.0.1/openapi.yml`
- `/services/Orders/versioned/0.0.1/changelog.mdx`

If any changes have been made to the `openapi.yml` file in this example, this changes will be shown in the service changelog page.

![Automated logs](./img/automated-logs.png)

[You can see the example in our demo](https://demo.eventcatalog.dev/docs/services/OrdersService/0.0.3/changelog).