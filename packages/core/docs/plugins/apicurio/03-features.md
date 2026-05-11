---
sidebar_position: 1
keywords:
- apicurio
- features
sidebar_label: Features
title: Features
description: Features of Apicurio Registry with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Schema Version Management

### Track All Schema Versions

The Apicurio Registry plugin supports comprehensive schema version management through the `includeAllVersions` configuration option.

When `includeAllVersions` is set to `true`, the plugin will:
- Import all versions of each schema from your Apicurio Registry
- Create versioned entries in EventCatalog for each schema version
- Maintain version history for your schemas
- Allow you to view and compare different versions

When `includeAllVersions` is set to `false` (default):
- Only the latest version of each schema is imported
- This is useful for keeping your catalog focused on current schemas

**Example:**

```js
{
  registryUrl: 'http://localhost:8080',
  includeAllVersions: true, // Import all versions
}
```

**Use cases for version tracking:**
- Understanding schema evolution over time
- Maintaining backwards compatibility documentation
- Tracking breaking changes in your schemas
- Compliance and audit requirements

### Adding Semantic Meaning to Schemas

Using the Apicurio Registry plugin, you can import your schemas and then add business context and semantic meaning to them.

When you import a schema into EventCatalog, an event, command, or query will be created with the schema attached. Each message has its own `index.mdx` file where you can add:
- Title and summary
- Detailed descriptions
- Business context and use cases
- Custom components and visualizations
- Ownership and team information

This gives you the opportunity to add meaning to your schemas and make them easier to understand for teams across your organization.

**Important:** When you reimport your schemas, your semantic meaning will persist between imports. The plugin will:
- Download the latest version of the schema from Apicurio Registry
- Update the schema file in EventCatalog
- Preserve your markdown documentation and business context

## Integration with OpenAPI and AsyncAPI Generators

One of the powerful features of the Apicurio Registry plugin is its ability to work with other EventCatalog generators.

You can store OpenAPI and AsyncAPI specifications in your Apicurio Registry and use them to generate comprehensive service documentation automatically.

:::info Plugin Licenses Required
The OpenAPI and AsyncAPI generators are separate licensed plugins. You'll need to obtain license keys for each plugin you want to use from [EventCatalog Cloud](https://eventcatalog.cloud). A 14-day free trial is available for both plugins.

See the [OpenAPI Plugin](/docs/plugins/openapi/intro) and [AsyncAPI Plugin](/docs/plugins/asyncapi/intro) documentation for more details on installation and configuration.
:::

### How it works

1. Store your OpenAPI/AsyncAPI specifications in Apicurio Registry
2. Configure the Apicurio plugin to attach these specifications to services
3. Specify which EventCatalog generator should process each specification
4. The plugin will fetch the specification and run the appropriate generator

### Benefits

- **Centralized Storage**: Keep all your schemas and specifications in one place (Apicurio Registry)
- **Automated Documentation**: Generate service documentation from specifications automatically
- **Consistent Workflow**: Use the same import process for schemas and specifications
- **Domain Awareness**: Specifications inherit domain configuration from the Apicurio plugin

### Example Configuration

```js
services: [{
  id: 'Orders Service',
  version: '1.0.0',
  specifications: [
    {
      type: 'openapi',
      artifactId: 'OrdersAPI-OPENAPI',
      version: 'latest',
      generator: ['@eventcatalog/generator-openapi', {
        // OpenAPI generator options
      }]
    },
    {
      type: 'asyncapi',
      artifactId: 'OrdersEvents-ASYNCAPI',
      version: '2.0.0',
      generator: ['@eventcatalog/generator-asyncapi', {
        // AsyncAPI generator options
      }]
    }
  ]
}]
```

This configuration will:
1. Fetch the OpenAPI specification from Apicurio Registry
2. Save it to the service directory
3. Run the OpenAPI generator to document REST endpoints
4. Fetch the AsyncAPI specification
5. Run the AsyncAPI generator to document async events
6. All within the context of the Orders Service and its domain

## Flexible Filtering System

The Apicurio Registry plugin provides a powerful filtering system to control which schemas are assigned to services.

### Filter Types

- **Exact Matching**: Match schemas by exact artifact ID
- **Prefix Matching**: Match schemas that start with a specific string
- **Suffix Matching**: Match schemas that end with a specific string
- **Includes Matching**: Match schemas that contain a specific string

### Use Cases

**Exact matching** is useful when you know the specific schemas a service interacts with:
```js
sends: [{ events: ['order-placed', 'order-cancelled'] }]
```

**Prefix matching** is useful for namespaced schemas:
```js
sends: [{ events: { prefix: 'order-' } }]
// Matches: order-placed, order-cancelled, order-updated, etc.
```

**Suffix matching** is useful for schema naming conventions:
```js
receives: [{ commands: { suffix: '-command' } }]
// Matches: place-order-command, cancel-order-command, etc.
```

**Includes matching** is useful for flexible pattern matching:
```js
receives: [{ events: { includes: 'inventory' } }]
// Matches: inventory-updated, check-inventory, inventory-low, etc.
```

## Message Type Classification

Document your schemas with semantic meaning by classifying them as:

- **Events**: Things that have happened (past tense) - e.g., `order-placed`, `user-registered`
- **Commands**: Requests to do something (imperative) - e.g., `place-order`, `cancel-order`
- **Queries**: Requests for information - e.g., `get-order-status`, `find-user`

This classification helps teams understand the intent and purpose of each message in your architecture.

```js
services: [{
  id: 'Orders Service',
  sends: [
    { events: ['order-placed', 'order-cancelled'] }
  ],
  receives: [
    { commands: ['place-order', 'cancel-order'] },
    { queries: ['get-order-status'] }
  ]
}]
```

## Authentication Support

<AddedIn version="0.1.0" />

The Apicurio Registry plugin supports Bearer token authentication for secured registries.

Simply set the `APICURIO_ACCESS_TOKEN` environment variable and the plugin will automatically include the Authorization header in all requests:

```bash
# .env file
APICURIO_ACCESS_TOKEN=your-access-token-here
```

The plugin handles authentication transparently - all API requests will include the Bearer token when the environment variable is set.

## Visualize Schemas, Services and Domains

When you import your schemas into EventCatalog and assign them to services, you can use the EventCatalog Visualizer to see exactly how your schemas, services and domains are connected.

The visualizer helps you:
- Understand message flow between services
- Identify dependencies and relationships
- See your domain boundaries
- Navigate your event-driven architecture visually

## Downloading Schemas

EventCatalog supports any schema format (Avro, JSON Schema, Protobuf, etc.). When you import your schemas from Apicurio Registry you can:
- View the schema directly in EventCatalog
- Download the schema for local development
- See schema metadata and version information
- Compare different versions of the same schema

## Missing a Feature?

If you are missing a feature, please let us know by opening an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues) or joining our [Discord community](https://eventcatalog.dev/discord).

## Examples

See the [eventcatalog-apicurio-example](https://github.com/event-catalog/generators/tree/main/examples/generator-apicurio) for working examples.
