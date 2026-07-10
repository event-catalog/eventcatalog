---
sidebar_position: 2
keywords:
- EventCatalog Azure Schema Registry
sidebar_label: Installation
title: Installation
description: Installation of the EventCatalog Azure Schema Registry plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PluginLicense url="#commercial-use" />

Run the command below to install the EventCatalog Azure Schema Registry plugin.

:::tip "Don't have an EventCatalog project yet?"
If you don't have an EventCatalog project yet, you can follow the instructions in the [Getting Started](/docs/development/getting-started/installation) guide.
:::

```bash
npm i @eventcatalog/generator-azure-schema-registry
```

:::info License Key
The EventCatalog Azure Schema Registry plugin requires an EventCatalog Scale license key to work with EventCatalog.

You can get a trial Scale license key from [EventCatalog Cloud](https://eventcatalog.cloud).
:::

## Configuration

To use the plugin you need to configure it in your `eventcatalog.config.js` file.

Add the plugin to the `generators` array.

<Tabs>
  <TabItem value="basic" label="Basic Example" default>

  In this example we import schemas from an Azure Schema Registry and assign them to a service.

  **Note**: Unlike Confluent, Azure Schema Registry doesn't provide an API to list all schemas, so you must explicitly define which schemas to fetch using schema groups and names.

    ```js title="eventcatalog.config.js"
    // ...
    generators: [
      [
        '@eventcatalog/generator-azure-schema-registry',
        {
          // The URL of your Azure Schema Registry
          schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
          // Define services and the schemas they use
          services: [
            {
              id: 'orders-service',
              name: 'Orders Service',
              version: '1.0.0',
              // The orders service sends the order-created event
              sends: [
                {
                  id: 'order-created',
                  schemaGroup: 'com.example.orders'
                },
              ],
              // The orders service receives the payment-received event
              receives: [
                {
                  id: 'payment-received',
                  schemaGroup: 'com.example.payments'
                },
              ],
            },
          ],
        },
      ],
    ];
    ```
  </TabItem>
  <TabItem value="advanced" label="Advanced Example with Domains and Message Types">

In this example we document services from Azure Event Hubs, assign schemas to them as different message types (events, commands, queries), and organize them into domains.

```js title="eventcatalog.config.js"
// ...
generators: [
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      // The URL of your Azure Schema Registry
      schemaRegistryUrl: 'https://your-namespace.servicebus.windows.net',
      // Define the domain for these services
      domain: {
        id: 'orders-domain',
        name: 'Orders Domain',
        version: '1.0.0',
      },
      // The services to assign schemas to
      services: [
        {
          id: 'orders-service',
          name: 'Orders Service',
          version: '1.0.0',
          sends: [
            {
              id: 'order-created',
              schemaGroup: 'com.example.orders',
              name: 'Order Created Event',
              messageType: 'event', // Specify as event
            },
            {
              id: 'create-order',
              schemaGroup: 'com.example.orders',
              name: 'Create Order Command',
              messageType: 'command', // Specify as command
            },
          ],
          receives: [
            {
              id: 'get-order',
              schemaGroup: 'com.example.orders',
              name: 'Get Order Query',
              messageType: 'query', // Specify as query
            },
            {
              id: 'payment-received',
              schemaGroup: 'com.example.payments',
              name: 'Payment Received Event',
            },
          ],
        },
        {
          id: 'inventory-service',
          name: 'Inventory Service',
          version: '1.0.0',
          sends: [
            {
              id: 'inventory-updated',
              schemaGroup: 'com.example.inventory',
              messageType: 'event',
            },
          ],
          receives: [
            {
              id: 'order-created',
              schemaGroup: 'com.example.orders',
              messageType: 'event',
            },
          ],
        },
      ],
    },
  ],
];
```
  </TabItem>
  <TabItem value="multiple-registries" label="Multiple Schema Registries">

In this example we fetch schemas from multiple Azure Schema Registries by overriding the registry URL per schema.

```js title="eventcatalog.config.js"
// ...
generators: [
  [
    '@eventcatalog/generator-azure-schema-registry',
    {
      // Default schema registry URL
      schemaRegistryUrl: 'https://primary-namespace.servicebus.windows.net',
      services: [
        {
          id: 'orders-service',
          name: 'Orders Service',
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
              // Override to fetch from a different registry
              schemaRegistryUrl: 'https://shipping-namespace.servicebus.windows.net',
            },
          ],
        },
      ],
    },
  ],
];
```
  </TabItem>
</Tabs>

### Configure Authentication

The EventCatalog Azure Schema Registry plugin uses Azure's REST API with Bearer token authentication. You need to set the `AZURE_SCHEMA_REGISTRY_TOKEN` environment variable with your Azure access token.

### Configure Azure Schema Registry License Key

The EventCatalog Azure Schema Registry plugin requires an EventCatalog Scale license key to work with EventCatalog.

You can get a trial Scale license key from [EventCatalog Cloud](https://eventcatalog.cloud).


---

## Getting an Azure Access Token

### Prerequisites

Before getting a token, ensure you have:

1. **Azure CLI installed** - [Install Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **Access to an Azure Event Hubs namespace** with Schema Registry enabled
3. **Appropriate permissions** - You need one of these roles on the Event Hubs namespace:
   - `Azure Event Hubs Data Owner` (full access)
   - `Azure Event Hubs Data Receiver` (read access)

### Method 1: Quick Setup for Local Development (Recommended)

This is the fastest way to get started:

**Step 1: Login to Azure**

```bash
az login
```

This opens your browser for authentication. After logging in, you'll see your subscriptions.

**Step 2: Set Your Subscription (if you have multiple)**

```bash
# List your subscriptions
az account list --output table

# Set the subscription containing your Event Hubs namespace
az account set --subscription "Your-Subscription-Name-or-ID"
```

**Step 3: Get and Export the Access Token**

```bash
# Get token for Azure Event Hubs and export it
export AZURE_SCHEMA_REGISTRY_TOKEN=$(az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv)

# Verify the token is set
echo $AZURE_SCHEMA_REGISTRY_TOKEN
```

**Step 4: Run the Generator**

```bash
# Your token is now ready - run the generator
npm run generate
```

:::tip Quick Command
You can also set the token and run the generator in one command:
```bash
AZURE_SCHEMA_REGISTRY_TOKEN=$(az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv) npm run generate
```
:::

### Method 2: Using .env File (Recommended for Projects)

For a more permanent setup, add the token to your `.env` file:

**Step 1: Get the Token**

```bash
# Login first
az login

# Get the token
az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv
```

**Step 2: Add to .env File**

Create or update your `.env` file in your EventCatalog project root:

```bash title=".env"
# EventCatalog license key
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key

# Azure Schema Registry access token (paste the token from step 1)
AZURE_SCHEMA_REGISTRY_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOi...
```

:::tip Using an Older API Key?

If you already have an older Azure Schema Registry plugin key, you can still use it with the plugin-specific environment variable.

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_AZURE_SCHEMA_REGISTRY=your-license-key
```

:::

**Step 3: Run the Generator**

```bash
npm run generate
```

### Method 3: CI/CD with Service Principal

For automated pipelines, use a service principal to obtain tokens programmatically:

**Step 1: Create a Service Principal (one-time setup)**

```bash
# Create service principal
az ad sp create-for-rbac --name "eventcatalog-generator" --role "Azure Event Hubs Data Receiver" \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.EventHub/namespaces/{namespace-name}
```

This outputs credentials like:
```json
{
  "appId": "12345678-1234-1234-1234-123456789012",
  "password": "your-secret",
  "tenant": "your-tenant-id"
}
```

**Step 2: Set Environment Variables in CI/CD**

Add these secrets to your CI/CD environment:

```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-app-id
AZURE_CLIENT_SECRET=your-password
```

**Step 3: Get Token in CI/CD Pipeline**

```bash
# Login with service principal and get token
export AZURE_SCHEMA_REGISTRY_TOKEN=$(az login --service-principal \
  --username $AZURE_CLIENT_ID \
  --password $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID \
  --output none && \
  az account get-access-token --resource https://eventhubs.azure.net --query accessToken -o tsv)

# Run the generator
npm run generate
```

### Verify Your Permissions

To check if you have the right permissions:

```bash
# Check your current user
az account show --query user.name

# List role assignments for your Event Hubs namespace
az role assignment list \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.EventHub/namespaces/{namespace-name} \
  --query "[?principalName=='your-email@domain.com'].{Role:roleDefinitionName}" \
  --output table
```

You should see one of these roles:
- `Azure Event Hubs Data Owner`
- `Azure Event Hubs Data Receiver`

### If You Don't Have Permission

Ask your Azure administrator to grant you access:

```bash
az role assignment create \
  --role "Azure Event Hubs Data Receiver" \
  --assignee "your-email@domain.com" \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.EventHub/namespaces/{namespace-name}
```

## White listing EventCatalog Domains

If you are behind a firewall you will need to white list the domain `https://api.eventcatalog.cloud` in your firewall. This is because the plugin needs to verify your license key.

### Run the plugin

Run the plugin to import your schemas into EventCatalog.

_This command will run the generators in your eventcatalog.config.js file._

```bash
npm run generate
```

### View your catalog

Run your catalog locally to see the changes

```bash
npm run dev
```

### Build your catalog for production

```bash
npm run build
```

## Any questions or need help?

If you get stuck, find an issue or need help, please raise an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues) or join our [Discord community](https://eventcatalog.dev/discord).

You can also find some examples of the plugin in action in our examples repository: [eventcatalog/examples](https://github.com/event-catalog/generators/tree/main/examples/generator-azure-schema-registry).
