---
sidebar_position: 1
keywords:
- components
sidebar_label: Features
title: Features
description: Features of GraphQL with EventCatalog
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<!-- Table -->
| Feature | Use cases |
|---------|-----------|
| [Mapping operations as queries, mutations, or subscriptions](#mapping-operations-as-queries-mutations-or-subscriptions) | GraphQL distinguishes between queries (read operations), mutations (write operations), and subscriptions (real-time operations). EventCatalog automatically maps these operations from your GraphQL schema to the appropriate message types in your catalog. |
| [Assign owners to your domains, services and messages](#assign-owners-to-your-domains-services-and-messages) | You can assign owners (teams or individuals) to your GraphQL services and all the messages that are generated from your schema. This helps with accountability and contact information for your APIs. |
| [Automatic versioning](#automatic-versioning) | When you change versions in your GraphQL schema and run generate, your services and messages are automatically versioned. This allows you to keep an audit log of changes between schema versions. |
| [Creating draft domains, services and messages](#creating-draft-domains-services-and-messages) | You can create draft domains, services and messages in EventCatalog from your GraphQL schemas. This will be used to mark the resources as draft in EventCatalog. |
| [Persist markdown](#persist-markdown) | When you generate your GraphQL schemas your markdown on your domains, services, and messages in EventCatalog is persisted between versions. This allows you to add [custom components](/docs/components/custom-components), our [MDX components](/docs/components) and customize your EventCatalog pages without losing changes when you version your schemas. |
| [Displaying schemas](#displaying-schemas) | EventCatalog will document your GraphQL schemas and allow users to download them. Your schema files are versioned alongside your services and messages. |

### Mapping operations as queries, mutations, or subscriptions

GraphQL has three main operation types:

- **Queries**: Read operations that fetch data
- **Mutations**: Write operations that modify data
- **Subscriptions**: Real-time operations that listen for data changes

The EventCatalog GraphQL generator automatically maps these operations from your GraphQL schema:

```graphql title="Example GraphQL Schema"
type Query {
  getUser(id: ID!): User
  getAllUsers: [User]
}

type Mutation {
  createUser(input: CreateUserInput!): User
  updateUser(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean
}

type Subscription {
  userUpdated(id: ID!): User
  userDeleted: ID
}

type User {
  id: ID!
  name: String!
  email: String!
}
```

When this schema is processed by the GraphQL generator:

- **Queries** like `getUser` and `getAllUsers` will be documented as [queries](/docs/development/guides/resources/messages/message-types/queries)
- **Mutations** like `createUser`, `updateUser`, and `deleteUser` will be documented as [commands](/docs/development/guides/resources/messages/message-types/commands)
- **Subscriptions** like `userUpdated` and `userDeleted` will be documented as [events](/docs/development/guides/resources/messages/message-types/events)

Each operation becomes a message in EventCatalog with:
- The operation name as the message ID
- The operation description (if provided in schema)
- Input parameters and return types
- The operation type (query/mutation/subscription) as a badge

### Assign owners to your domains, services and messages

You can assign owners to your GraphQL services and all generated messages to help with accountability and contact information.

```js title="eventcatalog.config.js"
export default {
  generators: [
    [
      '@eventcatalog/generator-graphql',
      {
        services: [
          {
            id: 'User Service',
            version: '1.0.0',
            name: 'User Service',
            summary: 'This is the user service',
            path: path.join(__dirname, 'graphql-schemas', 'user-service.graphql'),
            owners: ['team-users', 'john.doe@company.com']
          },
        ],
        domain: {
          id: 'users',
          name: 'Users',
          version: '0.0.1',
          owners: ['team-platform']
        },
      },
    ],
  ],
};
```

When you assign owners:
- **Service owners**: Set on the service configuration and apply to the service and all its messages
- **Domain owners**: Set on the domain configuration and apply to the domain


### Automatic versioning

EventCatalog automatically versions your services and messages when you change the version in your configuration:

```js title="eventcatalog.config.js - Version 1.0.0"
{
  path: path.join(__dirname, 'schemas', 'user-service.graphql'),
  id: 'User Service',
  version: '1.0.0'  // Initial version
}
```

```js title="eventcatalog.config.js - Version 1.1.0"
{
  path: path.join(__dirname, 'schemas', 'user-service.graphql'),
  id: 'User Service',
  version: '1.1.0'  // Updated version
}
```

When you update the version and run `npm run generate`:

1. **Service versioning**: The service gets a new version (1.1.0) while keeping the old version (1.0.0)
2. **Message versioning**: All messages (queries, mutations, subscriptions) get versioned
3. **Schema versioning**: The GraphQL schema file is versioned and downloadable
4. **Change tracking**: You can see what changed between versions

This allows you to:
- Track API evolution over time
- Maintain backward compatibility documentation
- Show deprecation timelines
- Compare schema changes between versions

### Creating draft domains, services and messages

You can mark your GraphQL services as drafts during development:

```js title="eventcatalog.config.js"
export default {
  generators: [
    [
      '@eventcatalog/generator-graphql',
      {
        services: [
          {
            path: path.join(__dirname, 'schemas', 'new-feature-service.graphql'),
            id: 'New Feature Service',
            version: '0.1.0',
            draft: true  // Mark as draft
          },
        ],
        domain: { id: 'experimental', name: 'Experimental', version: '0.0.1' },
      },
    ],
  ],
};
```

Draft resources:
- Are marked with a "DRAFT" badge in the UI
- Can be filtered out from production views
- Help distinguish between stable and experimental APIs
- Useful for API development and review processes

### Persist markdown

EventCatalog preserves your custom markdown content when you regenerate from GraphQL schemas:

1. **Initial generation**: GraphQL generator creates default markdown for your services and messages
2. **Custom additions**: You add custom content, components, or documentation
3. **Regeneration**: When you run the generator again, your custom content is preserved
4. **Version updates**: Custom content persists across version changes

This allows you to:
- Add business context to technical schema definitions
- Include examples and usage guidelines
- Add custom MDX components for rich documentation
- Provide architectural decision records (ADRs)
- Include troubleshooting guides

### Displaying schemas

EventCatalog displays your GraphQL schemas and makes them downloadable:

1. **Schema visualization**: Your complete GraphQL schema is rendered in the service page
2. **Operation details**: Each query, mutation, and subscription shows:
   - Input parameters and types
   - Return types
   - Field descriptions
   - Deprecation notices
3. **Downloadable schemas**: Users can download the complete GraphQL schema file
4. **Versioned schemas**: Each version of your service includes its schema version
