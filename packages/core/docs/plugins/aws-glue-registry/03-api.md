---
sidebar_position: 5
keywords:
- api
sidebar_label: API Reference
title: API Reference
description: Complete API reference for AWS Glue Schema Registry plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Configuration Options

### Required Configuration

| Property | Type | Description |
|----------|------|-------------|
| `region` | `string` | AWS region where your schema registry is located |
| `registryName` | `string` | Name of the AWS Glue Schema Registry |

### Optional Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `registryArn` | `string` | `undefined` | ARN of the registry (for cross-account access) |
| `services` | `Service[]` | `[]` | Array of service definitions to map schemas to |
| `domain` | `Domain` | `undefined` | Domain configuration for organizing services |
| `credentials` | `AwsCredentials` | `undefined` | Custom AWS credentials |
| `debug` | `boolean` | `false` | Enable debug logging |
| `format` | `'md' \| 'mdx'` | `'mdx'` | Output file format |
| `writeFilesToRoot` | `boolean` | `false` | Write files to root instead of service directories |

## Type Definitions

### Service

Defines a service and which schemas it produces/consumes.

```typescript
type Service = {
  id: string;           // Unique service identifier
  version: string;      // Service version
  sends?: Filter[];     // Schemas this service produces
  receives?: Filter[];  // Schemas this service consumes
}
```

### Filter

Defines criteria for matching schemas to services.

```typescript
type Filter = {
  schemaName?: string | string[];    // Exact schema name matching
  prefix?: string | string[];        // Schema name starts with
  suffix?: string | string[];        // Schema name ends with  
  includes?: string | string[];      // Schema name contains
  dataFormat?: string | string[];    // Schema format (AVRO, JSON, PROTOBUF)
  tags?: Record<string, string>;     // AWS tags key-value pairs
}
```

#### Filter Examples

```js
// Exact name matching
{ schemaName: 'CustomerCreated' }
{ schemaName: ['CustomerCreated', 'CustomerUpdated'] }

// Prefix matching
{ prefix: 'Customer' }
{ prefix: ['Customer', 'User'] }

// Suffix matching  
{ suffix: 'Created' }
{ suffix: ['Created', 'Updated'] }

// Contains matching
{ includes: 'customer' }
{ includes: ['customer', 'user'] }

// Format matching
{ dataFormat: 'AVRO' }
{ dataFormat: ['AVRO', 'JSON'] }

// Tag matching (ALL tags must match)
{ tags: { team: 'customer' } }
{ tags: { team: 'customer', env: 'prod' } }

// Combined filters (ALL criteria must match)
{
  prefix: 'Customer',
  dataFormat: 'AVRO', 
  tags: { env: 'prod' }
}
```

### Domain

Defines a domain for organizing related services.

```typescript
type Domain = {
  id: string;      // Unique domain identifier
  name: string;    // Display name for the domain
  version: string; // Domain version
}
```

### AWS Credentials

Custom AWS credentials (use environment variables when possible).

```typescript
type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;  // For temporary credentials
}
```

## Complete Configuration Example

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        // Required
        region: 'us-east-1',
        registryName: 'my-event-registry',
        
        // Optional - Cross-account access
        registryArn: 'arn:aws:glue:us-east-1:123456789012:registry/shared-registry',
        
        // Optional - Custom credentials (not recommended)
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        
        // Optional - Domain organization
        domain: {
          id: 'ecommerce',
          name: 'E-commerce Platform',
          version: '1.0.0'
        },
        
        // Optional - Service mapping
        services: [
          {
            id: 'Customer Service',
            version: '1.0.0',
            sends: [
              { prefix: 'Customer' },
              { tags: { team: 'customer' } }
            ],
            receives: [
              { schemaName: ['OrderPlaced', 'PaymentProcessed'] },
              { includes: 'notification' }
            ]
          },
          {
            id: 'Order Service',
            version: '1.0.0', 
            sends: [
              { prefix: 'Order' },
              { dataFormat: 'AVRO' }
            ],
            receives: [
              { suffix: ['Created', 'Updated'] },
              { tags: { env: 'prod', type: 'input' } }
            ]
          }
        ],
        
        // Optional - Output configuration
        format: 'mdx',
        writeFilesToRoot: false,
        debug: true
      },
    ],
  ],
}
```

## Schema Matching Logic

### Filter Evaluation

When a schema is evaluated against a filter:

1. **Within a filter object**: ALL criteria must match (AND logic)
2. **Between filter objects**: ANY filter can match (OR logic)  
3. **Within array values**: ANY value can match (OR logic)

### Examples

```js
// Schema must start with 'Customer' AND be AVRO format AND have team=customer tag
{
  prefix: 'Customer',
  dataFormat: 'AVRO',
  tags: { team: 'customer' }
}

// Schema must contain 'order' OR 'customer' OR 'payment'
{
  includes: ['order', 'customer', 'payment']
}

// Multiple filters - schema matches if it satisfies ANY filter
sends: [
  { prefix: 'Customer' },      // OR
  { tags: { team: 'orders' } } // OR  
  { dataFormat: 'AVRO' }       // OR
]
```

### Priority and Precedence

1. More specific filters take precedence over general ones
2. Exact `schemaName` matches have highest priority
3. Combined filters are more specific than single criteria
4. Schema can only be assigned to one service per filter match

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `AccessDenied` | Insufficient IAM permissions | Check IAM policy has required Glue permissions |
| `RegistryNotFound` | Registry doesn't exist | Verify registry name and region |
| `InvalidCredentials` | AWS credentials invalid | Check AWS credential configuration |
| `SchemaNotFound` | Schema was deleted | Re-run generator to sync with current state |

### Debug Mode

Enable debug mode to troubleshoot issues:

```js
{
  debug: true,
  // ... other config
}
```

This will output detailed information about:
- Schemas being fetched
- Filter matching results  
- Service assignments
- File generation progress

## AWS Permissions Required

The plugin requires these IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "glue:ListSchemas",
        "glue:GetSchema", 
        "glue:GetSchemaVersion",
        "glue:GetTags"
      ],
      "Resource": [
        "arn:aws:glue:*:*:registry/*",
        "arn:aws:glue:*:*:schema/*/*"
      ]
    }
  ]
}
```

For cross-account access, additional permissions may be required on the target account's registry.