---
sidebar_position: 1
id: plugin-doc-generator-amazon-eventbridge
title: '📦 plugin-generator-amazon-eventbridge'
slug: '/api/plugins/@eventcatalog/plugin-doc-generator-amazon-eventbridge'
---

EventCatalog allows you to document your Event Driven Architecture powered by markdown files.

This plugin allows you to generate an EventCatalog from your Amazon EventBridge integration.

This plugin will generate **Event** documents based on your EventBridge Schemas, Rules, Targets and Registry.

- [View Installation and Usage](/docs/api/plugins/@eventcatalog/plugin-doc-generator-amazon-eventbridge#installation-and-usage)

## Plugin Features

- 📄 Automatic documentation with versioning
- 👨‍⚕️ Add owners (people/teams) to your events
- 📊 Visualise Targets and Rules for Each Event
- 🌎 Quick access to AWS Console within each Event
- 🗄 JSONDraft4 and OpenAPI Schemas
- 💅 Customise and add content to each event (capture information, and details)
- ⚡️ Powered by markdown, setup in seconds.


### EventCatalog with EventBridge Schema (example)
![example](/img/api/plugins/amazon-eventbridge/example.jpeg)


## How the plugin works

The plugin will use `aws-sdk` to connect to your EventBridge event bus and schema registry. It then transforms this information into documents for EventCatalog.

![architecture](/img/api/plugins/amazon-eventbridge/plugin-architecture.png)

### Documenting your Schemas

EventCatalog is powered by Markdown files. This plugin will pull down your events and transform them into documentation for you. You can then enhance that documentation with whatever information you want whilst continuing to generate the event documentation.

### Event Versioning

EventBridge schema registry provides automatic versioning for your event schemas (detects changes). This EventCatalog plugin will read the versions of your schemas and automatically version your events for you. 

### Schemas

EventCatalog will provide JSONDraft4 and OpenAPI versions of your EventBridge schemas.

### Targets and Rules

EventCatalog will inspect your event's targets and rules and try to show diagrams that represent the flow of your event with the filters (rules).

### Adding Owners to Events

EventCatalog allows you to add [owners](/docs/events/adding-event-owners) to your events. This allows you to add teams or users as owners of your EventBridge Schemas.


## Installation and Usage {#installation-and-usage}

If you haven't already you will need to create a new catalog.

```bash npm2yarn
npx @eventcatalog/create-eventcatalog@latest my-catalog
```

:::note
Your Catalog will come with a bunch of services and events out the box. Feel free to delete these.
:::

Next we have to install the `@eventcatalog/plugin-doc-generator-amazon-eventbridge` plugin.

```bash npm2yarn
npm install --save @eventcatalog/plugin-doc-generator-amazon-eventbridge
```

Now we have to configure our plugin in the `eventcatalog.config.js` file.

```js title="eventcatalog.config.js"

const path = require('path');

module.exports = {
  //...
  generators: [
    [
      '@eventcatalog/plugin-doc-generator-amazon-eventbridge',
      {
        eventBusName: 'boyne-test-bus', // your event bus name
        region: 'us-west-1', // your region
        registryName: 'discovered-schemas', // your registry normally "discovered-schemas"
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN // optional
        },
      },
    ],
  ],
  //...
};
```
### Generating your documents

Once you have setup the plugin you will need to run

```
npm run generate
```

This command will run through your plugin and generate your EventCatalog documentation.


## Plugin Configuration 

<APITable>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `eventBusName` | `string` | `` | Name of your EventBus |
| `region` | `string` | `` | AWS Region of your eventbus |
| `registryName` | `string` | `` | Name of your Schema Registry |
| `credentials` | `AWSCredentials`- [View Schema](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Credentials.html) | `` | AWS `accessKeyId` and `secretAccessKey` |
| `schemaTypeToRenderToEvent` | `string` (`JSONSchemaDraft4`/`OpenAPI`) | `JSONSchemaDraft4` | Schema type to render along side your event in EventCatalog |
| `versionEvents` | `boolean` | `true` | Version your events as new versions get detected from your Schema Registry |

</APITable>

## AWS Configuration

### Policy for AWS

This plugin will require some read access to your Amazon EventBridge Bus, Schema Registry and Versions. 

It's recommended you create a new IAM user with the following policy.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "EventCatalog",
            "Effect": "Allow",
            "Action": [
                "events:DescribeRule",
                "events:DescribeEventBus",
                "events:DescribeEventSource",
                "events:ListRuleNamesByTarget",
                "events:ListRules",
                "events:ListTargetsByRule",
                "schemas:ExportSchema",
                "schemas:SearchSchemas",
                "schemas:ListSchemas",
                "schemas:ListSchemaVersions",
                "schemas:DescribeSchema",
                "schemas:GetDiscoveredSchema"
            ],
            "Resource": "*"
        }
    ]
}
```

### Turning on Schema Discovery in AWS

To get the most out of this plugin you will need to provide the plugin with the **`registryName`**.

You will need to turn on [**`schema discovery`**](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema.html) for your EventBridge Bus.

## FAQ

### Is the EventCatalog EventCatalog documentation manual?

EventCatalog uses markdown to generate your EDA documentation. This can be done manually, through plugins or a mixture of both.

With EventCatalog it's key goal is to make documentation easy to maintain, that means you can generate from any third party source using plugins but also manually make changes at the same time.

Any changes to your events markdown content will be persisted across generation, but event metadata will be updated with the latest information (from generation).

_TL;DR - EventCatalog allows you to generate from sources and also keep your manual changes._

