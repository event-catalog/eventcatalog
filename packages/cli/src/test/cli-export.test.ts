import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exportResource, exportAll, exportCatalog } from '../cli/export';
import path from 'node:path';
import fs from 'node:fs';
import createSDK from '@eventcatalog/sdk';

const CATALOG_PATH = path.join(__dirname, 'catalog-export-test');

const { writeEvent, writeCommand, writeService, writeDomain, writeChannel, writeTeam, writeUser } = createSDK(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('export command', () => {
  it('exports an event to stdout', async () => {
    await writeEvent({
      id: 'OrderCreated',
      name: 'Order Created',
      version: '1.0.0',
      summary: 'An order was created',
      markdown: '',
    });

    const result = await exportResource({
      resource: 'event',
      id: 'OrderCreated',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toBe(`event OrderCreated {
  version 1.0.0
  name "Order Created"
  summary "An order was created"
}

visualizer main {
  name "View of OrderCreated"
  event OrderCreated
}`);
  });

  it('exports a command to stdout', async () => {
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' });

    const result = await exportResource({
      resource: 'command',
      id: 'CreateOrder',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toBe(`command CreateOrder {
  version 1.0.0
  name "Create Order"
}

visualizer main {
  name "View of CreateOrder"
  command CreateOrder
}`);
  });

  it('exports a service to stdout', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      markdown: '',
    });

    const result = await exportResource({
      resource: 'service',
      id: 'OrderService',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toBe(`service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
}

visualizer main {
  name "View of OrderService"
  service OrderService
}`);
  });

  it('exports a domain to stdout', async () => {
    await writeDomain({
      id: 'Orders',
      name: 'Orders Domain',
      version: '1.0.0',
      summary: 'Order management',
      markdown: '',
    });

    const result = await exportResource({
      resource: 'domain',
      id: 'Orders',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toBe(`domain Orders {
  version 1.0.0
  name "Orders Domain"
  summary "Order management"
}

visualizer main {
  name "View of Orders"
  domain Orders
}`);
  });

  it('exports a specific version', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '2.0.0', summary: 'v2', markdown: '' });

    const result = await exportResource({
      resource: 'event',
      id: 'OrderCreated',
      version: '2.0.0',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toBe(`event OrderCreated {
  version 2.0.0
  name "Order Created"
  summary "v2"
}

visualizer main {
  name "View of OrderCreated"
  event OrderCreated
}`);
  });

  it('exports with hydrate includes referenced resources', async () => {
    await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      owners: ['orders-team'],
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      markdown: '',
    });

    const result = await exportResource({
      resource: 'service',
      id: 'OrderService',
      hydrate: true,
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toBe(`// TEAMS
team orders-team {
  name "Orders Team"
}

// EVENTS
event OrderCreated {
  version 1.0.0
  name "Order Created"
}

// SERVICES
service OrderService {
  version 1.0.0
  name "Order Service"
  owner orders-team
  sends event OrderCreated@1.0.0
}

visualizer main {
  name "View of OrderService"
  service OrderService
}`);
  });

  it('writes to file by default', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const result = await exportResource({
      resource: 'event',
      id: 'OrderCreated',
      dir: CATALOG_PATH,
    });

    const filepath = path.resolve('OrderCreated.ec');
    expect(result).toContain(`Exported event 'OrderCreated' to ${filepath}`);
    expect(result).toContain('Tip: Use --playground to open in the playground');
    expect(fs.existsSync(filepath)).toBe(true);

    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('event OrderCreated {');
    expect(content).toContain('visualizer main {');

    fs.rmSync(filepath);
  });

  it('writes to custom output path', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const outputPath = path.join(CATALOG_PATH, 'custom-output.ec');
    const result = await exportResource({
      resource: 'event',
      id: 'OrderCreated',
      output: outputPath,
      dir: CATALOG_PATH,
    });

    expect(result).toContain(`Exported event 'OrderCreated' to ${outputPath}`);
    expect(result).toContain('Tip: Use --playground to open in the playground');
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, 'utf-8');
    expect(content).toContain('event OrderCreated {');
    expect(content).toContain('visualizer main {');
  });

  it('includes playground URL when --playground is set', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });

    const outputPath = path.join(CATALOG_PATH, 'playground-test.ec');
    const result = await exportResource({
      resource: 'event',
      id: 'OrderCreated',
      playground: true,
      output: outputPath,
      dir: CATALOG_PATH,
    });

    expect(result).toContain(`Exported event 'OrderCreated' to ${outputPath}`);
    expect(result).toContain('Opening in playground...');
    expect(result).not.toContain('Tip: Use --playground');
  });

  it('throws for invalid resource type', async () => {
    await expect(
      exportResource({
        resource: 'invalid',
        id: 'Foo',
        stdout: true,
        dir: CATALOG_PATH,
      })
    ).rejects.toThrow("Invalid resource type 'invalid'. Must be one of: event, command, query, service, domain");
  });

  it('throws when resource not found', async () => {
    await expect(
      exportResource({
        resource: 'event',
        id: 'NonExistent',
        stdout: true,
        dir: CATALOG_PATH,
      })
    ).rejects.toThrow("event 'NonExistent (latest)' not found");
  });

  it('throws when versioned resource not found', async () => {
    await expect(
      exportResource({
        resource: 'event',
        id: 'NonExistent',
        version: '9.9.9',
        stdout: true,
        dir: CATALOG_PATH,
      })
    ).rejects.toThrow("event 'NonExistent@9.9.9' not found");
  });

  it('delegates to exportAll when id is omitted', async () => {
    await writeService({ id: 'ServiceA', name: 'Service A', version: '1.0.0', markdown: '' });

    const result = await exportResource({
      resource: 'service',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('service ServiceA');
  });
});

describe('exportAll - bulk export', () => {
  it('exports all services to stdout', async () => {
    await writeService({ id: 'ServiceA', name: 'Service A', version: '1.0.0', markdown: '' });
    await writeService({ id: 'ServiceB', name: 'Service B', version: '2.0.0', markdown: '' });

    const result = await exportAll({
      resource: 'service',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('service ServiceA');
    expect(result).toContain('service ServiceB');
  });

  it('exports all events to stdout', async () => {
    await writeEvent({ id: 'EventA', name: 'Event A', version: '1.0.0', markdown: '' });
    await writeEvent({ id: 'EventB', name: 'Event B', version: '1.0.0', markdown: '' });

    const result = await exportAll({
      resource: 'event',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('event EventA');
    expect(result).toContain('event EventB');
  });

  it('handles plural resource names (services -> service)', async () => {
    await writeService({ id: 'MyService', name: 'My Service', version: '1.0.0', markdown: '' });

    const result = await exportAll({
      resource: 'services',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('service MyService');
  });

  it('handles plural resource names (events -> event)', async () => {
    await writeEvent({ id: 'MyEvent', name: 'My Event', version: '1.0.0', markdown: '' });

    const result = await exportAll({
      resource: 'events',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('event MyEvent');
  });

  it('exports all services with hydrate', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      markdown: '',
    });

    const result = await exportAll({
      resource: 'service',
      hydrate: true,
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('event OrderCreated');
    expect(result).toContain('service OrderService');
    expect(result).toContain('sends event OrderCreated@1.0.0');
  });

  it('deduplicates shared dependencies when hydrating multiple services', async () => {
    await writeEvent({ id: 'SharedEvent', name: 'Shared Event', version: '1.0.0', markdown: '' });
    await writeService({
      id: 'ServiceA',
      name: 'Service A',
      version: '1.0.0',
      sends: [{ id: 'SharedEvent', version: '1.0.0' }],
      markdown: '',
    });
    await writeService({
      id: 'ServiceB',
      name: 'Service B',
      version: '1.0.0',
      sends: [{ id: 'SharedEvent', version: '1.0.0' }],
      markdown: '',
    });

    const result = await exportAll({
      resource: 'service',
      hydrate: true,
      stdout: true,
      dir: CATALOG_PATH,
    });

    // SharedEvent should appear only once despite being referenced by both services
    const matches = result.match(/event SharedEvent \{/g);
    expect(matches).toHaveLength(1);
  });

  it('writes to file with default plural name', async () => {
    await writeService({ id: 'ServiceA', name: 'Service A', version: '1.0.0', markdown: '' });

    const result = await exportAll({
      resource: 'service',
      dir: CATALOG_PATH,
    });

    const filepath = path.resolve('services.ec');
    expect(result).toContain(`Exported 1 services to ${filepath}`);
    expect(fs.existsSync(filepath)).toBe(true);

    fs.rmSync(filepath);
  });

  it('throws for invalid resource type in bulk export', async () => {
    await expect(
      exportAll({
        resource: 'invalid',
        stdout: true,
        dir: CATALOG_PATH,
      })
    ).rejects.toThrow("Invalid resource type 'invalid'. Must be one of: event, command, query, service, domain");
  });

  it('throws when no resources found', async () => {
    await expect(
      exportAll({
        resource: 'service',
        stdout: true,
        dir: CATALOG_PATH,
      })
    ).rejects.toThrow('No services found in catalog');
  });

  it('groups blocks by type with section comments', async () => {
    await writeService({ id: 'ServiceA', name: 'Service A', version: '1.0.0', markdown: '' });
    await writeService({ id: 'ServiceB', name: 'Service B', version: '1.0.0', markdown: '' });

    const result = await exportAll({
      resource: 'service',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('// SERVICES');
    expect(result).toContain('service ServiceA');
    expect(result).toContain('service ServiceB');
  });

  it('includes visualizer block listing all resources', async () => {
    await writeService({ id: 'ServiceA', name: 'Service A', version: '1.0.0', markdown: '' });
    await writeService({ id: 'ServiceB', name: 'Service B', version: '1.0.0', markdown: '' });

    const result = await exportAll({
      resource: 'service',
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('visualizer main {');
    expect(result).toContain('service ServiceA');
    expect(result).toContain('service ServiceB');
    expect(result).toContain('name "All services"');
  });

  it('includes visualizer with hydrated resources', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      markdown: '',
    });

    const result = await exportAll({
      resource: 'service',
      hydrate: true,
      stdout: true,
      dir: CATALOG_PATH,
    });

    // Visualizer should only include services, not hydrated dependencies
    const vizSection = result.substring(result.indexOf('visualizer main {'));
    expect(vizSection).not.toContain('event OrderCreated');
    expect(vizSection).toContain('service OrderService');
  });

  it('groups hydrated blocks by type with section comments in order', async () => {
    await writeTeam({ id: 'my-team', name: 'My Team', markdown: '' });
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' });
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      owners: ['my-team'],
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      receives: [{ id: 'CreateOrder', version: '1.0.0' }],
      markdown: '',
    });

    const result = await exportAll({
      resource: 'service',
      hydrate: true,
      stdout: true,
      dir: CATALOG_PATH,
    });

    // Verify section comments exist
    expect(result).toContain('// TEAMS');
    expect(result).toContain('// EVENTS');
    expect(result).toContain('// COMMANDS');
    expect(result).toContain('// SERVICES');

    // Verify order: teams before events before commands before services
    const teamsIdx = result.indexOf('// TEAMS');
    const eventsIdx = result.indexOf('// EVENTS');
    const commandsIdx = result.indexOf('// COMMANDS');
    const servicesIdx = result.indexOf('// SERVICES');
    expect(teamsIdx).toBeLessThan(eventsIdx);
    expect(eventsIdx).toBeLessThan(commandsIdx);
    expect(commandsIdx).toBeLessThan(servicesIdx);
  });
});

describe('exportCatalog - full catalog export', () => {
  it('exports all resource types to stdout', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeCommand({ id: 'CreateOrder', name: 'Create Order', version: '1.0.0', markdown: '' });
    await writeService({ id: 'OrderService', name: 'Order Service', version: '1.0.0', markdown: '' });
    await writeDomain({ id: 'Orders', name: 'Orders Domain', version: '1.0.0', markdown: '' });

    const result = await exportCatalog({
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('// EVENTS');
    expect(result).toContain('event OrderCreated');
    expect(result).toContain('// COMMANDS');
    expect(result).toContain('command CreateOrder');
    expect(result).toContain('// SERVICES');
    expect(result).toContain('service OrderService');
    expect(result).toContain('// DOMAINS');
    expect(result).toContain('domain Orders');
  });

  it('includes visualizer with all resource types', async () => {
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeService({ id: 'OrderService', name: 'Order Service', version: '1.0.0', markdown: '' });
    await writeDomain({ id: 'Orders', name: 'Orders Domain', version: '1.0.0', markdown: '' });

    const result = await exportCatalog({
      stdout: true,
      dir: CATALOG_PATH,
    });

    const vizSection = result.substring(result.indexOf('visualizer main {'));
    expect(vizSection).toContain('event OrderCreated');
    expect(vizSection).toContain('service OrderService');
    expect(vizSection).toContain('domain Orders');
    expect(vizSection).toContain('name "Full Catalog"');
  });

  it('exports with hydrate', async () => {
    await writeTeam({ id: 'my-team', name: 'My Team', markdown: '' });
    await writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
    await writeService({
      id: 'OrderService',
      name: 'Order Service',
      version: '1.0.0',
      owners: ['my-team'],
      sends: [{ id: 'OrderCreated', version: '1.0.0' }],
      markdown: '',
    });

    const result = await exportCatalog({
      hydrate: true,
      stdout: true,
      dir: CATALOG_PATH,
    });

    expect(result).toContain('// TEAMS');
    expect(result).toContain('team my-team');
    expect(result).toContain('// EVENTS');
    expect(result).toContain('// SERVICES');
  });

  it('writes to catalog.ec by default', async () => {
    await writeService({ id: 'OrderService', name: 'Order Service', version: '1.0.0', markdown: '' });

    const result = await exportCatalog({
      dir: CATALOG_PATH,
    });

    const filepath = path.resolve('catalog.ec');
    expect(result).toContain(`Exported full catalog to ${filepath}`);
    expect(fs.existsSync(filepath)).toBe(true);

    fs.rmSync(filepath);
  });

  it('writes to custom output path', async () => {
    await writeService({ id: 'OrderService', name: 'Order Service', version: '1.0.0', markdown: '' });

    const outputPath = path.join(CATALOG_PATH, 'my-catalog.ec');
    const result = await exportCatalog({
      output: outputPath,
      dir: CATALOG_PATH,
    });

    expect(result).toContain(`Exported full catalog to ${outputPath}`);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it('throws when catalog is empty', async () => {
    await expect(
      exportCatalog({
        stdout: true,
        dir: CATALOG_PATH,
      })
    ).rejects.toThrow('No resources found in catalog');
  });
});
