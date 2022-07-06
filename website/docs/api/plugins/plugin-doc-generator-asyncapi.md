---
sidebar_position: 1
id: plugin-doc-generator-asyncapi
title: '📦 plugin-generator-asyncapi'
slug: '/api/plugins/@eventcatalog/plugin-doc-generator-asyncapi'
---

EventCatalog plugin to generate a catalog from your **AsyncAPI** files.

This plugin will generate **Service** and **Event** documents based on your AsyncAPI file. 

:::note

Once setup run `npm run generate` within your project.

:::

## How it works

The plugin will parse your AsyncAPI file looking for events and services and use this information for your catalog.

### What if I already have events and services?

The plugin will check to see if the service or event already exists. If `true` then the events will be versioned (based on your config) and services will be overriden (until service version is working).

If you already have configured **markdown** in your events or services, this markdown will be reused in your new generation. This means the content (documentation) of your events and services will be kept the same, but the metadata (frontmatter) will be updated (version, naming, summarys, links etc).

### How is this plugin useful?

You may be a team that likes to be spec driven, so you can keep your spec up to date and continue to work on it and just run `npm run generate` in the catalog to have the features from `EventCatalog`.

You can use `EventCatalog` with `AsyncAPI` specs to enhance your documentation and use all the features of EventCatalog (3D node graphs, Diagrams, Documentation and much more...).

## Installation {#installation}

```bash npm2yarn
npm install --save @eventcatalog/plugin-doc-generator-asyncapi
```

## Configuration 

<APITable>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `pathToSpec` | `string` or `string[]` | `'/asyncapi.yml'` | Path or Paths to AsyncAPI documents. |
| `versionEvents` | `boolean` | `true` | When the plugin runs and it finds matching events in the catalog, it will version the events before creating the new documentation. |
| `externalAsyncAPIUrl` | `string` | `` | When a AsyncAPI base url is set the, a external link to the AsyncAPI message documentation will be added to each event. |
| `renderMermaidDiagram` | `boolean` | true | When set to true it will render the [Mermaid](/docs/components/overview#mermaid-) diagrams to matched events from AsyncAPI file. |
| `renderNodeGraph` | `boolean` | false | When set to true is will render the [NodeGraph](/docs/components/overview#nodegraph-) diagram to the matched events from the AsyncAPI file. |
| `domainName` | `string` | `` | The name of the [Domain](/docs/domains/adding-domain) into which to place the events and services parsed from the AsyncAPI document(s). |
| `domainSummary` | `string` | `` | Summary description of the domain. |

In the case

</APITable>

## Example Configuration {#configuration}

### Plugin Options

You will need to add the plugin into the `generators` part of the `eventcatalog.config.js` file.

```js title="eventcatalog.config.js"

const path = require('path');

module.exports = {
   generators: [
    [
      '@eventcatalog/plugin-doc-generator-asyncapi',
      {
        // path to your AsyncAPI files
        pathToSpec: [path.join(__dirname, 'asyncapi.yml')],

        // version events if already in catalog (optional)
        versionEvents: true
      },
    ],
  ],
};
```

This will read the `asyncapi.yml` file in the root of your project. You can provide whatever path you wish.

### What if I want to parse AsyncAPI files into different domains?

If you want to specify several different domains into which different sets of AsyncAPI files should be parsed then you should use multiple AsyncAPI plugin instances in the `generators` array where each generator listed with a `domainName` will map to a unique domain into which the AsyncAPI file listed under the `pathToSpec` property will be parsed.

```js title="eventcatalog.config.js"

const path = require('path');

module.exports = {
   generators: [
    // first generator pushes parsed files into the Orders domain
    [
      '@eventcatalog/plugin-doc-generator-asyncapi',
      {
        // path to your AsyncAPI files
        pathToSpec: [path.join(__dirname, 'asyncapi-order-created.yml')],

        // version events if already in catalog (optional)
        versionEvents: true,
        domainName: 'Orders'
      },
    ],
    // second generator pushes parsed files in the Payments domain
    [
      '@eventcatalog/plugin-doc-generator-asyncapi',
      {
        // path to your AsyncAPI files
        pathToSpec: [path.join(__dirname, 'asyncapi-payments-processed.yml')],

        // version events if already in catalog (optional)
        versionEvents: true,
        domainName: 'Payments'
      },
    ],
  ],
};
```