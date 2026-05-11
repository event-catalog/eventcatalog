---
sidebar_position: 4
keywords:
- EventCatalog Azure Schema Registry plugin features
sidebar_label: Features
title: Features
description: Features of the EventCatalog Azure Schema Registry plugin
---

# Features

The EventCatalog Azure Schema Registry plugin provides a comprehensive set of features to help you document and visualize your Azure Event Hubs architecture.

## Schema Import and Synchronization

### Import Schemas from Azure Schema Registry

The plugin connects to your Azure Schema Registry and imports schemas based on your configuration. Unlike some other registries, Azure Schema Registry requires explicit schema definitions since it doesn't provide a "list all schemas" API.

```js
{
  schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
  services: [
    {
      id: 'orders-service',
      version: '1.0.0',
      sends: [
        { id: 'order-created', schemaGroup: 'com.example.orders' },
      ],
    },
  ],
}
```

### Automatic Multi-Version Support

The plugin automatically fetches and documents **the latest 5 versions** of each schema from Azure Schema Registry. This happens automatically without any configuration needed.

**How it works:**
1. Plugin fetches up to 5 most recent versions of each configured schema
2. Latest version is written to the root directory (e.g., `/events/order-created/`)
3. Older versions are stored in versioned folders (e.g., `/events/order-created/versioned/1/`)
4. Custom documentation (markdown, badges, owners) is persisted between versions

**Example:**
If your `order-created` schema has versions 1, 2, 3, and 4:
- Version 4 (latest) → `/events/order-created/` (root)
- Version 3 → `/events/order-created/versioned/3/`
- Version 2 → `/events/order-created/versioned/2/`
- Version 1 → `/events/order-created/versioned/1/`

**Benefits:**
- Complete version history without extra configuration
- See how schemas evolved over time
- Compare different versions side-by-side
- Understand breaking vs non-breaking changes
- Teams can reference specific versions they're using

This ensures your documentation stays in sync with your schemas while preserving the semantic meaning you've added across all versions.

### Multiple Schema Formats

The plugin supports both schema formats available in Azure Schema Registry:

- **Avro** - Binary serialization format with compact data representation
- **JSON Schema** - JSON-based schema definition for flexible data structures

The plugin automatically detects the format and displays it correctly in your catalog.

## Message Type Classification

### Events, Commands, and Queries

Document your messages using different types to better represent your architecture:

```js
sends: [
  {
    id: 'order-created',
    schemaGroup: 'com.example.orders',
    messageType: 'event', // Something that happened
  },
  {
    id: 'create-order',
    schemaGroup: 'com.example.orders',
    messageType: 'command', // Request to do something
  },
],
receives: [
  {
    id: 'get-order',
    schemaGroup: 'com.example.orders',
    messageType: 'query', // Request for information
  },
]
```

**Benefits:**
- Clear architectural patterns in your documentation
- Better understanding of message flow and intent
- Improved discoverability for teams

## Custom Schema Names

### User-Friendly Display Names

Provide readable names for technical schema identifiers:

```js
{
  id: 'app.orders.created.v2.avro',
  schemaGroup: 'com.company.orders',
  name: 'Order Created Event', // User-friendly name
}
```

**Benefits:**
- Technical schema IDs preserved in the catalog
- User-friendly names for documentation
- Better search and discovery for non-technical users

## Multi-Registry Support

### Fetch from Multiple Azure Schema Registries

Override the registry URL per schema to fetch from multiple registries:

```js
{
  schemaRegistryUrl: 'https://primary-namespace.servicebus.windows.net',
  services: [
    {
      id: 'orders-service',
      version: '1.0.0',
      sends: [
        {
          id: 'order-created',
          schemaGroup: 'com.example.orders',
          // Uses default registry
        },
        {
          id: 'order-shipped',
          schemaGroup: 'com.example.shipping',
          schemaRegistryUrl: 'https://shipping-namespace.servicebus.windows.net',
          // Uses different registry
        },
      ],
    },
  ],
}
```

**Use Cases:**
- Multi-region deployments
- Separate registries for different business units
- Development/staging/production registries
- Legacy and new registry migrations

## Domain-Driven Documentation

### Organize Services into Domains

Group related services into domains for better organization:

```js
{
  domain: {
    id: 'orders-domain',
    name: 'Orders Domain',
    version: '1.0.0',
  },
  services: [
    { id: 'orders-service', version: '1.0.0', /* ... */ },
    { id: 'inventory-service', version: '1.0.0', /* ... */ },
  ],
}
```

**Benefits:**
- Logical grouping of related services
- Better navigation for large architectures
- Align with domain-driven design principles
- Visualize domain boundaries

## Flexible Authentication

### REST API with Bearer Token

The plugin uses Azure's REST API with Bearer token authentication for maximum compatibility and flexibility.

#### Getting an Access Token

**For Local Development:**
```bash
export AZURE_SCHEMA_REGISTRY_TOKEN=$(az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv)
```

**For CI/CD:**
```bash
# Using service principal
export AZURE_SCHEMA_REGISTRY_TOKEN=$(az login --service-principal \
  --username $AZURE_CLIENT_ID \
  --password $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID && \
  az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv)
```

**Benefits:**
- Works across all environments
- No Azure SDK packages required
- Simple Bearer token authentication
- Easy to integrate with CI/CD pipelines
- Compatible with any Azure authentication method

:::tip Token Expiration
Azure access tokens typically expire after 1 hour. For long-running processes, you may need to refresh the token periodically.
:::

## Metadata Persistence

### Preserve Custom Documentation

When schemas are versioned, the plugin preserves:

- **Custom markdown** - Your detailed documentation
- **Badges** - Visual indicators and labels
- **Owners** - Team and individual assignments
- **Attachments** - Related files and links
- **Repository links** - Source code references

**Example:**

```markdown
# Order Created Event

This event is emitted when a new order is successfully placed in the system.

## Business Rules
- Only emitted after payment is confirmed
- Includes customer and line item details
- Triggers inventory reservation

## Related Documentation
- [Order Processing Guide](link)
- [Payment Integration](link)
```

This markdown persists when the schema is updated to version 2, 3, etc.

## Service Documentation

### Document Producers and Consumers

Clearly define which services send and receive which messages:

```js
{
  id: 'orders-service',
  version: '1.0.0',
  sends: [
    { id: 'order-created', schemaGroup: 'com.example.orders' },
  ],
  receives: [
    { id: 'payment-received', schemaGroup: 'com.example.payments' },
  ],
}
```

**In EventCatalog, you can see:**
- All messages a service produces
- All messages a service consumes
- Service dependencies
- Message flow visualization

## Search and Discovery

### Find Schemas Easily

EventCatalog provides powerful search capabilities:

- Search by schema name
- Filter by domain
- Filter by service
- Filter by message type (event/command/query)
- Full-text search across documentation

## Versioning and History

### Track Schema Evolution

The plugin automatically imports the **latest 5 versions** of each schema, giving you complete visibility into schema evolution:

**Features:**
- **Automatic version import** - No configuration needed, fetches latest 5 versions
- **Version timeline** - See all versions of each schema
- **Side-by-side comparison** - Compare versions to understand changes
- **Latest in root** - Current version easily accessible, older versions organized in versioned folders
- **Breaking change detection** - Understand impact of schema changes
- **Version-specific references** - Teams can reference the exact version they're using

**Example Structure:**
```
/events/order-created/           ← Latest version (v4)
/events/order-created/versioned/1/  ← Older version
/events/order-created/versioned/2/  ← Older version
/events/order-created/versioned/3/  ← Older version
```

This comprehensive versioning support helps teams understand how schemas have evolved and make informed decisions about upgrades.

## Data Store Integration

### Document Data Dependencies

Link services to their data stores:

```js
{
  id: 'orders-service',
  version: '1.0.0',
  writesTo: [
    { id: 'orders-database', version: '1.0.0' },
  ],
  readsFrom: [
    { id: 'customer-cache', version: '1.0.0' },
  ],
}
```

## Configuration Validation

### Catch Errors Early

The plugin validates your configuration and provides helpful error messages:

- Missing required fields
- Invalid schema group references
- Authentication issues
- Registry connectivity problems

## Need a Feature?

Have a feature request? Let us know:

- [GitHub Discussions](https://github.com/event-catalog/eventcatalog/discussions)
- [Discord Community](https://eventcatalog.dev/discord)
- Email: hello@eventcatalog.dev
