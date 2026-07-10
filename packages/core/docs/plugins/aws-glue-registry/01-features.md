---
sidebar_position: 3
keywords:
- components
sidebar_label: Features
title: Features
description: Features of AWS Glue Schema Registry with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

### Using filters to map schemas to your services

EventCatalog plugin supports a comprehensive range of filters to give you precise control over which schemas map to your services:

- `schemaName` - Exact matching on the schema name
- `prefix` - Matches schemas that start with the specified prefix
- `suffix` - Matches schemas that end with the specified suffix
- `includes` - Matches schemas that contain the specified text (supports arrays)
- `tags` - Matches schemas with specific tag key-value pairs
- `dataFormat` - Matches schemas by format (AVRO, JSON, PROTOBUF)

You can use these filters to map schemas directly to your services, giving you flexibility on how you want to structure your EventCatalog and map events to services.

:::tip
All filters can accept either a single string value or an array of strings for multiple matching criteria.
:::

#### **schemaName example**

Match schemas by their exact name:

```js
generators: [
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryName: 'my-event-registry',
      services: [
        {
          id: 'Customer Service',
          version: '1.0.0',
          sends: [{ schemaName: ['CustomerCreated', 'CustomerUpdated'] }],
          receives: [{ schemaName: 'OrderPlaced' }]
        },
      ],
    },
  ],
],
```

#### **prefix example**

Match schemas that start with a specific prefix:

```js
generators: [
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryName: 'my-event-registry',
      services: [
        {
          id: 'Customer Service',
          version: '1.0.0',
          sends: [{ prefix: ['Customer', 'User'] }],
          receives: [{ prefix: 'Order' }]
        },
      ],
    },
  ],
],
```

#### **suffix example**

Match schemas that end with a specific suffix:

```js
generators: [
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryName: 'my-event-registry',
      services: [
        {
          id: 'Event Service',
          version: '1.0.0',
          sends: [{ suffix: ['Created', 'Updated'] }],
          receives: [{ suffix: ['Completed', 'Failed'] }]
        },
      ],
    },
  ],
],
```

#### **includes example**

Match schemas that contain specific text anywhere in the name:

```js
generators: [
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryName: 'my-event-registry',
      services: [
        {
          id: 'Analytics Service',
          version: '1.0.0',
          // Single string
          sends: [{ includes: 'analytics' }],
          // Array of strings - matches schemas containing ANY of these
          receives: [{ includes: ['customer', 'user', 'profile'] }]
        },
      ],
    },
  ],
],
```

#### **dataFormat example**

Match schemas by their data format:

```js
generators: [
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryName: 'my-event-registry',
      services: [
        {
          id: 'Streaming Service',
          version: '1.0.0',
          sends: [{ dataFormat: ['AVRO'] }],
          receives: [{ dataFormat: ['JSON', 'PROTOBUF'] }]
        },
      ],
    },
  ],
],
```

#### **tags example**

Match schemas by their AWS tags. This is particularly useful for organizing schemas by team, environment, or purpose:

```js
generators: [
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryName: 'my-event-registry',
      services: [
        {
          id: 'Customer Team Service',
          version: '1.0.0',
          // Match schemas with specific tag
          sends: [{ tags: { team: 'customer' } }],
          // Match schemas with multiple tags (ALL must match)
          receives: [{ tags: { env: 'prod', type: 'event' } }]
        },
      ],
    },
  ],
],
```

#### **Combining multiple filters**

You can combine multiple filter types in a single filter object:

```js
generators: [
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryName: 'my-event-registry',
      services: [
        {
          id: 'Advanced Service',
          version: '1.0.0',
          sends: [
            {
              prefix: 'Customer',
              dataFormat: 'AVRO',
              tags: { team: 'customer' }
            }
          ],
          receives: [
            {
              suffix: 'Event',
              includes: 'order',
              tags: { env: 'prod' }
            }
          ]
        },
      ],
    },
  ],
],
```

:::tip
When multiple filter criteria are specified in a single filter object, ALL criteria must match for a schema to be included.
:::

### Persist markdown

Your markdown is persisted between generation runs on EventCatalog. Initially the generator will generate markdown for you for your domains, services and events, but any edits to the markdown file will be persisted between versions.

This allows you to add [custom components](/docs/components/custom-components), our [MDX components](/docs/components) and customize your EventCatalog pages without losing changes when your schemas are versioned.

This can be useful for adding extra additional context to your events, example payloads, example CLI commands on how to produce/consume them and any other useful information.

### Automatic versioning

AWS Glue Schema Registry maintains version history for all schemas. The generator uses the schema version numbers from the registry to version your events in EventCatalog.

#### How it works

- You register a schema in AWS Glue Schema Registry (v1 of this schema is stored)
- You run generate for your catalog (v1 is documented in your catalog)
- You update the schema and register a new version (v2 is created in the registry)
- You run generate for your catalog (v1 is versioned for you, and v2 takes its place)

#### Compatibility modes

The generator respects the compatibility mode settings from your registry:

- **BACKWARD** - New schema version is compatible with previous version
- **FORWARD** - Previous schema version is compatible with new version  
- **FULL** - New schema version is both backward and forward compatible
- **NONE** - No compatibility checking

This information is displayed in your EventCatalog documentation.

### Downloading schemas

The generator downloads the actual schema definitions from AWS Glue Schema Registry and attaches them to each event in EventCatalog. Users will be able to see and download these files.

#### Supported formats

- **Avro schemas** (.avsc) - Complete Avro schema definitions
- **JSON schemas** (.json) - JSON Schema specifications  
- **Protocol Buffer schemas** (.proto) - Protocol Buffer definitions

#### Schema components

The generator automatically selects the appropriate EventCatalog component based on the schema format:

- **JSON schemas** use `<SchemaViewer>` for enhanced JSON display
- **Avro and Protocol Buffer schemas** use `<Schema>` for general schema display

### Cross-account registry access

The generator supports accessing registries across different AWS accounts using IAM roles and registry ARNs:

```js
generators: [
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryArn: 'arn:aws:glue:us-east-1:123456789012:registry/shared-schemas',
      services: [
        {
          id: 'Cross Account Service',
          version: '1.0.0',
          sends: [{ prefix: 'Shared' }],
        },
      ],
    },
  ],
],
```

This is useful for organizations that centralize schema management across multiple AWS accounts.
