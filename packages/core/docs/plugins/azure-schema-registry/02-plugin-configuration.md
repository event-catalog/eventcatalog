---
sidebar_position: 3
keywords:
- EventCatalog Azure Schema Registry plugin
sidebar_label: Plugin Configuration
title: Plugin Configuration
description: Configuration of the EventCatalog Azure Schema Registry plugin
---

# Plugin Configuration

## Overview

The EventCatalog Azure Schema Registry plugin is configured in the `eventcatalog.config.js` file inside the `generators` array.

:::info Authentication
The plugin uses Azure's REST API with Bearer token authentication. You must set the `AZURE_SCHEMA_REGISTRY_TOKEN` environment variable.

<details>
<summary>Example .env file</summary>

```bash
# EventCatalog license key
export EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key

# Azure Schema Registry access token
export AZURE_SCHEMA_REGISTRY_TOKEN=your-azure-access-token
```

Get the token using Azure CLI:
```bash
az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv
```

</details>

:::

## Required Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `schemaRegistryUrl` | `string` | Yes | The URL of your Azure Schema Registry (e.g., `https://your-namespace.servicebus.windows.net`). You can find this in the Azure Portal under your Event Hubs namespace. |
| `services` | `array` | Yes | List of services and their schema mappings. **Note:** Unlike Confluent, Azure Schema Registry doesn't provide an API to list all schemas, so you must explicitly define which schemas to fetch. |

## Optional Configuration Options

### Services

You can assign schemas to services (producers/consumers) in your architecture.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `services` | `array` | - | List of services to document with their schemas. |
| `services[].id` | `string` | - | EventCatalog ID for the service (e.g., `orders-service`). |
| `services[].name` | `string` | `services[].id` | Display name for the service (e.g., `Orders Service`). |
| `services[].version` | `string` | - | Version of the service (e.g., `1.0.0`). |
| `services[].sends` | `array` | - | Array of schema filters for messages this service sends. |
| `services[].receives` | `array` | - | Array of schema filters for messages this service receives. |
| `services[].writesTo` | `array[{id: string, version?: string}]` | - | Array of [data stores](/docs/development/guides/resources/data/introduction) id and version (optional) that the service writes to. |
| `services[].readsFrom` | `array[{id: string, version?: string}]` | - | Array of [data stores](/docs/development/guides/resources/data/introduction) id and version (optional) that the service reads from. |

### Schema Filters (sends/receives)

Each schema in `sends` and `receives` arrays can have the following properties:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | **Required** | The schema name in the Azure Schema Registry. |
| `schemaGroup` | `string` | **Required** | The schema group name in the registry. |
| `name` | `string` | `id` | Custom display name for the schema in EventCatalog. Useful for making technical schema names more user-friendly. |
| `messageType` | `'event' \| 'command' \| 'query'` | `'event'` | The type of message this schema represents. |
| `schemaRegistryUrl` | `string` | Global `schemaRegistryUrl` | Override the registry URL for this specific schema. Useful when schemas are in different Azure Schema Registries. |

### Domains

You can define and assign domains to organize your services.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain` | `object` | - | Optional domain configuration to group services. |
| `domain.id` | `string` | - | EventCatalog ID for the domain (e.g., `orders-domain`). |
| `domain.name` | `string` | - | Display name of the domain (e.g., `Orders Domain`). |
| `domain.version` | `string` | - | Version of the domain (e.g., `1.0.0`). |

### License

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `licenseKey` | `string` | From env var | EventCatalog Scale license key. Can also be set via the `EVENTCATALOG_SCALE_LICENSE_KEY` environment variable. |

## Example Configurations

### Basic Configuration

Import schemas from Azure Schema Registry and assign them to services:

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
      services: [
        {
          id: 'orders-service',
          name: 'Orders Service',
          version: '1.0.0',
          sends: [
            {
              id: 'order-created',
              schemaGroup: 'com.example.orders',
            },
          ],
          receives: [
            {
              id: 'payment-received',
              schemaGroup: 'com.example.payments',
            },
          ],
        },
      ],
    },
  ],
];
```

### Custom Schema Names

Provide user-friendly display names for your schemas:

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
      services: [
        {
          id: 'orders-service',
          version: '1.0.0',
          sends: [
            {
              id: 'app.orders.created.v1',
              schemaGroup: 'com.example.orders',
              name: 'Order Created Event', // Custom friendly name
            },
          ],
        },
      ],
    },
  ],
];
```

### Message Types (Events, Commands, Queries)

Document different message types to better represent your architecture:

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
      services: [
        {
          id: 'orders-service',
          version: '1.0.0',
          sends: [
            {
              id: 'order-created',
              schemaGroup: 'com.example.orders',
              name: 'Order Created Event',
              messageType: 'event', // Event message
            },
            {
              id: 'create-order',
              schemaGroup: 'com.example.orders',
              name: 'Create Order Command',
              messageType: 'command', // Command message
            },
          ],
          receives: [
            {
              id: 'get-order',
              schemaGroup: 'com.example.orders',
              name: 'Get Order Query',
              messageType: 'query', // Query message
            },
          ],
        },
      ],
    },
  ],
];
```

### Multiple Schema Registries

Fetch schemas from multiple Azure Schema Registries in one configuration:

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      // Default registry URL
      schemaRegistryUrl: 'https://primary-namespace.servicebus.windows.net',
      services: [
        {
          id: 'orders-service',
          version: '1.0.0',
          sends: [
            {
              id: 'order-created',
              schemaGroup: 'com.example.orders',
              // Uses default schemaRegistryUrl
            },
            {
              id: 'order-shipped',
              schemaGroup: 'com.example.shipping',
              name: 'Order Shipped Event',
              // Override to fetch from different registry
              schemaRegistryUrl: 'https://shipping-namespace.servicebus.windows.net',
            },
          ],
        },
      ],
    },
  ],
];
```

### With Domains

Organize your services into domains:

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
      domain: {
        id: 'orders-domain',
        name: 'Orders Domain',
        version: '1.0.0',
      },
      services: [
        {
          id: 'orders-service',
          name: 'Orders Service',
          version: '1.0.0',
          sends: [
            { id: 'order-created', schemaGroup: 'com.example.orders' },
          ],
        },
        {
          id: 'inventory-service',
          name: 'Inventory Service',
          version: '1.0.0',
          receives: [
            { id: 'order-created', schemaGroup: 'com.example.orders' },
          ],
        },
      ],
    },
  ],
];
```

### Multiple Domains

You can configure the plugin multiple times to document different domains:

```js title="eventcatalog.config.js"
generators: [
  // Orders Domain
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
      domain: {
        id: 'orders-domain',
        name: 'Orders Domain',
        version: '1.0.0',
      },
      services: [
        {
          id: 'orders-service',
          version: '1.0.0',
          sends: [
            { id: 'order-created', schemaGroup: 'com.example.orders' },
          ],
        },
      ],
    },
  ],
  // Payments Domain
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
      domain: {
        id: 'payments-domain',
        name: 'Payments Domain',
        version: '1.0.0',
      },
      services: [
        {
          id: 'payments-service',
          version: '1.0.0',
          sends: [
            { id: 'payment-received', schemaGroup: 'com.example.payments' },
          ],
        },
      ],
    },
  ],
];
```

## Schema Group Naming

Azure Schema Registry organizes schemas into schema groups. When configuring the plugin, make sure to use the exact schema group name as it appears in your Azure Schema Registry.

Common schema group naming patterns:
- Namespace style: `com.example.orders`, `com.example.payments`
- Application style: `myapp-orders`, `myapp-inventory`
- Environment-based: `production.orders`, `staging.orders`

You can find your schema groups in the Azure Portal under your Event Hubs namespace > Schema Registry.

## Supported Schema Formats

The plugin supports the following schema formats from Azure Schema Registry:

- **Avro** - Schemas with `.avsc` file extension
- **JSON Schema** - Schemas with `.json` file extension

The plugin automatically detects the schema format and generates the appropriate documentation in EventCatalog.

## Troubleshooting

### Authentication Issues

If you encounter authentication errors:

1. **Token not set**: Ensure `AZURE_SCHEMA_REGISTRY_TOKEN` environment variable is set
2. **Token expired**: Azure access tokens expire after 1 hour. Re-run `az account get-access-token` to get a fresh token
3. **Invalid token**: Verify you're using the correct resource (`https://eventhubs.azure.net`) when obtaining the token
4. **Permission errors**: Ensure your Azure user/service principal has "Azure Event Hubs Data Receiver" or "Azure Event Hubs Data Owner" role on the Event Hubs namespace

### Schema Not Found

If the plugin can't find a schema:

1. Verify the `schemaGroup` and `id` values match exactly what's in Azure Schema Registry
2. Check that your authenticated user/identity has read permissions on the schema registry
3. Ensure the schema exists in the specified schema group

### License Key Issues

If you have problems with your license key:

1. Ensure `https://api.eventcatalog.cloud` is not blocked by your firewall
2. Verify your license key is correctly set in the `.env` file or passed via configuration
3. Check your license hasn't expired at [EventCatalog Cloud](https://eventcatalog.cloud)

## Need Help?

- [GitHub Issues](https://github.com/event-catalog/eventcatalog/issues)
- [Discord Community](https://eventcatalog.dev/discord)
- Email: hello@eventcatalog.dev
