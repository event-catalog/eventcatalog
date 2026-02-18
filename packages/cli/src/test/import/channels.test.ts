import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('channels');
setup();

describe('import channels', () => {
  it('imports a standalone channel', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `channel OrderTopic {
  version 1.0.0
  name "Order Topic"
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 1 resource(s)');

    const sdk = createSDK(catalogPath);
    const channel = await sdk.getChannel('OrderTopic', '1.0.0');
    expect(channel).toBeDefined();
    expect(channel!.name).toBe('Order Topic');
  });

  it('produces sends with to channels in service frontmatter', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `channel OrderTopic {
  version 1.0.0
  name "Order Topic"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to OrderTopic
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 3 resource(s)');

    const sdk = createSDK(catalogPath);
    const service = await sdk.getService('OrderService', '1.0.0');
    expect(service).toBeDefined();
    expect(service!.sends).toBeDefined();
    expect(service!.sends).toHaveLength(1);
    expect(service!.sends![0].id).toBe('OrderCreated');
    expect((service!.sends![0] as any).to).toBeDefined();
    expect((service!.sends![0] as any).to).toHaveLength(1);
    expect((service!.sends![0] as any).to[0].id).toBe('OrderTopic');
  });

  it('produces receives with from channels in service frontmatter', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `channel OrderChannel {
  version 1.0.0
  name "Order Channel"
}

command CreateOrder {
  version 1.0.0
  name "Create Order"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  receives command CreateOrder@1.0.0 from OrderChannel
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    expect(result).toContain('Created 3 resource(s)');

    const sdk = createSDK(catalogPath);
    const service = await sdk.getService('OrderService', '1.0.0');
    expect(service).toBeDefined();
    expect(service!.receives).toBeDefined();
    expect(service!.receives).toHaveLength(1);
    expect(service!.receives![0].id).toBe('CreateOrder');
    expect((service!.receives![0] as any).from).toBeDefined();
    expect((service!.receives![0] as any).from).toHaveLength(1);
    expect((service!.receives![0] as any).from[0].id).toBe('OrderChannel');
  });

  it('includes delivery_mode in channel refs', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `channel OrderTopic {
  version 1.0.0
  name "Order Topic"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to OrderTopic delivery push
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const service = await sdk.getService('OrderService', '1.0.0');
    const sendRef = service!.sends![0] as any;
    expect(sendRef.to[0].delivery_mode).toBe('push');
  });

  it('includes channel version in channel refs', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `channel OrderTopic {
  version 2.0.0
  name "Order Topic"
}

event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0 to OrderTopic@2.0.0
}`
    );

    await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const service = await sdk.getService('OrderService', '1.0.0');
    const sendRef = service!.sends![0] as any;
    expect(sendRef.to[0].version).toBe('2.0.0');
  });

  it('creates channel stubs for referenced channels without standalone definitions', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated to OrderTopic
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);

    // Should create service + event stub + channel stub
    const channel = await sdk.getChannel('OrderTopic', '0.0.1');
    expect(channel).toBeDefined();
    expect(channel!.name).toBe('OrderTopic');
    expect(channel!.version).toBe('0.0.1');
  });

  it('does not create channel stubs for channels already defined in the DSL', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `channel OrderTopic {
  version 1.0.0
  name "Order Topic"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated to OrderTopic
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);

    // Channel defined in DSL should exist at 1.0.0
    const channel = await sdk.getChannel('OrderTopic', '1.0.0');
    expect(channel).toBeDefined();

    // Should NOT have a 0.0.1 stub
    const stub = await sdk.getChannel('OrderTopic', '0.0.1');
    expect(stub).toBeUndefined();
  });

  it('does not create duplicate channel stubs when multiple sends reference same channel', async () => {
    const ecFile = writeEcFile(
      'test.ec',
      `service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated to SharedTopic
  sends event OrderUpdated to SharedTopic
}`
    );

    const result = await importDSL({ files: [ecFile], dir: catalogPath });

    const sdk = createSDK(catalogPath);
    const channel = await sdk.getChannel('SharedTopic', '0.0.1');
    expect(channel).toBeDefined();

    // Count channel resources in result — should only be 1
    const channelMatches = result.match(/SharedTopic@/g);
    expect(channelMatches).toHaveLength(1);
  });
});
