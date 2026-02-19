import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('stubs');
setup();

describe('import message stubs', () => {
  it('creates stub events for sends references without inline body', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service UserService {
  version 1.0.0
  name "User Service"
  sends event UserCreated
  sends event UserUpdated
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    expect(await sdk.getService('UserService', '1.0.0')).toBeDefined();

    const userCreated = await sdk.getEvent('UserCreated', '0.0.1');
    const userUpdated = await sdk.getEvent('UserUpdated', '0.0.1');
    expect(userCreated).toBeDefined();
    expect(userCreated!.name).toBe('UserCreated');
    expect(userCreated!.version).toBe('0.0.1');
    expect(userUpdated).toBeDefined();
    expect(userUpdated!.name).toBe('UserUpdated');
    expect(userUpdated!.version).toBe('0.0.1');
  });

  it('creates stub commands and queries for receives references', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service UserService {
  version 1.0.0
  name "User Service"
  receives command CreateUser
  receives command UpdateUser
  receives query GetUser
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);

    const createUser = await sdk.getCommand('CreateUser', '0.0.1');
    const updateUser = await sdk.getCommand('UpdateUser', '0.0.1');
    const getUser = await sdk.getQuery('GetUser', '0.0.1');
    expect(createUser).toBeDefined();
    expect(createUser!.version).toBe('0.0.1');
    expect(updateUser).toBeDefined();
    expect(getUser).toBeDefined();
  });

  it('creates stubs for all message types in a full service', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `visualizer main {
  service UserService {
    version 1.0.0
    summary "Manages user accounts"
    sends event UserCreated
    sends event UserUpdated
    receives command CreateUser
    receives command UpdateUser
    receives query GetUser
  }
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    // Service + 5 message stubs = 6 created
    expect(result).toContain('Created 6 resource(s)');

    const sdk = createSDK(catalogPath);
    expect(await sdk.getService('UserService', '1.0.0')).toBeDefined();
    expect(await sdk.getEvent('UserCreated', '0.0.1')).toBeDefined();
    expect(await sdk.getEvent('UserUpdated', '0.0.1')).toBeDefined();
    expect(await sdk.getCommand('CreateUser', '0.0.1')).toBeDefined();
    expect(await sdk.getCommand('UpdateUser', '0.0.1')).toBeDefined();
    expect(await sdk.getQuery('GetUser', '0.0.1')).toBeDefined();
  });

  it('does not create stubs for messages that have inline definitions', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated {
    version 2.0.0
    name "Order Created"
  }
  sends event OrderShipped
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);

    // OrderCreated has inline body -> compiled normally with version 2.0.0
    const orderCreated = await sdk.getEvent('OrderCreated', '2.0.0');
    expect(orderCreated).toBeDefined();
    expect(orderCreated!.name).toBe('Order Created');

    // OrderShipped has no body -> stub with 0.0.1
    const orderShipped = await sdk.getEvent('OrderShipped', '0.0.1');
    expect(orderShipped).toBeDefined();
    expect(orderShipped!.version).toBe('0.0.1');
  });

  it('does not create stubs for messages already defined elsewhere in the DSL', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    // Should be 2: event + service. No stub needed.
    expect(result).toContain('Created 2 resource(s)');

    const sdk = createSDK(catalogPath);
    const event = await sdk.getEvent('OrderCreated', '1.0.0');
    expect(event).toBeDefined();
    expect(event!.name).toBe('Order Created');

    // Should NOT have a 0.0.1 stub
    const stub = await sdk.getEvent('OrderCreated', '0.0.1');
    expect(stub).toBeUndefined();
  });

  it('does not create duplicate stubs when multiple services reference the same message', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service ServiceA {
  version 1.0.0
  name "Service A"
  sends event SharedEvent
}

service ServiceB {
  version 1.0.0
  name "Service B"
  receives event SharedEvent
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    // 2 services + 1 stub event = 3
    expect(result).toContain('Created 3 resource(s)');

    const sdk = createSDK(catalogPath);
    expect(await sdk.getEvent('SharedEvent', '0.0.1')).toBeDefined();
  });

  it('uses explicit version from ref instead of 0.0.1 when provided', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@2.0.0
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);

    const event = await sdk.getEvent('OrderCreated', '2.0.0');
    expect(event).toBeDefined();
    expect(event!.version).toBe('2.0.0');
  });

  it('creates a stub for a different explicit version even when another version is defined in DSL', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
  sends event OrderCreated@2.0.0
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });
    expect(result).toContain('Created 3 resource(s)');

    const sdk = createSDK(catalogPath);
    expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();
    expect(await sdk.getEvent('OrderCreated', '2.0.0')).toBeDefined();
    expect(await sdk.getEvent('OrderCreated', '0.0.1')).toBeUndefined();
  });

  it('stubs are not created when message already exists in catalog', async () => {
    const sdk = createSDK(catalogPath);
    await sdk.writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: 'existing docs' });

    const ecFile = writeEcFile(
      'test.ec',
      `service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk2 = createSDK(catalogPath);

    // The existing event should still be there, untouched (stub has different version 0.0.1)
    const existing = await sdk2.getEvent('OrderCreated', '1.0.0');
    expect(existing).toBeDefined();
    expect(existing!.markdown).toBe('existing docs');
  });

  it('adds <NodeGraph /> to stub messages', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service UserService {
  version 1.0.0
  name "User Service"
  sends event UserCreated
  receives command CreateUser
  receives query GetUser
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const event = await sdk.getEvent('UserCreated', '0.0.1');
    const command = await sdk.getCommand('CreateUser', '0.0.1');
    const query = await sdk.getQuery('GetUser', '0.0.1');

    expect(event!.markdown).toContain('<NodeGraph />');
    expect(command!.markdown).toContain('<NodeGraph />');
    expect(query!.markdown).toContain('<NodeGraph />');
  });
});
