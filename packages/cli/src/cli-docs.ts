/**
 * CLI Documentation Registry
 *
 * This file contains metadata for all SDK functions that can be called via the CLI.
 * It is used to generate documentation for the EventCatalog website.
 *
 * @module cli-docs
 */

export interface CLIFunctionArg {
  name: string;
  type: 'string' | 'json' | 'boolean' | 'number';
  required: boolean;
  description: string;
}

export interface CLIFunctionExample {
  description: string;
  command: string;
}

export interface CLIFunctionDoc {
  name: string;
  description: string;
  category: string;
  args: CLIFunctionArg[];
  examples: CLIFunctionExample[];
}

/**
 * All CLI-callable functions with their documentation
 */
export const cliFunctions: CLIFunctionDoc[] = [
  // ================================
  //            Events
  // ================================
  {
    name: 'getEvent',
    description: 'Returns an event from EventCatalog by its ID',
    category: 'Events',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the event to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve (supports semver)' },
      { name: 'options', type: 'json', required: false, description: 'Options object, e.g. {"attachSchema": true}' },
    ],
    examples: [
      { description: 'Get the latest version of an event', command: 'npx @eventcatalog/cli getEvent "OrderCreated"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getEvent "OrderCreated" "1.0.0"' },
      {
        description: 'Get event with schema attached',
        command: 'npx @eventcatalog/cli getEvent "OrderCreated" "1.0.0" \'{"attachSchema":true}\'',
      },
    ],
  },
  {
    name: 'getEvents',
    description: 'Returns all events from EventCatalog',
    category: 'Events',
    args: [
      {
        name: 'options',
        type: 'json',
        required: false,
        description: 'Options object, e.g. {"latestOnly": true, "attachSchema": true}',
      },
    ],
    examples: [
      { description: 'Get all events', command: 'npx @eventcatalog/cli getEvents' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getEvents \'{"latestOnly":true}\'' },
      {
        description: 'Get all events with schemas',
        command: 'npx @eventcatalog/cli getEvents \'{"latestOnly":true,"attachSchema":true}\'',
      },
    ],
  },
  {
    name: 'writeEvent',
    description: 'Writes an event to EventCatalog',
    category: 'Events',
    args: [
      { name: 'event', type: 'json', required: true, description: 'Event object with id, name, version, and markdown' },
      {
        name: 'options',
        type: 'json',
        required: false,
        description: 'Options: {path?, override?, versionExistingContent?, format?}',
      },
    ],
    examples: [
      {
        description: 'Write a new event',
        command:
          'npx @eventcatalog/cli writeEvent \'{"id":"OrderCreated","name":"Order Created","version":"1.0.0","markdown":"# Order Created"}\'',
      },
      {
        description: 'Write and version existing content',
        command:
          'npx @eventcatalog/cli writeEvent \'{"id":"OrderCreated","name":"Order Created","version":"2.0.0","markdown":"# Order Created v2"}\' \'{"versionExistingContent":true}\'',
      },
    ],
  },
  {
    name: 'writeEventToService',
    description: 'Writes an event to a specific service in EventCatalog',
    category: 'Events',
    args: [
      { name: 'event', type: 'json', required: true, description: 'Event object with id, name, version, and markdown' },
      { name: 'service', type: 'json', required: true, description: 'Service reference: {id, version?}' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, format?, override?}' },
    ],
    examples: [
      {
        description: 'Write event to a service',
        command:
          'npx @eventcatalog/cli writeEventToService \'{"id":"InventoryUpdated","name":"Inventory Updated","version":"1.0.0","markdown":"# Inventory Updated"}\' \'{"id":"InventoryService"}\'',
      },
    ],
  },
  {
    name: 'rmEvent',
    description: 'Removes an event by its path',
    category: 'Events',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the event, e.g. /InventoryAdjusted' }],
    examples: [{ description: 'Remove an event by path', command: 'npx @eventcatalog/cli rmEvent "/InventoryAdjusted"' }],
  },
  {
    name: 'rmEventById',
    description: 'Removes an event by its ID',
    category: 'Events',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the event to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [
      { description: 'Remove latest version', command: 'npx @eventcatalog/cli rmEventById "OrderCreated"' },
      { description: 'Remove specific version', command: 'npx @eventcatalog/cli rmEventById "OrderCreated" "1.0.0"' },
    ],
  },
  {
    name: 'versionEvent',
    description: 'Moves the current event to a versioned directory',
    category: 'Events',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the event to version' }],
    examples: [{ description: 'Version an event', command: 'npx @eventcatalog/cli versionEvent "OrderCreated"' }],
  },
  {
    name: 'addFileToEvent',
    description: 'Adds a file to an event',
    category: 'Events',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the event' },
      { name: 'file', type: 'json', required: true, description: 'File object: {content, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to add file to' },
    ],
    examples: [
      {
        description: 'Add a file to an event',
        command: 'npx @eventcatalog/cli addFileToEvent "OrderCreated" \'{"content":"# Schema","fileName":"schema.md"}\'',
      },
    ],
  },
  {
    name: 'addSchemaToEvent',
    description: 'Adds a schema file to an event',
    category: 'Events',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the event' },
      { name: 'schema', type: 'json', required: true, description: 'Schema object: {schema, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to add schema to' },
    ],
    examples: [
      {
        description: 'Add a JSON schema to an event',
        command:
          'npx @eventcatalog/cli addSchemaToEvent "OrderCreated" \'{"schema":"{\\"type\\":\\"object\\"}","fileName":"schema.json"}\'',
      },
    ],
  },
  {
    name: 'eventHasVersion',
    description: 'Checks if a specific version of an event exists',
    category: 'Events',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the event' },
      { name: 'version', type: 'string', required: true, description: 'Version to check (supports semver)' },
    ],
    examples: [
      { description: 'Check if version exists', command: 'npx @eventcatalog/cli eventHasVersion "OrderCreated" "1.0.0"' },
      { description: 'Check with semver range', command: 'npx @eventcatalog/cli eventHasVersion "OrderCreated" "1.0.x"' },
    ],
  },

  // ================================
  //            Commands
  // ================================
  {
    name: 'getCommand',
    description: 'Returns a command from EventCatalog by its ID',
    category: 'Commands',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the command to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve (supports semver)' },
    ],
    examples: [
      { description: 'Get the latest command', command: 'npx @eventcatalog/cli getCommand "CreateOrder"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getCommand "CreateOrder" "1.0.0"' },
    ],
  },
  {
    name: 'getCommands',
    description: 'Returns all commands from EventCatalog',
    category: 'Commands',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?, attachSchema?}' }],
    examples: [
      { description: 'Get all commands', command: 'npx @eventcatalog/cli getCommands' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getCommands \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeCommand',
    description: 'Writes a command to EventCatalog',
    category: 'Commands',
    args: [
      { name: 'command', type: 'json', required: true, description: 'Command object with id, name, version, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?, versionExistingContent?}' },
    ],
    examples: [
      {
        description: 'Write a new command',
        command:
          'npx @eventcatalog/cli writeCommand \'{"id":"CreateOrder","name":"Create Order","version":"1.0.0","markdown":"# Create Order"}\'',
      },
    ],
  },
  {
    name: 'writeCommandToService',
    description: 'Writes a command to a specific service',
    category: 'Commands',
    args: [
      { name: 'command', type: 'json', required: true, description: 'Command object' },
      { name: 'service', type: 'json', required: true, description: 'Service reference: {id, version?}' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, format?, override?}' },
    ],
    examples: [
      {
        description: 'Write command to a service',
        command:
          'npx @eventcatalog/cli writeCommandToService \'{"id":"UpdateInventory","name":"Update Inventory","version":"1.0.0","markdown":"# Update Inventory"}\' \'{"id":"InventoryService"}\'',
      },
    ],
  },
  {
    name: 'rmCommand',
    description: 'Removes a command by its path',
    category: 'Commands',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the command' }],
    examples: [{ description: 'Remove a command', command: 'npx @eventcatalog/cli rmCommand "/CreateOrder"' }],
  },
  {
    name: 'rmCommandById',
    description: 'Removes a command by its ID',
    category: 'Commands',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the command to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove a command', command: 'npx @eventcatalog/cli rmCommandById "CreateOrder"' }],
  },
  {
    name: 'versionCommand',
    description: 'Moves the current command to a versioned directory',
    category: 'Commands',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the command to version' }],
    examples: [{ description: 'Version a command', command: 'npx @eventcatalog/cli versionCommand "CreateOrder"' }],
  },
  {
    name: 'addFileToCommand',
    description: 'Adds a file to a command',
    category: 'Commands',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the command' },
      { name: 'file', type: 'json', required: true, description: 'File object: {content, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a file to a command',
        command: 'npx @eventcatalog/cli addFileToCommand "CreateOrder" \'{"content":"# Notes","fileName":"notes.md"}\'',
      },
    ],
  },
  {
    name: 'addSchemaToCommand',
    description: 'Adds a schema to a command',
    category: 'Commands',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the command' },
      { name: 'schema', type: 'json', required: true, description: 'Schema object: {schema, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a schema to a command',
        command:
          'npx @eventcatalog/cli addSchemaToCommand "CreateOrder" \'{"schema":"{\\"type\\":\\"object\\"}","fileName":"schema.json"}\'',
      },
    ],
  },
  {
    name: 'commandHasVersion',
    description: 'Checks if a specific version of a command exists',
    category: 'Commands',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the command' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [
      { description: 'Check if version exists', command: 'npx @eventcatalog/cli commandHasVersion "CreateOrder" "1.0.0"' },
    ],
  },

  // ================================
  //            Queries
  // ================================
  {
    name: 'getQuery',
    description: 'Returns a query from EventCatalog by its ID',
    category: 'Queries',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the query to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve' },
    ],
    examples: [
      { description: 'Get the latest query', command: 'npx @eventcatalog/cli getQuery "GetOrder"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getQuery "GetOrder" "1.0.0"' },
    ],
  },
  {
    name: 'getQueries',
    description: 'Returns all queries from EventCatalog',
    category: 'Queries',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?, attachSchema?}' }],
    examples: [
      { description: 'Get all queries', command: 'npx @eventcatalog/cli getQueries' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getQueries \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeQuery',
    description: 'Writes a query to EventCatalog',
    category: 'Queries',
    args: [
      { name: 'query', type: 'json', required: true, description: 'Query object with id, name, version, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?, versionExistingContent?}' },
    ],
    examples: [
      {
        description: 'Write a new query',
        command:
          'npx @eventcatalog/cli writeQuery \'{"id":"GetOrder","name":"Get Order","version":"1.0.0","markdown":"# Get Order"}\'',
      },
    ],
  },
  {
    name: 'writeQueryToService',
    description: 'Writes a query to a specific service',
    category: 'Queries',
    args: [
      { name: 'query', type: 'json', required: true, description: 'Query object' },
      { name: 'service', type: 'json', required: true, description: 'Service reference: {id, version?}' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, format?, override?}' },
    ],
    examples: [
      {
        description: 'Write query to a service',
        command:
          'npx @eventcatalog/cli writeQueryToService \'{"id":"GetInventory","name":"Get Inventory","version":"1.0.0","markdown":"# Get Inventory"}\' \'{"id":"InventoryService"}\'',
      },
    ],
  },
  {
    name: 'rmQuery',
    description: 'Removes a query by its path',
    category: 'Queries',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the query' }],
    examples: [{ description: 'Remove a query', command: 'npx @eventcatalog/cli rmQuery "/GetOrder"' }],
  },
  {
    name: 'rmQueryById',
    description: 'Removes a query by its ID',
    category: 'Queries',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the query to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove a query', command: 'npx @eventcatalog/cli rmQueryById "GetOrder"' }],
  },
  {
    name: 'versionQuery',
    description: 'Moves the current query to a versioned directory',
    category: 'Queries',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the query to version' }],
    examples: [{ description: 'Version a query', command: 'npx @eventcatalog/cli versionQuery "GetOrder"' }],
  },
  {
    name: 'addFileToQuery',
    description: 'Adds a file to a query',
    category: 'Queries',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the query' },
      { name: 'file', type: 'json', required: true, description: 'File object: {content, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a file to a query',
        command: 'npx @eventcatalog/cli addFileToQuery "GetOrder" \'{"content":"# Notes","fileName":"notes.md"}\'',
      },
    ],
  },
  {
    name: 'addSchemaToQuery',
    description: 'Adds a schema to a query',
    category: 'Queries',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the query' },
      { name: 'schema', type: 'json', required: true, description: 'Schema object: {schema, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a schema to a query',
        command:
          'npx @eventcatalog/cli addSchemaToQuery "GetOrder" \'{"schema":"{\\"type\\":\\"object\\"}","fileName":"schema.json"}\'',
      },
    ],
  },
  {
    name: 'queryHasVersion',
    description: 'Checks if a specific version of a query exists',
    category: 'Queries',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the query' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [{ description: 'Check if version exists', command: 'npx @eventcatalog/cli queryHasVersion "GetOrder" "1.0.0"' }],
  },

  // ================================
  //            Services
  // ================================
  {
    name: 'getService',
    description: 'Returns a service from EventCatalog by its ID',
    category: 'Services',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the service to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve' },
    ],
    examples: [
      { description: 'Get the latest service', command: 'npx @eventcatalog/cli getService "OrderService"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getService "OrderService" "1.0.0"' },
    ],
  },
  {
    name: 'getServices',
    description: 'Returns all services from EventCatalog',
    category: 'Services',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?}' }],
    examples: [
      { description: 'Get all services', command: 'npx @eventcatalog/cli getServices' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getServices \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeService',
    description: 'Writes a service to EventCatalog',
    category: 'Services',
    args: [
      { name: 'service', type: 'json', required: true, description: 'Service object with id, name, version, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?, versionExistingContent?}' },
    ],
    examples: [
      {
        description: 'Write a new service',
        command:
          'npx @eventcatalog/cli writeService \'{"id":"OrderService","name":"Order Service","version":"1.0.0","markdown":"# Order Service"}\'',
      },
    ],
  },
  {
    name: 'writeServiceToDomain',
    description: 'Writes a service to a specific domain',
    category: 'Services',
    args: [
      { name: 'service', type: 'json', required: true, description: 'Service object' },
      { name: 'domain', type: 'json', required: true, description: 'Domain reference: {id, version?}' },
      { name: 'options', type: 'json', required: false, description: 'Options' },
    ],
    examples: [
      {
        description: 'Write service to a domain',
        command:
          'npx @eventcatalog/cli writeServiceToDomain \'{"id":"PaymentService","name":"Payment Service","version":"1.0.0","markdown":"# Payment Service"}\' \'{"id":"Payments"}\'',
      },
    ],
  },
  {
    name: 'rmService',
    description: 'Removes a service by its path',
    category: 'Services',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the service' }],
    examples: [{ description: 'Remove a service', command: 'npx @eventcatalog/cli rmService "/OrderService"' }],
  },
  {
    name: 'rmServiceById',
    description: 'Removes a service by its ID',
    category: 'Services',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the service to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove a service', command: 'npx @eventcatalog/cli rmServiceById "OrderService"' }],
  },
  {
    name: 'versionService',
    description: 'Moves the current service to a versioned directory',
    category: 'Services',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the service to version' }],
    examples: [{ description: 'Version a service', command: 'npx @eventcatalog/cli versionService "OrderService"' }],
  },
  {
    name: 'addFileToService',
    description: 'Adds a file to a service',
    category: 'Services',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the service' },
      { name: 'file', type: 'json', required: true, description: 'File object: {content, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a file to a service',
        command: 'npx @eventcatalog/cli addFileToService "OrderService" \'{"content":"# API Docs","fileName":"api.md"}\'',
      },
    ],
  },
  {
    name: 'addEventToService',
    description: 'Adds an event relationship to a service',
    category: 'Services',
    args: [
      { name: 'serviceId', type: 'string', required: true, description: 'The ID of the service' },
      { name: 'direction', type: 'string', required: true, description: 'Direction: "sends" or "receives"' },
      { name: 'event', type: 'json', required: true, description: 'Event reference: {id, version}' },
      { name: 'serviceVersion', type: 'string', required: false, description: 'Specific service version' },
    ],
    examples: [
      {
        description: 'Add event that service sends',
        command: 'npx @eventcatalog/cli addEventToService "OrderService" "sends" \'{"id":"OrderCreated","version":"1.0.0"}\'',
      },
      {
        description: 'Add event that service receives',
        command:
          'npx @eventcatalog/cli addEventToService "OrderService" "receives" \'{"id":"PaymentCompleted","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addCommandToService',
    description: 'Adds a command relationship to a service',
    category: 'Services',
    args: [
      { name: 'serviceId', type: 'string', required: true, description: 'The ID of the service' },
      { name: 'direction', type: 'string', required: true, description: 'Direction: "sends" or "receives"' },
      { name: 'command', type: 'json', required: true, description: 'Command reference: {id, version}' },
      { name: 'serviceVersion', type: 'string', required: false, description: 'Specific service version' },
    ],
    examples: [
      {
        description: 'Add command that service sends',
        command: 'npx @eventcatalog/cli addCommandToService "OrderService" "sends" \'{"id":"ProcessPayment","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addQueryToService',
    description: 'Adds a query relationship to a service',
    category: 'Services',
    args: [
      { name: 'serviceId', type: 'string', required: true, description: 'The ID of the service' },
      { name: 'direction', type: 'string', required: true, description: 'Direction: "sends" or "receives"' },
      { name: 'query', type: 'json', required: true, description: 'Query reference: {id, version}' },
      { name: 'serviceVersion', type: 'string', required: false, description: 'Specific service version' },
    ],
    examples: [
      {
        description: 'Add query that service sends',
        command: 'npx @eventcatalog/cli addQueryToService "OrderService" "sends" \'{"id":"GetInventory","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addEntityToService',
    description: 'Adds an entity to a service',
    category: 'Services',
    args: [
      { name: 'serviceId', type: 'string', required: true, description: 'The ID of the service' },
      { name: 'entity', type: 'json', required: true, description: 'Entity reference: {id, version}' },
      { name: 'serviceVersion', type: 'string', required: false, description: 'Specific service version' },
    ],
    examples: [
      {
        description: 'Add entity to a service',
        command: 'npx @eventcatalog/cli addEntityToService "OrderService" \'{"id":"Order","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addDataStoreToService',
    description: 'Adds a data store relationship to a service',
    category: 'Services',
    args: [
      { name: 'serviceId', type: 'string', required: true, description: 'The ID of the service' },
      { name: 'relationship', type: 'string', required: true, description: 'Relationship: "writesTo" or "readsFrom"' },
      { name: 'dataStore', type: 'json', required: true, description: 'Data store reference: {id, version}' },
      { name: 'serviceVersion', type: 'string', required: false, description: 'Specific service version' },
    ],
    examples: [
      {
        description: 'Add data store that service writes to',
        command: 'npx @eventcatalog/cli addDataStoreToService "OrderService" "writesTo" \'{"id":"orders-db","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'serviceHasVersion',
    description: 'Checks if a specific version of a service exists',
    category: 'Services',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the service' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [
      { description: 'Check if version exists', command: 'npx @eventcatalog/cli serviceHasVersion "OrderService" "1.0.0"' },
    ],
  },
  {
    name: 'getSpecificationFilesForService',
    description: 'Returns specification files (OpenAPI, AsyncAPI) for a service',
    category: 'Services',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the service' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      { description: 'Get spec files', command: 'npx @eventcatalog/cli getSpecificationFilesForService "OrderService"' },
    ],
  },

  // ================================
  //            Domains
  // ================================
  {
    name: 'getDomain',
    description: 'Returns a domain from EventCatalog by its ID',
    category: 'Domains',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the domain to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve' },
    ],
    examples: [
      { description: 'Get the latest domain', command: 'npx @eventcatalog/cli getDomain "Orders"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getDomain "Orders" "1.0.0"' },
    ],
  },
  {
    name: 'getDomains',
    description: 'Returns all domains from EventCatalog',
    category: 'Domains',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?}' }],
    examples: [
      { description: 'Get all domains', command: 'npx @eventcatalog/cli getDomains' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getDomains \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeDomain',
    description: 'Writes a domain to EventCatalog',
    category: 'Domains',
    args: [
      { name: 'domain', type: 'json', required: true, description: 'Domain object with id, name, version, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?, versionExistingContent?}' },
    ],
    examples: [
      {
        description: 'Write a new domain',
        command:
          'npx @eventcatalog/cli writeDomain \'{"id":"Orders","name":"Orders Domain","version":"1.0.0","markdown":"# Orders Domain"}\'',
      },
    ],
  },
  {
    name: 'rmDomain',
    description: 'Removes a domain by its path',
    category: 'Domains',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the domain' }],
    examples: [{ description: 'Remove a domain', command: 'npx @eventcatalog/cli rmDomain "/Orders"' }],
  },
  {
    name: 'rmDomainById',
    description: 'Removes a domain by its ID',
    category: 'Domains',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the domain to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove a domain', command: 'npx @eventcatalog/cli rmDomainById "Orders"' }],
  },
  {
    name: 'versionDomain',
    description: 'Moves the current domain to a versioned directory',
    category: 'Domains',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the domain to version' }],
    examples: [{ description: 'Version a domain', command: 'npx @eventcatalog/cli versionDomain "Orders"' }],
  },
  {
    name: 'addFileToDomain',
    description: 'Adds a file to a domain',
    category: 'Domains',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'file', type: 'json', required: true, description: 'File object: {content, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a file to a domain',
        command: 'npx @eventcatalog/cli addFileToDomain "Orders" \'{"content":"# Overview","fileName":"overview.md"}\'',
      },
    ],
  },
  {
    name: 'addServiceToDomain',
    description: 'Adds a service to a domain',
    category: 'Domains',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'service', type: 'json', required: true, description: 'Service reference: {id, version}' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      {
        description: 'Add service to domain',
        command: 'npx @eventcatalog/cli addServiceToDomain "Orders" \'{"id":"OrderService","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addSubDomainToDomain',
    description: 'Adds a subdomain to a domain',
    category: 'Domains',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the parent domain' },
      { name: 'subDomain', type: 'json', required: true, description: 'Subdomain reference: {id, version}' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      {
        description: 'Add subdomain',
        command: 'npx @eventcatalog/cli addSubDomainToDomain "Orders" \'{"id":"Fulfillment","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addEntityToDomain',
    description: 'Adds an entity to a domain',
    category: 'Domains',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'entity', type: 'json', required: true, description: 'Entity reference: {id, version}' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      {
        description: 'Add entity to domain',
        command: 'npx @eventcatalog/cli addEntityToDomain "Orders" \'{"id":"Order","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addEventToDomain',
    description: 'Adds an event relationship to a domain',
    category: 'Domains',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'direction', type: 'string', required: true, description: 'Direction: "sends" or "receives"' },
      { name: 'event', type: 'json', required: true, description: 'Event reference: {id, version}' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      {
        description: 'Add event that domain sends',
        command: 'npx @eventcatalog/cli addEventToDomain "Orders" "sends" \'{"id":"OrderCreated","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addCommandToDomain',
    description: 'Adds a command relationship to a domain',
    category: 'Domains',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'direction', type: 'string', required: true, description: 'Direction: "sends" or "receives"' },
      { name: 'command', type: 'json', required: true, description: 'Command reference: {id, version}' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      {
        description: 'Add command that domain sends',
        command: 'npx @eventcatalog/cli addCommandToDomain "Orders" "sends" \'{"id":"ProcessOrder","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addQueryToDomain',
    description: 'Adds a query relationship to a domain',
    category: 'Domains',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'direction', type: 'string', required: true, description: 'Direction: "sends" or "receives"' },
      { name: 'query', type: 'json', required: true, description: 'Query reference: {id, version}' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      {
        description: 'Add query that domain sends',
        command: 'npx @eventcatalog/cli addQueryToDomain "Orders" "sends" \'{"id":"GetOrderStatus","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addUbiquitousLanguageToDomain',
    description: 'Adds ubiquitous language definitions to a domain',
    category: 'Domains',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'dictionary', type: 'json', required: true, description: 'Array of {term, definition} objects' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      {
        description: 'Add ubiquitous language',
        command:
          'npx @eventcatalog/cli addUbiquitousLanguageToDomain "Orders" \'[{"term":"Order","definition":"A customer purchase request"}]\'',
      },
    ],
  },
  {
    name: 'getUbiquitousLanguageFromDomain',
    description: 'Gets ubiquitous language definitions from a domain',
    category: 'Domains',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      { description: 'Get ubiquitous language', command: 'npx @eventcatalog/cli getUbiquitousLanguageFromDomain "Orders"' },
    ],
  },
  {
    name: 'domainHasVersion',
    description: 'Checks if a specific version of a domain exists',
    category: 'Domains',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [{ description: 'Check if version exists', command: 'npx @eventcatalog/cli domainHasVersion "Orders" "1.0.0"' }],
  },

  // ================================
  //            Channels
  // ================================
  {
    name: 'getChannel',
    description: 'Returns a channel from EventCatalog by its ID',
    category: 'Channels',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the channel to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve' },
    ],
    examples: [
      { description: 'Get the latest channel', command: 'npx @eventcatalog/cli getChannel "orders.events"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getChannel "orders.events" "1.0.0"' },
    ],
  },
  {
    name: 'getChannels',
    description: 'Returns all channels from EventCatalog',
    category: 'Channels',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?}' }],
    examples: [
      { description: 'Get all channels', command: 'npx @eventcatalog/cli getChannels' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getChannels \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeChannel',
    description: 'Writes a channel to EventCatalog',
    category: 'Channels',
    args: [
      { name: 'channel', type: 'json', required: true, description: 'Channel object with id, name, version, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?}' },
    ],
    examples: [
      {
        description: 'Write a new channel',
        command:
          'npx @eventcatalog/cli writeChannel \'{"id":"orders.events","name":"Orders Events","version":"1.0.0","markdown":"# Orders Events Channel"}\'',
      },
    ],
  },
  {
    name: 'rmChannel',
    description: 'Removes a channel by its path',
    category: 'Channels',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the channel' }],
    examples: [{ description: 'Remove a channel', command: 'npx @eventcatalog/cli rmChannel "/orders.events"' }],
  },
  {
    name: 'rmChannelById',
    description: 'Removes a channel by its ID',
    category: 'Channels',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the channel to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove a channel', command: 'npx @eventcatalog/cli rmChannelById "orders.events"' }],
  },
  {
    name: 'versionChannel',
    description: 'Moves the current channel to a versioned directory',
    category: 'Channels',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the channel to version' }],
    examples: [{ description: 'Version a channel', command: 'npx @eventcatalog/cli versionChannel "orders.events"' }],
  },
  {
    name: 'addEventToChannel',
    description: 'Adds an event to a channel',
    category: 'Channels',
    args: [
      { name: 'channelId', type: 'string', required: true, description: 'The ID of the channel' },
      { name: 'event', type: 'json', required: true, description: 'Event reference: {id, version, parameters?}' },
    ],
    examples: [
      {
        description: 'Add event to channel',
        command: 'npx @eventcatalog/cli addEventToChannel "orders.events" \'{"id":"OrderCreated","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addCommandToChannel',
    description: 'Adds a command to a channel',
    category: 'Channels',
    args: [
      { name: 'channelId', type: 'string', required: true, description: 'The ID of the channel' },
      { name: 'command', type: 'json', required: true, description: 'Command reference: {id, version, parameters?}' },
    ],
    examples: [
      {
        description: 'Add command to channel',
        command: 'npx @eventcatalog/cli addCommandToChannel "orders.commands" \'{"id":"CreateOrder","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'addQueryToChannel',
    description: 'Adds a query to a channel',
    category: 'Channels',
    args: [
      { name: 'channelId', type: 'string', required: true, description: 'The ID of the channel' },
      { name: 'query', type: 'json', required: true, description: 'Query reference: {id, version, parameters?}' },
    ],
    examples: [
      {
        description: 'Add query to channel',
        command: 'npx @eventcatalog/cli addQueryToChannel "orders.queries" \'{"id":"GetOrder","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'channelHasVersion',
    description: 'Checks if a specific version of a channel exists',
    category: 'Channels',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the channel' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [
      { description: 'Check if version exists', command: 'npx @eventcatalog/cli channelHasVersion "orders.events" "1.0.0"' },
    ],
  },

  // ================================
  //            Teams
  // ================================
  {
    name: 'getTeam',
    description: 'Returns a team from EventCatalog by its ID',
    category: 'Teams',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the team to retrieve' }],
    examples: [{ description: 'Get a team', command: 'npx @eventcatalog/cli getTeam "platform-team"' }],
  },
  {
    name: 'getTeams',
    description: 'Returns all teams from EventCatalog',
    category: 'Teams',
    args: [],
    examples: [{ description: 'Get all teams', command: 'npx @eventcatalog/cli getTeams' }],
  },
  {
    name: 'writeTeam',
    description: 'Writes a team to EventCatalog',
    category: 'Teams',
    args: [
      { name: 'team', type: 'json', required: true, description: 'Team object with id, name, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?}' },
    ],
    examples: [
      {
        description: 'Write a new team',
        command: 'npx @eventcatalog/cli writeTeam \'{"id":"platform-team","name":"Platform Team","markdown":"# Platform Team"}\'',
      },
    ],
  },
  {
    name: 'rmTeamById',
    description: 'Removes a team by its ID',
    category: 'Teams',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the team to remove' }],
    examples: [{ description: 'Remove a team', command: 'npx @eventcatalog/cli rmTeamById "platform-team"' }],
  },

  // ================================
  //            Users
  // ================================
  {
    name: 'getUser',
    description: 'Returns a user from EventCatalog by their ID',
    category: 'Users',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the user to retrieve' }],
    examples: [{ description: 'Get a user', command: 'npx @eventcatalog/cli getUser "jsmith"' }],
  },
  {
    name: 'getUsers',
    description: 'Returns all users from EventCatalog',
    category: 'Users',
    args: [],
    examples: [{ description: 'Get all users', command: 'npx @eventcatalog/cli getUsers' }],
  },
  {
    name: 'writeUser',
    description: 'Writes a user to EventCatalog',
    category: 'Users',
    args: [
      { name: 'user', type: 'json', required: true, description: 'User object with id, name, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?}' },
    ],
    examples: [
      {
        description: 'Write a new user',
        command: 'npx @eventcatalog/cli writeUser \'{"id":"jsmith","name":"John Smith","markdown":"# John Smith"}\'',
      },
    ],
  },
  {
    name: 'rmUserById',
    description: 'Removes a user by their ID',
    category: 'Users',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the user to remove' }],
    examples: [{ description: 'Remove a user', command: 'npx @eventcatalog/cli rmUserById "jsmith"' }],
  },

  // ================================
  //            Custom Docs
  // ================================
  {
    name: 'getCustomDoc',
    description: 'Returns a custom doc from EventCatalog by its path',
    category: 'Custom Docs',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the custom doc' }],
    examples: [{ description: 'Get a custom doc', command: 'npx @eventcatalog/cli getCustomDoc "/getting-started"' }],
  },
  {
    name: 'getCustomDocs',
    description: 'Returns all custom docs from EventCatalog',
    category: 'Custom Docs',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {path?}' }],
    examples: [
      { description: 'Get all custom docs', command: 'npx @eventcatalog/cli getCustomDocs' },
      { description: 'Get docs from a path', command: 'npx @eventcatalog/cli getCustomDocs \'{"path":"/guides"}\'' },
    ],
  },
  {
    name: 'writeCustomDoc',
    description: 'Writes a custom doc to EventCatalog',
    category: 'Custom Docs',
    args: [
      { name: 'customDoc', type: 'json', required: true, description: 'Custom doc object with id, title, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?}' },
    ],
    examples: [
      {
        description: 'Write a custom doc',
        command:
          'npx @eventcatalog/cli writeCustomDoc \'{"id":"getting-started","title":"Getting Started","markdown":"# Getting Started"}\'',
      },
    ],
  },
  {
    name: 'rmCustomDoc',
    description: 'Removes a custom doc by its path',
    category: 'Custom Docs',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the custom doc to remove' }],
    examples: [{ description: 'Remove a custom doc', command: 'npx @eventcatalog/cli rmCustomDoc "/getting-started"' }],
  },

  // ================================
  //            Entities
  // ================================
  {
    name: 'getEntity',
    description: 'Returns an entity from EventCatalog by its ID',
    category: 'Entities',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the entity to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve' },
    ],
    examples: [
      { description: 'Get the latest entity', command: 'npx @eventcatalog/cli getEntity "Order"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getEntity "Order" "1.0.0"' },
    ],
  },
  {
    name: 'getEntities',
    description: 'Returns all entities from EventCatalog',
    category: 'Entities',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?}' }],
    examples: [
      { description: 'Get all entities', command: 'npx @eventcatalog/cli getEntities' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getEntities \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeEntity',
    description: 'Writes an entity to EventCatalog',
    category: 'Entities',
    args: [
      { name: 'entity', type: 'json', required: true, description: 'Entity object with id, name, version, and markdown' },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?, versionExistingContent?}' },
    ],
    examples: [
      {
        description: 'Write a new entity',
        command:
          'npx @eventcatalog/cli writeEntity \'{"id":"Order","name":"Order","version":"1.0.0","markdown":"# Order Entity"}\'',
      },
    ],
  },
  {
    name: 'rmEntity',
    description: 'Removes an entity by its path',
    category: 'Entities',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the entity' }],
    examples: [{ description: 'Remove an entity', command: 'npx @eventcatalog/cli rmEntity "/Order"' }],
  },
  {
    name: 'rmEntityById',
    description: 'Removes an entity by its ID',
    category: 'Entities',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the entity to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove an entity', command: 'npx @eventcatalog/cli rmEntityById "Order"' }],
  },
  {
    name: 'versionEntity',
    description: 'Moves the current entity to a versioned directory',
    category: 'Entities',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the entity to version' }],
    examples: [{ description: 'Version an entity', command: 'npx @eventcatalog/cli versionEntity "Order"' }],
  },
  {
    name: 'entityHasVersion',
    description: 'Checks if a specific version of an entity exists',
    category: 'Entities',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the entity' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [{ description: 'Check if version exists', command: 'npx @eventcatalog/cli entityHasVersion "Order" "1.0.0"' }],
  },

  // ================================
  //            Data Stores
  // ================================
  {
    name: 'getDataStore',
    description: 'Returns a data store from EventCatalog by its ID',
    category: 'Data Stores',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the data store to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve' },
    ],
    examples: [
      { description: 'Get the latest data store', command: 'npx @eventcatalog/cli getDataStore "orders-db"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getDataStore "orders-db" "1.0.0"' },
    ],
  },
  {
    name: 'getDataStores',
    description: 'Returns all data stores from EventCatalog',
    category: 'Data Stores',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?}' }],
    examples: [
      { description: 'Get all data stores', command: 'npx @eventcatalog/cli getDataStores' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getDataStores \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeDataStore',
    description: 'Writes a data store to EventCatalog',
    category: 'Data Stores',
    args: [
      {
        name: 'dataStore',
        type: 'json',
        required: true,
        description: 'Data store object with id, name, version, and markdown',
      },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?, versionExistingContent?}' },
    ],
    examples: [
      {
        description: 'Write a new data store',
        command:
          'npx @eventcatalog/cli writeDataStore \'{"id":"orders-db","name":"Orders Database","version":"1.0.0","markdown":"# Orders Database"}\'',
      },
    ],
  },
  {
    name: 'writeDataStoreToService',
    description: 'Writes a data store to a specific service',
    category: 'Data Stores',
    args: [
      { name: 'dataStore', type: 'json', required: true, description: 'Data store object' },
      { name: 'service', type: 'json', required: true, description: 'Service reference: {id, version?}' },
    ],
    examples: [
      {
        description: 'Write data store to a service',
        command:
          'npx @eventcatalog/cli writeDataStoreToService \'{"id":"orders-db","name":"Orders Database","version":"1.0.0","markdown":"# Orders DB"}\' \'{"id":"OrderService"}\'',
      },
    ],
  },
  {
    name: 'rmDataStore',
    description: 'Removes a data store by its path',
    category: 'Data Stores',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the data store' }],
    examples: [{ description: 'Remove a data store', command: 'npx @eventcatalog/cli rmDataStore "/orders-db"' }],
  },
  {
    name: 'rmDataStoreById',
    description: 'Removes a data store by its ID',
    category: 'Data Stores',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the data store to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove a data store', command: 'npx @eventcatalog/cli rmDataStoreById "orders-db"' }],
  },
  {
    name: 'versionDataStore',
    description: 'Moves the current data store to a versioned directory',
    category: 'Data Stores',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the data store to version' }],
    examples: [{ description: 'Version a data store', command: 'npx @eventcatalog/cli versionDataStore "orders-db"' }],
  },
  {
    name: 'addFileToDataStore',
    description: 'Adds a file to a data store',
    category: 'Data Stores',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the data store' },
      { name: 'file', type: 'json', required: true, description: 'File object: {content, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a file to a data store',
        command: 'npx @eventcatalog/cli addFileToDataStore "orders-db" \'{"content":"# Schema","fileName":"schema.md"}\'',
      },
    ],
  },
  {
    name: 'dataStoreHasVersion',
    description: 'Checks if a specific version of a data store exists',
    category: 'Data Stores',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the data store' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [
      { description: 'Check if version exists', command: 'npx @eventcatalog/cli dataStoreHasVersion "orders-db" "1.0.0"' },
    ],
  },

  // ================================
  //            Data Products
  // ================================
  {
    name: 'getDataProduct',
    description: 'Returns a data product from EventCatalog by its ID',
    category: 'Data Products',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the data product to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve' },
    ],
    examples: [
      { description: 'Get the latest data product', command: 'npx @eventcatalog/cli getDataProduct "customer-360"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getDataProduct "customer-360" "1.0.0"' },
    ],
  },
  {
    name: 'getDataProducts',
    description: 'Returns all data products from EventCatalog',
    category: 'Data Products',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?}' }],
    examples: [
      { description: 'Get all data products', command: 'npx @eventcatalog/cli getDataProducts' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getDataProducts \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeDataProduct',
    description: 'Writes a data product to EventCatalog',
    category: 'Data Products',
    args: [
      {
        name: 'dataProduct',
        type: 'json',
        required: true,
        description: 'Data product object with id, name, version, and markdown',
      },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?, versionExistingContent?}' },
    ],
    examples: [
      {
        description: 'Write a new data product',
        command:
          'npx @eventcatalog/cli writeDataProduct \'{"id":"customer-360","name":"Customer 360","version":"1.0.0","markdown":"# Customer 360"}\'',
      },
    ],
  },
  {
    name: 'writeDataProductToDomain',
    description: 'Writes a data product to a specific domain',
    category: 'Data Products',
    args: [
      { name: 'dataProduct', type: 'json', required: true, description: 'Data product object' },
      { name: 'domain', type: 'json', required: true, description: 'Domain reference: {id, version?}' },
      { name: 'options', type: 'json', required: false, description: 'Options' },
    ],
    examples: [
      {
        description: 'Write data product to a domain',
        command:
          'npx @eventcatalog/cli writeDataProductToDomain \'{"id":"customer-360","name":"Customer 360","version":"1.0.0","markdown":"# Customer 360"}\' \'{"id":"Analytics"}\'',
      },
    ],
  },
  {
    name: 'rmDataProduct',
    description: 'Removes a data product by its path',
    category: 'Data Products',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the data product' }],
    examples: [{ description: 'Remove a data product', command: 'npx @eventcatalog/cli rmDataProduct "/customer-360"' }],
  },
  {
    name: 'rmDataProductById',
    description: 'Removes a data product by its ID',
    category: 'Data Products',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the data product to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove a data product', command: 'npx @eventcatalog/cli rmDataProductById "customer-360"' }],
  },
  {
    name: 'versionDataProduct',
    description: 'Moves the current data product to a versioned directory',
    category: 'Data Products',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the data product to version' }],
    examples: [{ description: 'Version a data product', command: 'npx @eventcatalog/cli versionDataProduct "customer-360"' }],
  },
  {
    name: 'addFileToDataProduct',
    description: 'Adds a file to a data product',
    category: 'Data Products',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the data product' },
      { name: 'file', type: 'json', required: true, description: 'File object: {content, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a file to a data product',
        command: 'npx @eventcatalog/cli addFileToDataProduct "customer-360" \'{"content":"# Schema","fileName":"schema.md"}\'',
      },
    ],
  },
  {
    name: 'addDataProductToDomain',
    description: 'Adds a data product reference to a domain',
    category: 'Data Products',
    args: [
      { name: 'domainId', type: 'string', required: true, description: 'The ID of the domain' },
      { name: 'dataProduct', type: 'json', required: true, description: 'Data product reference: {id, version}' },
      { name: 'domainVersion', type: 'string', required: false, description: 'Specific domain version' },
    ],
    examples: [
      {
        description: 'Add data product to domain',
        command: 'npx @eventcatalog/cli addDataProductToDomain "Analytics" \'{"id":"customer-360","version":"1.0.0"}\'',
      },
    ],
  },
  {
    name: 'dataProductHasVersion',
    description: 'Checks if a specific version of a data product exists',
    category: 'Data Products',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the data product' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [
      {
        description: 'Check if version exists',
        command: 'npx @eventcatalog/cli dataProductHasVersion "customer-360" "1.0.0"',
      },
    ],
  },

  // ================================
  //            Diagrams
  // ================================
  {
    name: 'getDiagram',
    description: 'Returns a diagram from EventCatalog by its ID',
    category: 'Diagrams',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the diagram to retrieve' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to retrieve' },
    ],
    examples: [
      { description: 'Get the latest diagram', command: 'npx @eventcatalog/cli getDiagram "ArchitectureDiagram"' },
      { description: 'Get a specific version', command: 'npx @eventcatalog/cli getDiagram "ArchitectureDiagram" "1.0.0"' },
    ],
  },
  {
    name: 'getDiagrams',
    description: 'Returns all diagrams from EventCatalog',
    category: 'Diagrams',
    args: [{ name: 'options', type: 'json', required: false, description: 'Options: {latestOnly?}' }],
    examples: [
      { description: 'Get all diagrams', command: 'npx @eventcatalog/cli getDiagrams' },
      { description: 'Get only latest versions', command: 'npx @eventcatalog/cli getDiagrams \'{"latestOnly":true}\'' },
    ],
  },
  {
    name: 'writeDiagram',
    description: 'Writes a diagram to EventCatalog',
    category: 'Diagrams',
    args: [
      {
        name: 'diagram',
        type: 'json',
        required: true,
        description: 'Diagram object with id, name, version, and markdown',
      },
      { name: 'options', type: 'json', required: false, description: 'Options: {path?, override?, versionExistingContent?}' },
    ],
    examples: [
      {
        description: 'Write a new diagram',
        command:
          'npx @eventcatalog/cli writeDiagram \'{"id":"ArchitectureDiagram","name":"Architecture Diagram","version":"1.0.0","markdown":"# Architecture Diagram"}\'',
      },
    ],
  },
  {
    name: 'rmDiagram',
    description: 'Removes a diagram by its path',
    category: 'Diagrams',
    args: [{ name: 'path', type: 'string', required: true, description: 'Path to the diagram' }],
    examples: [{ description: 'Remove a diagram', command: 'npx @eventcatalog/cli rmDiagram "/ArchitectureDiagram"' }],
  },
  {
    name: 'rmDiagramById',
    description: 'Removes a diagram by its ID',
    category: 'Diagrams',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the diagram to remove' },
      { name: 'version', type: 'string', required: false, description: 'Specific version to remove' },
    ],
    examples: [{ description: 'Remove a diagram', command: 'npx @eventcatalog/cli rmDiagramById "ArchitectureDiagram"' }],
  },
  {
    name: 'versionDiagram',
    description: 'Moves the current diagram to a versioned directory',
    category: 'Diagrams',
    args: [{ name: 'id', type: 'string', required: true, description: 'The ID of the diagram to version' }],
    examples: [{ description: 'Version a diagram', command: 'npx @eventcatalog/cli versionDiagram "ArchitectureDiagram"' }],
  },
  {
    name: 'addFileToDiagram',
    description: 'Adds a file to a diagram',
    category: 'Diagrams',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the diagram' },
      { name: 'file', type: 'json', required: true, description: 'File object: {content, fileName}' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Add a file to a diagram',
        command: 'npx @eventcatalog/cli addFileToDiagram "ArchitectureDiagram" \'{"content":"...","fileName":"diagram.png"}\'',
      },
    ],
  },
  {
    name: 'diagramHasVersion',
    description: 'Checks if a specific version of a diagram exists',
    category: 'Diagrams',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the diagram' },
      { name: 'version', type: 'string', required: true, description: 'Version to check' },
    ],
    examples: [
      {
        description: 'Check if version exists',
        command: 'npx @eventcatalog/cli diagramHasVersion "ArchitectureDiagram" "1.0.0"',
      },
    ],
  },

  // ================================
  //            Messages
  // ================================
  {
    name: 'getProducersAndConsumersForMessage',
    description: 'Returns the producers and consumers (services) for a given message',
    category: 'Messages',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the message' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      {
        description: 'Get producers and consumers',
        command: 'npx @eventcatalog/cli getProducersAndConsumersForMessage "OrderCreated"',
      },
    ],
  },
  {
    name: 'getConsumersOfSchema',
    description: 'Returns services that consume a given schema',
    category: 'Messages',
    args: [{ name: 'schemaPath', type: 'string', required: true, description: 'Path to the schema file' }],
    examples: [
      {
        description: 'Get consumers of a schema',
        command: 'npx @eventcatalog/cli getConsumersOfSchema "events/OrderCreated/schema.json"',
      },
    ],
  },
  {
    name: 'getProducersOfSchema',
    description: 'Returns services that produce a given schema',
    category: 'Messages',
    args: [{ name: 'schemaPath', type: 'string', required: true, description: 'Path to the schema file' }],
    examples: [
      {
        description: 'Get producers of a schema',
        command: 'npx @eventcatalog/cli getProducersOfSchema "events/OrderCreated/schema.json"',
      },
    ],
  },
  {
    name: 'getOwnersForResource',
    description: 'Returns the owners (users/teams) for a given resource',
    category: 'Messages',
    args: [
      { name: 'id', type: 'string', required: true, description: 'The ID of the resource' },
      { name: 'version', type: 'string', required: false, description: 'Specific version' },
    ],
    examples: [
      { description: 'Get owners for a resource', command: 'npx @eventcatalog/cli getOwnersForResource "OrderService"' },
    ],
  },

  // ================================
  //            Utilities
  // ================================
  {
    name: 'dumpCatalog',
    description: 'Dumps the entire catalog to a JSON structure',
    category: 'Utilities',
    args: [],
    examples: [
      { description: 'Dump entire catalog', command: 'npx @eventcatalog/cli dumpCatalog' },
      { description: 'Dump and save to file', command: 'npx @eventcatalog/cli dumpCatalog > catalog.json' },
    ],
  },
  {
    name: 'getEventCatalogConfigurationFile',
    description: 'Returns the EventCatalog configuration file',
    category: 'Utilities',
    args: [],
    examples: [{ description: 'Get config file', command: 'npx @eventcatalog/cli getEventCatalogConfigurationFile' }],
  },
];

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return [...new Set(cliFunctions.map((fn) => fn.category))];
}

/**
 * Get functions by category
 */
export function getFunctionsByCategory(category: string): CLIFunctionDoc[] {
  return cliFunctions.filter((fn) => fn.category === category);
}

/**
 * Get a function by name
 */
export function getFunction(name: string): CLIFunctionDoc | undefined {
  return cliFunctions.find((fn) => fn.name === name);
}
