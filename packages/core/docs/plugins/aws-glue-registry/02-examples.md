---
sidebar_position: 4
keywords:
- examples
sidebar_label: Examples
title: Examples
description: Examples of using AWS Glue Schema Registry with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Here are some practical examples showing different ways to use the AWS Glue Schema Registry generator.

## Basic Example: Document All Schemas

The simplest configuration generates events for every schema in your registry:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'ecommerce-events',
      },
    ],
  ],
}
```

This creates:
- An event for each schema in the `ecommerce-events` registry
- A channel representing the registry
- Schema files attached to each event

## E-commerce Platform Example

Map schemas to services based on business domains:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'ecommerce-events',
        domain: {
          id: 'ecommerce',
          name: 'E-commerce Platform',
          version: '1.0.0'
        },
        services: [
          {
            id: 'Customer Service',
            version: '1.0.0',
            sends: [
              { prefix: 'Customer' },
              { suffix: 'ProfileUpdated' }
            ],
            receives: [
              { schemaName: 'OrderPlaced' },
              { includes: 'payment' }
            ]
          },
          {
            id: 'Order Service', 
            version: '1.0.0',
            sends: [
              { prefix: 'Order' },
              { schemaName: ['InventoryReserved', 'PaymentRequested'] }
            ],
            receives: [
              { prefix: 'Customer' },
              { suffix: ['Confirmed', 'Updated'] }
            ]
          },
          {
            id: 'Inventory Service',
            version: '1.0.0', 
            sends: [
              { prefix: 'Inventory' },
              { includes: 'stock' }
            ],
            receives: [
              { schemaName: 'OrderPlaced' },
              { includes: 'reservation' }
            ]
          }
        ]
      },
    ],
  ],
}
```

## Team-based Organization with Tags

Use AWS tags to organize schemas by team ownership:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'company-events',
        services: [
          {
            id: 'Customer Experience Service',
            version: '1.0.0',
            sends: [{ tags: { team: 'customer-experience' } }],
            receives: [{ tags: { team: 'orders', env: 'prod' } }]
          },
          {
            id: 'Data Analytics Service',
            version: '1.0.0',
            sends: [{ tags: { team: 'analytics' } }],
            receives: [{ tags: { type: 'analytics-input' } }]
          },
          {
            id: 'Platform Service',
            version: '1.0.0',
            sends: [{ tags: { team: 'platform', env: 'prod' } }],
            receives: [{ tags: { category: 'infrastructure' } }]
          }
        ]
      },
    ],
  ],
}
```

## Multi-Format Schema Environment

Handle different schema formats for different use cases:

```js
// eventcatalog.config.js  
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'multi-format-schemas',
        services: [
          {
            id: 'High Volume Streaming Service',
            version: '1.0.0',
            sends: [{ dataFormat: 'AVRO' }], // Efficient binary format
            receives: [{ dataFormat: ['AVRO'] }]
          },
          {
            id: 'API Gateway Service',
            version: '1.0.0', 
            sends: [{ dataFormat: 'JSON' }], // Human readable for APIs
            receives: [{ dataFormat: ['JSON'] }]
          },
          {
            id: 'gRPC Microservice',
            version: '1.0.0',
            sends: [{ dataFormat: 'PROTOBUF' }], // Language neutral
            receives: [{ dataFormat: ['PROTOBUF'] }]
          }
        ]
      },
    ],
  ],
}
```

## Advanced Filtering Example

Combine multiple filter types for precise schema mapping:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'advanced-events',
        services: [
          {
            id: 'Production Customer Service',
            version: '1.0.0',
            sends: [
              {
                prefix: 'Customer',
                dataFormat: 'AVRO',
                tags: { env: 'prod', team: 'customer' }
              }
            ],
            receives: [
              {
                includes: ['order', 'payment'],
                dataFormat: ['JSON', 'AVRO'],
                tags: { env: 'prod' }
              }
            ]
          },
          {
            id: 'Event Processing Service',
            version: '1.0.0',
            sends: [
              {
                suffix: ['Processed', 'Enriched'],
                dataFormat: 'AVRO'
              }
            ],
            receives: [
              {
                prefix: 'Raw',
                includes: 'event',
                tags: { type: 'input' }
              }
            ]
          }
        ]
      },
    ],
  ],
}
```

## Cross-Account Registry Access

Access schemas from a centralized registry in another AWS account:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryArn: 'arn:aws:glue:us-east-1:123456789012:registry/central-schemas',
        services: [
          {
            id: 'Consumer Service',
            version: '1.0.0',
            receives: [
              { prefix: 'Shared' },
              { tags: { shared: 'true' } }
            ]
          }
        ]
      },
    ],
  ],
}
```

## Multiple Registries

Document schemas from multiple registries in one catalog:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'customer-events',
        domain: {
          id: 'customer',
          name: 'Customer Domain',
          version: '1.0.0'
        },
        services: [
          {
            id: 'Customer Service',
            version: '1.0.0',
            sends: [{ prefix: 'Customer' }]
          }
        ]
      },
    ],
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1', 
        registryName: 'order-events',
        domain: {
          id: 'orders',
          name: 'Order Domain', 
          version: '1.0.0'
        },
        services: [
          {
            id: 'Order Service',
            version: '1.0.0',
            sends: [{ prefix: 'Order' }]
          }
        ]
      },
    ],
  ],
}
```

## Custom Output Format

Generate markdown files instead of MDX:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'my-events',
        format: 'md', // Generate .md files instead of .mdx
        writeFilesToRoot: true, // Write files to root instead of service subdirectories
        services: [
          {
            id: 'Simple Service',
            version: '1.0.0',
            sends: [{ prefix: 'Simple' }]
          }
        ]
      },
    ],
  ],
}
```

## Debug Mode

Enable debug mode to see detailed information during generation:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'debug-events',
        debug: true, // Enable detailed logging
        services: [
          {
            id: 'Debug Service',
            version: '1.0.0',
            sends: [{ prefix: 'Debug' }]
          }
        ]
      },
    ],
  ],
}
```

These examples show the flexibility of the AWS Glue Schema Registry generator. You can start simple and add complexity as your schema management needs grow.