---
sidebar_position: 5
keywords:
- EventCatalog Azure Schema Registry plugin examples
sidebar_label: Examples
title: Examples
description: Examples of the EventCatalog Azure Schema Registry plugin
---

# Examples

Explore real-world examples of using the Azure Schema Registry plugin with EventCatalog.

## GitHub Examples Repository

All examples are available in the EventCatalog generators repository:

[View Azure Schema Registry Examples on GitHub](https://github.com/event-catalog/generators/tree/main/examples/generator-azure-schema-registry)

## Available Examples

### Basic Example

**Get started quickly with a simple setup**

This example demonstrates:
- Connecting to Azure Schema Registry
- Importing schemas from schema groups
- Assigning schemas to services
- Basic configuration setup

[View Basic Example](https://github.com/event-catalog/generators/tree/main/examples/generator-azure-schema-registry/basic) (Coming Soon)

### Message Types Example

**Document events, commands, and queries**

This example demonstrates:
- Mapping schemas to different message types
- Events for things that happened
- Commands for requests to do something
- Queries for requests for information
- Clear architectural patterns

[View Message Types Example](https://github.com/event-catalog/generators/tree/main/examples/generator-azure-schema-registry/message-types) (Coming Soon)

### Multiple Registries Example

**Fetch schemas from multiple Azure Schema Registries**

This example demonstrates:
- Default registry URL configuration
- Per-schema registry URL overrides
- Multi-region deployment patterns
- Separate registries for different business units

[View Multiple Registries Example](https://github.com/event-catalog/generators/tree/main/examples/generator-azure-schema-registry/multiple-registries) (Coming Soon)

### Domain-Driven Design Example

**Organize services into domains**

This example demonstrates:
- Domain configuration
- Grouping related services
- Domain visualization
- Cross-domain dependencies

[View Domain-Driven Design Example](https://github.com/event-catalog/generators/tree/main/examples/generator-azure-schema-registry/domains) (Coming Soon)

### Custom Schema Names Example

**User-friendly schema names**

This example demonstrates:
- Using technical schema IDs
- Providing user-friendly display names
- Better discoverability for non-technical users

[View Custom Names Example](https://github.com/event-catalog/generators/tree/main/examples/generator-azure-schema-registry/custom-names) (Coming Soon)

### Service Authentication Example

**Different authentication methods**

This example demonstrates:
- Azure CLI authentication (local dev)
- Service Principal authentication (CI/CD)
- Managed Identity authentication (Azure-hosted)
- Environment-specific configurations

[View Authentication Example](https://github.com/event-catalog/generators/tree/main/examples/generator-azure-schema-registry/authentication) (Coming Soon)

## Running the Examples

Each example includes:

1. **README.md** - Detailed instructions for running the example
2. **eventcatalog.config.js** - Complete configuration
3. **.env.example** - Template for environment variables
4. **Sample data** - Mock schemas and configurations for testing

### Prerequisites

- Node.js 18 or higher
- Azure CLI installed ([Install guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- Azure account with Event Hubs namespace
- Azure Schema Registry with sample schemas
- EventCatalog license key ([14-day trial available](https://eventcatalog.cloud))
- Appropriate Azure permissions (`Azure Event Hubs Data Receiver` role)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/event-catalog/generators.git

# Navigate to an example
cd generators/examples/generator-azure-schema-registry/basic

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your EventCatalog license key

# Authenticate with Azure
az login

# Get Azure access token and set it as environment variable
export AZURE_SCHEMA_REGISTRY_TOKEN=$(az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv)

# Verify token is set
echo $AZURE_SCHEMA_REGISTRY_TOKEN

# Run the generator
npm run generate

# Start the catalog
npm run dev
```

:::tip One-Line Command
You can also set the token and run the generator in one command:
```bash
AZURE_SCHEMA_REGISTRY_TOKEN=$(az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv) npm run generate
```
:::

:::warning Token Expiration
Azure access tokens expire after 1 hour. If you get authentication errors, refresh your token by running the `export AZURE_SCHEMA_REGISTRY_TOKEN=...` command again.
:::

## Example Patterns

### Pattern 1: Single Service, Multiple Messages

```js
{
  schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
  services: [
    {
      id: 'orders-service',
      version: '1.0.0',
      sends: [
        { id: 'order-created', schemaGroup: 'com.example.orders' },
        { id: 'order-updated', schemaGroup: 'com.example.orders' },
        { id: 'order-cancelled', schemaGroup: 'com.example.orders' },
      ],
    },
  ],
}
```

**Use Case**: Document a single service that produces multiple related events.

### Pattern 2: Multiple Services, Shared Messages

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
    {
      id: 'inventory-service',
      version: '1.0.0',
      receives: [
        { id: 'order-created', schemaGroup: 'com.example.orders' },
      ],
    },
    {
      id: 'notifications-service',
      version: '1.0.0',
      receives: [
        { id: 'order-created', schemaGroup: 'com.example.orders' },
      ],
    },
  ],
}
```

**Use Case**: Document multiple services that consume the same event.

### Pattern 3: Command-Query Separation

```js
{
  schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
  services: [
    {
      id: 'orders-api',
      version: '1.0.0',
      sends: [
        { id: 'create-order', schemaGroup: 'com.example.orders', messageType: 'command' },
        { id: 'update-order', schemaGroup: 'com.example.orders', messageType: 'command' },
      ],
      receives: [
        { id: 'get-order', schemaGroup: 'com.example.orders', messageType: 'query' },
        { id: 'list-orders', schemaGroup: 'com.example.orders', messageType: 'query' },
      ],
    },
    {
      id: 'orders-processor',
      version: '1.0.0',
      receives: [
        { id: 'create-order', schemaGroup: 'com.example.orders', messageType: 'command' },
        { id: 'update-order', schemaGroup: 'com.example.orders', messageType: 'command' },
      ],
      sends: [
        { id: 'order-created', schemaGroup: 'com.example.orders', messageType: 'event' },
        { id: 'order-updated', schemaGroup: 'com.example.orders', messageType: 'event' },
      ],
    },
  ],
}
```

**Use Case**: Implement CQRS pattern with clear separation of commands and queries.

### Pattern 4: Multi-Domain Architecture

```js
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
        { id: 'orders-service', version: '1.0.0', /* ... */ },
        { id: 'inventory-service', version: '1.0.0', /* ... */ },
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
        { id: 'payments-service', version: '1.0.0', /* ... */ },
      ],
    },
  ],
];
```

**Use Case**: Organize large architectures into bounded contexts.

### Pattern 5: Multi-Region with Registry Overrides

```js
{
  schemaRegistryUrl: 'https://us-east-namespace.servicebus.windows.net',
  services: [
    {
      id: 'global-orders-service',
      version: '1.0.0',
      sends: [
        {
          id: 'order-created',
          schemaGroup: 'com.example.orders',
          // US East registry
        },
        {
          id: 'order-created-eu',
          schemaGroup: 'com.example.orders',
          schemaRegistryUrl: 'https://eu-west-namespace.servicebus.windows.net',
          // EU West registry
        },
      ],
    },
  ],
}
```

**Use Case**: Document multi-region deployments with separate registries.

## Testing Locally

### Using Docker Compose for Local Testing

While Azure Schema Registry requires an Azure account, you can test the plugin configuration locally using mock data:

```bash
# In the example directory
npm run generate:mock  # Uses mock schemas for testing

npm run dev  # View the catalog locally
```

### With Azure Dev/Test Environment

For testing with real Azure Schema Registry:

```bash
# Step 1: Create a development schema registry (one-time setup)
az eventhubs namespace create \
  --name your-dev-namespace \
  --resource-group your-resource-group \
  --location eastus \
  --sku Standard

# Step 2: Register test schemas
az eventhubs eventhub schema-registry create \
  --namespace-name your-dev-namespace \
  --resource-group your-resource-group \
  --name com.example.test

# Step 3: Get access token
export AZURE_SCHEMA_REGISTRY_TOKEN=$(az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv)

# Step 4: Run the generator
npm run generate

# Step 5: View the catalog
npm run dev
```

:::info Azure Resource Setup
Make sure you have the appropriate permissions on the Azure resources. You need at least the `Azure Event Hubs Data Receiver` role on the Event Hubs namespace.
:::

## Contributing Examples

Have a great example you'd like to share? We'd love to include it!

1. Fork the [generators repository](https://github.com/event-catalog/generators)
2. Create your example in `examples/generator-azure-schema-registry/`
3. Include a detailed README
4. Submit a pull request

## Need Help?

Can't find an example for your use case?

- [Ask in Discord](https://eventcatalog.dev/discord)
- [Open a GitHub Discussion](https://github.com/event-catalog/eventcatalog/discussions)
- Email: hello@eventcatalog.dev

We're here to help you get the most out of EventCatalog!
