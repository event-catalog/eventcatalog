---
sidebar_position: 1
keywords:
- EventCatalog Apicurio Registry plugin
sidebar_label: Plugin Configuration
title: Plugin Configuration
description: Configuration of the EventCatalog Apicurio Registry plugin
---

# Plugin Configuration

## Overview

The EventCatalog Apicurio Registry plugin is configured in the `eventcatalog.config.js` file inside the `generators` array.

:::info Authentication
If your Apicurio Registry requires authentication, you can configure a Bearer token as an environment variable.

<details>
<summary>Example .env file</summary>

```bash
export APICURIO_ACCESS_TOKEN=your-access-token-here
```

</details>

:::

## Required Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `registryUrl` | `string` | Yes | The URL of your Apicurio Registry (e.g., `http://localhost:8080`). The plugin automatically appends the `/apis/registry/v3` API path. |
| `includeAllVersions` | `boolean` | No | If true, all versions of the schemas will be imported into EventCatalog (default is `false`). When enabled, each version of a schema creates a separate versioned entry in EventCatalog. |

## Optional Configuration Options

### Services

You can assign schemas to services (producers/consumers).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `services` | object | - | List of services to assign the schemas to. |
| `services.id` | string | - | EventCatalog ID for the service. |
| `services.version` | string | - | Version of the service. |
| `services.name` | string | - | Name of the service (optional, defaults to ID). |
| `services.summary` | string | - | Summary description of the service (optional). |
| `services.sends` | Filter | - | Configuration to assign schemas that this service sends (publishes). |
| `services.receives` | Filter | - | Configuration to assign schemas that this service receives (consumes). |
| `services.writesTo` | array | - | Array of services this service writes to. Each entry has `id` (required) and optional `version`. |
| `services.readsFrom` | array | - | Array of services this service reads from. Each entry has `id` (required) and optional `version`. |
| `services.specifications` | array | - | Array of specification artifacts (OpenAPI/AsyncAPI) to attach to the service. See [Specifications](#specifications) section below. |

### Domains

You can define and assign domains to your services.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain.id` | string | - | EventCatalog ID for the domain (e.g `orders`). |
| `domain.name` | string | - | Name of the domain (e.g `Orders`). |
| `domain.version` | string | - | Version of the domain (e.g `1.0.0`). |
| `domain.summary` | string | - | Summary description of the domain (optional). |

### Specifications

You can attach OpenAPI or AsyncAPI specifications stored in your Apicurio Registry to services. When configured with a generator, these specifications will be automatically processed to generate comprehensive service documentation including REST endpoints, async events, and more.

<details>
<summary>Learn more about attaching OpenAPI and AsyncAPI specifications</summary>

You can attach OpenAPI or AsyncAPI specifications from your Apicurio Registry to services. These specifications can optionally be processed by their respective EventCatalog plugins to generate additional documentation.

:::info Plugin Licenses Required
The OpenAPI and AsyncAPI generators require an EventCatalog Scale license key. To use them with the Apicurio plugin, you'll need to:
- Install the respective plugins: `npm install @eventcatalog/generator-openapi @eventcatalog/generator-asyncapi`
- Obtain an EventCatalog Scale license key from [EventCatalog Cloud](https://eventcatalog.cloud) (30-day free trial available)
- Configure the license key in your `.env` file:
  - `EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key`

Learn more: [OpenAPI Plugin Docs](/docs/plugins/openapi/intro) | [AsyncAPI Plugin Docs](/docs/plugins/asyncapi/intro)
:::

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `services.specifications` | array | No | Array of specification configurations to attach to the service. |
| `specifications[].type` | string | Yes | Type of specification: `'openapi'` or `'asyncapi'`. |
| `specifications[].artifactId` | string | Yes | The artifact ID in Apicurio Registry. |
| `specifications[].version` | string | No | Specific version to fetch, or `'latest'` (default). |
| `specifications[].generator` | array | No | Optional EventCatalog generator to process the specification. Format: `['@eventcatalog/generator-openapi', { options }]` |

**Example:**

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
        // generator options here
      }]
    },
    {
      type: 'asyncapi',
      artifactId: 'OrdersEvents-ASYNCAPI',
      version: '2.0.0',
      generator: ['@eventcatalog/generator-asyncapi', {
        // generator options here
      }]
    }
  ]
}]
```

When a generator is configured, the plugin will:
1. Fetch the specification from Apicurio Registry
2. Save it to the service directory
3. Run the specified generator to process the specification
4. Pass the domain configuration to the generator if a domain is configured

</details>

### Filtering schemas to services

When you assign schemas to a service, you can use a range of filtering options including exact matches, prefixes, suffixes, and includes.

Here are some examples of how to filter schemas to services.

<details>
<summary>`exact` matching example - Match schemas that exactly match the specified name</summary>

**What is exact matching?**

Exact matching is when the schema artifact ID exactly matches the specified name.

In this example, the `Orders Service` will send `events` with the artifact IDs `order-placed`, `order-cancelled` and receive `commands` with the artifact ID `place-order`.

Example artifacts in Apicurio Registry:
- `order-placed`
- `order-cancelled`
- `place-order`
- `cancel-order`

```js
// ...
generators: [
  // Import schemas (using filters), assign them to services and domains
  [
    '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Order service publishes events that match the artifact IDs
            sends: [{ events: ['order-placed', 'order-cancelled']}],
            // The Order service receives commands that match the artifact IDs
            receives: [{ commands: ['place-order', 'cancel-order']}],
          }
        ],
      },
  ],
];
```

</details>

<details>
<summary>`suffix` matching example - Match schemas that end with a specific string</summary>

**What is suffix matching?**

Suffix matching is when the artifact ID ends with the specified suffix.

In this example, the `Orders Service` will send `events` with a suffix of `-placed` and receive `commands` with a suffix of `-command`.

Example artifacts in registry:
- `order-placed`
- `order-cancelled`
- `place-order-command`
- `cancel-order-command`

```js
// ...
generators: [
  // Import schemas (using filters), assign them to services and domains
  [
    '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Order service publishes events with a suffix of `-placed`
            sends: [{ events: { suffix: '-placed' }}],
            // The Order service receives commands with a suffix of `-command`
            receives: [{ commands: { suffix: '-command' }}],
          }
        ],
      },
  ],
];
```

</details>

<details>
<summary>`prefix` matching example - Match schemas that start with a specific string</summary>

**What is prefix matching?**

Prefix matching is when the artifact ID starts with the specified prefix.

In this example, the `Orders Service` will send `events` with a prefix of `order-` and receive `commands` with a prefix of `analytics-`.

Example artifacts in registry:
- `order-placed`
- `order-cancelled`
- `analytics-place-order`
- `analytics-cancel-order`

```js
// ...
generators: [
  // Import schemas (using filters), assign them to services and domains
  [
    '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Order service publishes events with a prefix of `order-`
            sends: [{ events: { prefix: 'order-' }}],
            // The Order service receives commands with a prefix of `analytics-`
            receives: [{ commands: { prefix: 'analytics-' }}],
          }
        ],
      },
  ],
];
```

</details>

<details>
<summary>`includes` matching example - Match schemas that include a specific string</summary>

**What is includes matching?**

Includes matching is when the artifact ID contains the specified string anywhere in its name.

In this example, the `Orders Service` will send `events` that include the string `order` and receive `commands` that include the string `analytics`.

Example artifacts in registry:
- `order-placed`
- `order-cancelled`
- `analytics-place-order`
- `analytics-cancel-order`

```js
// ...
generators: [
  // Import schemas (using filters), assign them to services and domains
  [
    '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Order service publishes events that include `order`
            sends: [{ events: { includes: 'order' }}],
            // The Order service receives commands that include `analytics`
            receives: [{ commands: { includes: 'analytics' }}],
          }
        ],
      },
  ],
];
```

</details>

<details>
<summary>Message types - Document schemas as events, commands, or queries</summary>

**What are message types?**

You can document your schemas as different message types in EventCatalog:
- **events**: Things that have happened (past tense)
- **commands**: Requests to do something (imperative)
- **queries**: Requests for information

In this example, the `Orders Service` sends events and receives both commands and queries.

```js
// ...
generators: [
  [
    '@eventcatalog/generator-apicurio',
      {
        registryUrl: 'http://localhost:8080',
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Sends events
            sends: [{ events: { prefix: 'order-' }}],
            // Receives commands and queries
            receives: [
              { commands: ['place-order', 'cancel-order']},
              { queries: ['get-order-status']}
            ],
          }
        ],
      },
  ],
];
```

</details>

## Example Configurations

The Apicurio Registry plugin is flexible to work with your use case.
Here are a few examples of how you can configure the plugin.

<details>
<summary>Example configuration - Import all schemas (and versions) into EventCatalog</summary>

In this example we import all schemas from the Apicurio Registry into EventCatalog.
No services or domains are configured or created. This is a simple way to import schemas into the catalog and keep them in sync with your documentation.

```js title="eventcatalog.config.js"
  // ...rest of eventcatalog.config.js file
  generators: [
    [
      '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',

        // Include all versions of the schemas
        includeAllVersions: true,
      }
    ]
  ],
};
```

</details>

<details>
<summary>Example configuration - Assign schemas to services</summary>

In this example we assign schemas to services (producers and consumers in EventCatalog).

```js title="eventcatalog.config.js"
  // ...rest of eventcatalog.config.js file
  generators: [
    [
      '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Order service publishes events that match the artifact IDs
            sends: [{ events: ['order-placed', 'order-cancelled']}],
            // The Order service receives commands that match the artifact IDs
            receives: [{ commands: ['place-order', 'cancel-order']}],
          }
        ]
      }
    ]
  ],
};
```

</details>

<details>
<summary>Example configuration - Assign schemas to services (with filters)</summary>

In this example we assign schemas to services (producers and consumers in EventCatalog) but we use filters to match the schemas.

```js title="eventcatalog.config.js"
  // ...rest of eventcatalog.config.js file
  generators: [
    [
      '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Order service publishes events that start with `order-`
            sends: [{ events: { prefix: 'order-' }}],
            // The Order service receives commands that end with `-command`
            receives: [{ commands: { suffix: '-command' }}],
          }
        ]
      }
    ]
  ],
};
```

</details>

<details>
<summary>Example configuration - Assign schemas to services within a domain</summary>

In this example we assign schemas to services (producers and consumers in EventCatalog) and we also assign them to a *domain*.

```js title="eventcatalog.config.js"
  // ...rest of eventcatalog.config.js file
  generators: [
    [
      '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Order service publishes events
            sends: [{ events: ['order-placed', 'order-cancelled']}],
            // The Order service receives commands
            receives: [{ commands: ['place-order', 'cancel-order']}],
          }
        ],
        // The domain to assign the service to
        // if it does not exist, it will be created
        domain: {
          id: 'orders',
          name: 'Orders',
          version: '1.0.0',
        }
      }
    ]
  ],
};
```

</details>

<details>
<summary>Example configuration - Attach specifications and use nested generators</summary>

In this example we attach OpenAPI and AsyncAPI specifications to a service and use the respective EventCatalog generators to process them.

```js title="eventcatalog.config.js"
  // ...rest of eventcatalog.config.js file
  generators: [
    [
      '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // Attach specifications from Apicurio Registry
            specifications: [
              {
                type: 'openapi',
                artifactId: 'OrdersAPI-OPENAPI',
                version: 'latest',
                // Use the OpenAPI generator to process the specification
                generator: ['@eventcatalog/generator-openapi', {
                  // Pass options to the OpenAPI generator if needed
                }]
              },
              {
                type: 'asyncapi',
                artifactId: 'OrdersEvents-ASYNCAPI',
                version: '2.0.0',
                // Use the AsyncAPI generator to process the specification
                generator: ['@eventcatalog/generator-asyncapi', {
                  // Pass options to the AsyncAPI generator if needed
                }]
              }
            ],
            // You can also assign schemas directly
            sends: [{ events: { prefix: 'order-' }}],
            receives: [{ commands: ['place-order', 'cancel-order']}],
          }
        ],
        domain: {
          id: 'orders',
          name: 'Orders',
          version: '1.0.0',
        }
      }
    ]
  ],
};
```

:::tip
When using nested generators, make sure to:
1. Install the respective plugins:
```bash
npm install @eventcatalog/generator-openapi @eventcatalog/generator-asyncapi
```
2. Obtain an EventCatalog Scale license key from [EventCatalog Cloud](https://eventcatalog.cloud) (30-day free trial available)
3. Add the license key to your `.env` file:
```bash
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key
```

See [OpenAPI Plugin Docs](/docs/plugins/openapi/intro) | [AsyncAPI Plugin Docs](/docs/plugins/asyncapi/intro) for more information.
:::

</details>

<details>
<summary>Example configuration - Service relationships with writesTo and readsFrom</summary>

In this example we document service-to-service relationships using `writesTo` and `readsFrom` to show how services interact with each other.

```js title="eventcatalog.config.js"
  // ...rest of eventcatalog.config.js file
  generators: [
    [
      '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            sends: [{ events: { prefix: 'order-' }}],
            receives: [{ commands: ['place-order', 'cancel-order']}],
            // This service writes to Inventory Service and Notifications Service
            writesTo: [
              { id: 'Inventory Service', version: '1.0.0' },
              { id: 'Notifications Service', version: '1.0.0' }
            ]
          },
          {
            id: 'Inventory Service',
            version: '1.0.0',
            sends: [{ events: { prefix: 'inventory-' }}],
            // This service reads from Orders Service
            readsFrom: [
              { id: 'Orders Service', version: '1.0.0' }
            ]
          },
          {
            id: 'Notifications Service',
            version: '1.0.0',
            receives: [{ events: ['order-placed', 'order-cancelled']}],
            // This service reads from Orders Service
            readsFrom: [
              { id: 'Orders Service', version: '1.0.0' }
            ]
          }
        ],
        domain: {
          id: 'orders',
          name: 'Orders',
          version: '1.0.0',
        }
      }
    ]
  ],
};
```

This configuration will create service relationships in EventCatalog, making it easier to visualize and understand how services communicate with each other.

</details>

<details>
<summary>Example configuration - Multiple domains with version management</summary>

In this example we configure the plugin multiple times to document different domains, and we use `includeAllVersions` to track schema evolution.

:::info "Why configure the plugin multiple times?"
The generator can be configured as many times as you want.
In this example we configure the plugin twice, once for each domain.
:::

```js title="eventcatalog.config.js"
  // ...rest of eventcatalog.config.js file
  generators: [
    // Retail domain
    [
      '@eventcatalog/generator-apicurio',
      {
        registryUrl: 'http://localhost:8080',
        includeAllVersions: true,
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            sends: [{ events: { prefix: 'order-' }}],
            receives: [{ commands: ['place-order', 'cancel-order']}],
          },
          {
            id: 'Inventory Service',
            version: '1.0.0',
            sends: [{ events: { prefix: 'inventory-' }}],
            receives: [{ events: { prefix: 'order-' }}],
          },
        ],
        domain: {
          id: 'retail',
          name: 'Retail',
          version: '1.0.0',
        }
      },
    ],
    // Communications domain
    [
      '@eventcatalog/generator-apicurio',
      {
        registryUrl: 'http://localhost:8080',
        includeAllVersions: true,
        services: [
          {
            id: 'Notifications Service',
            version: '1.0.0',
            receives: [
              { events: ['user-registered']},
              { events: ['order-placed']},
              { events: ['shipment-created']},
            ],
          },
        ],
        domain: {
          id: 'communications',
          name: 'Communications',
          version: '1.0.0',
        }
      },
    ],
  ],
};
```

</details>

## Need help?

If you have questions or need help, you can join our [Discord community](https://eventcatalog.dev/discord)
or refer to the [Apicurio Registry examples on GitHub](https://github.com/event-catalog/generators/tree/main/examples/generator-apicurio).
