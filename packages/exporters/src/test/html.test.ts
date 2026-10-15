import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import createSDK from '@eventcatalog/sdk';
import { renderHtml, writeHtml } from '../html';
import { LAZY_SECTION_THRESHOLD, compactHtml } from '../html/render';
import { parseSchema } from '../catalog/schema';
import { renderMarkdown } from '../html/markdown';
import { highlight } from '../html/highlight';

const exportHtml = async ({ dir }: { dir: string }) => (await renderHtml(dir)).html;

const CATALOG_PATH = path.join(__dirname, 'catalog-export-html-test');

const {
  writeEvent,
  writeCommand,
  writeService,
  writeDomain,
  writeChannel,
  writeTeam,
  writeDataStore,
  writeFlow,
  writeSystem,
  addSchemaToEvent,
} = createSDK(CATALOG_PATH);

const orderPlacedSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['orderId', 'total'],
  properties: {
    orderId: { type: 'string', format: 'uuid', description: 'The order that was placed.' },
    total: { $ref: '#/definitions/Money' },
    status: { type: 'string', enum: ['PLACED', 'PAID'] },
  },
  definitions: {
    Money: {
      type: 'object',
      required: ['amount'],
      properties: { amount: { type: 'number', examples: [42.5] }, currency: { type: 'string' } },
    },
  },
};

const seedCatalog = async () => {
  await writeTeam({ id: 'orders-team', name: 'Orders Team', markdown: '' });
  await writeChannel({
    id: 'orders-topic',
    name: 'Orders topic',
    version: '1.0.0',
    address: 'acme.orders',
    protocols: ['kafka'],
    markdown: '',
  });
  await writeEvent({
    id: 'OrderPlaced',
    name: 'Order Placed',
    version: '1.0.0',
    summary: 'A customer placed an order.',
    owners: ['orders-team'],
    schemaPath: 'schema.json',
    markdown:
      "import Footer from '@catalog/components/footer.astro';\n\n## Overview\n\nRead by the [[service|BillingService]].\n\n<NodeGraph />\n\n## Architecture diagram\n\n<NodeGraph />",
  });
  await addSchemaToEvent('OrderPlaced', { schema: JSON.stringify(orderPlacedSchema), fileName: 'schema.json' });
  await writeCommand({ id: 'PlaceOrder', name: 'Place Order', version: '1.0.0', summary: 'Place an order <now>.', markdown: '' });
  await writeService({
    id: 'OrdersService',
    name: 'Orders Service',
    version: '1.0.0',
    owners: ['orders-team'],
    sends: [{ id: 'OrderPlaced', version: '1.0.0', to: [{ id: 'orders-topic' }] }],
    receives: [{ id: 'PlaceOrder' }],
    markdown: '',
  });
  await writeService({
    id: 'BillingService',
    name: 'Billing Service',
    version: '1.0.0',
    receives: [{ id: 'OrderPlaced' }],
    markdown: '',
  });
  await writeDomain({
    id: 'Orders',
    name: 'Orders',
    version: '1.0.0',
    summary: 'Everything about orders.',
    services: [{ id: 'OrdersService' }, { id: 'BillingService' }],
    markdown: '',
  });
};

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('export --format html', () => {
  it('renders one section per resource, each with a stable anchor', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).toContain('id="domain-Orders"');
    expect(html).toContain('id="service-OrdersService"');
    expect(html).toContain('id="event-OrderPlaced"');
    expect(html).toContain('id="command-PlaceOrder"');
    expect(html).toContain('id="channel-orders-topic"');
    expect(html).toContain('id="team-orders-team"');
  });

  it('links a message to the services that produce and consume it', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });
    const section = html.slice(
      html.indexOf('id="event-OrderPlaced"'),
      html.indexOf('</section>', html.indexOf('id="event-OrderPlaced"'))
    );

    expect(section).toContain('Produced by');
    expect(section).toContain('href="#service-OrdersService"');
    expect(section).toContain('Consumed by');
    expect(section).toContain('href="#service-BillingService"');
    expect(section).toContain('acme.orders');
  });

  it('lists the attributes of a message from its JSON schema, resolving $ref', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).toContain('<code class="attr-name">orderId</code>');
    expect(html).toContain('<code class="attr-name">amount</code>');
    expect(html).toContain('Show child attributes');
  });

  it('renders the catalog markdown without MDX components and turns resource links into anchors', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).toContain('<a href="#service-BillingService">Billing Service</a>');
    expect(html).not.toContain('NodeGraph');
    expect(html).not.toContain('import Footer');
    expect(html).not.toContain('Architecture diagram');
  });

  it('escapes text from the catalog', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).toContain('Place an order &lt;now&gt;.');
  });

  it('writes the reference to the given path, creating the folder, and reports what it exported', async () => {
    await seedCatalog();
    const outputPath = path.join(CATALOG_PATH, 'dist', 'nested', 'architecture.html');

    const result = await writeHtml({ dir: CATALOG_PATH, outputPath });

    expect(fs.readFileSync(outputPath, 'utf-8')).toBe(result.html);
    expect(result.path).toBe(outputPath);
    expect(result.model.messages).toHaveLength(2);
  });

  it('shows the regenerate command it is given', async () => {
    await seedCatalog();

    const { html } = await renderHtml(CATALOG_PATH, { regenerateCommand: 'npx eventcatalog build' });

    expect(html).toContain('npx eventcatalog build');
  });

  it('embeds the logo from eventcatalog.config.js, read from the public folder', async () => {
    await seedCatalog();
    fs.mkdirSync(path.join(CATALOG_PATH, 'public'), { recursive: true });
    fs.writeFileSync(path.join(CATALOG_PATH, 'public', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    fs.writeFileSync(
      path.join(CATALOG_PATH, 'eventcatalog.config.js'),
      "export default { title: 'Acme', logo: { src: '/logo.svg', alt: 'Acme logo' } };"
    );

    const html = await exportHtml({ dir: CATALOG_PATH });

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64');
    expect(html).toContain(`src="data:image/svg+xml;base64,${svg}" alt="Acme logo"`);
  });

  it('falls back to the EventCatalog logo when the config sets none', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });

    const brand = html.slice(html.indexOf('<a class="brand"'), html.indexOf('</a>', html.indexOf('<a class="brand"')));
    expect(brand).toContain('<svg class="brand-logo"');
    expect(brand).not.toContain('<img');
  });

  it('renders data stores with the services that write to and read from them', async () => {
    await seedCatalog();
    await writeDataStore({
      id: 'orders-db',
      name: 'Orders DB',
      version: '1.0.0',
      container_type: 'database',
      technology: 'postgres@16',
      markdown: '',
    });
    await writeService(
      { id: 'OrdersService', name: 'Orders Service', version: '1.0.0', writesTo: [{ id: 'orders-db' }], markdown: '' },
      { override: true }
    );
    await writeService(
      { id: 'BillingService', name: 'Billing Service', version: '1.0.0', readsFrom: [{ id: 'orders-db' }], markdown: '' },
      { override: true }
    );

    const html = await exportHtml({ dir: CATALOG_PATH });
    const start = html.indexOf('id="container-orders-db"');
    const section = html.slice(start, html.indexOf('</section>', start));

    expect(section).toContain('postgres@16');
    expect(section).toMatch(/Written by[\s\S]*href="#service-OrdersService"/);
    expect(section).toMatch(/Read by[\s\S]*href="#service-BillingService"/);
    expect(html).toContain('<a class="ep" href="#container-orders-db"><span class="ep-verb dat">WRITES</span>');
  });

  it('renders a flow as steps tagged with the kind of resource each one points at', async () => {
    await seedCatalog();
    await writeFlow({
      id: 'place-order',
      name: 'Place an order',
      version: '1.0.0',
      markdown: '',
      steps: [
        { id: 'customer', title: 'Customer', actor: { name: 'Customer' }, next_step: { id: 'place', label: 'Checks out' } },
        { id: 'place', title: 'Place order', message: { id: 'PlaceOrder', version: '1.0.0' }, next_step: 'orders' },
        { id: 'orders', title: 'Orders', service: { id: 'OrdersService', version: '1.0.0' } },
      ],
    });

    const html = await exportHtml({ dir: CATALOG_PATH });
    const start = html.indexOf('id="flow-place-order"');
    const section = html.slice(start, html.indexOf('</section>', start));

    expect(section).toContain('<span class="tag act">ACTOR</span><div class="flow-body"><span class="flow-name">Customer</span>');
    expect(section).toContain(
      '<span class="tag cmd">CMD</span><div class="flow-body"><a class="flow-name" href="#command-PlaceOrder">'
    );
    expect(section).toContain('<span>Checks out</span>');
    expect(section).toContain('<span class="tag svc">SVC</span>');
  });

  it("lists a domain's own sends and receives as integration events, not the messages of its services", async () => {
    await seedCatalog();
    await writeDomain(
      {
        id: 'Orders',
        name: 'Orders',
        version: '1.0.0',
        services: [{ id: 'OrdersService' }, { id: 'BillingService' }],
        receives: [{ id: 'PlaceOrder' }],
        markdown: '',
      },
      { override: true }
    );

    const html = await exportHtml({ dir: CATALOG_PATH });
    const start = html.indexOf('id="domain-Orders"');
    const section = html.slice(start, html.indexOf('</section>', start));

    expect(section).toContain('Integration events');
    expect(section).toContain('Consumes');
    expect(section).toContain('href="#command-PlaceOrder"');
    expect(section).not.toContain('href="#event-OrderPlaced"');
  });

  it('gives each team its own section with what it owns listed by kind', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });
    const start = html.indexOf('id="team-orders-team"');
    const section = html.slice(start, html.indexOf('</section>', start));

    expect(section).toContain('<span>Owns</span>');
    expect(section).toMatch(/<div class="box-sub">Services<\/div>[\s\S]*href="#service-OrdersService"/);
    expect(section).toMatch(/<div class="box-sub">Events<\/div>[\s\S]*href="#event-OrderPlaced"/);
  });

  it('ships the sections of large catalogs as inert text, drawn when needed, and keeps the overview drawn', async () => {
    // Written straight to disk: the SDK would be slow for this many resources
    for (let i = 0; i <= LAZY_SECTION_THRESHOLD; i++) {
      const dir = path.join(CATALOG_PATH, 'events', `Event${i}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.mdx'), `---\nid: Event${i}\nname: Event ${i}\nversion: 1.0.0\n---\n`);
    }

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).toContain('<section class="section intro" id="overview">');
    expect(html).toMatch(/<section class="section lazy" id="event-Event0" style="height:\d+px"><script type="text\/html">/);
  });

  it('draws every section up front for catalogs below the threshold', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).not.toContain('section lazy');
  });

  it('lists the specifications of a service with their logos, each opening its raw file', async () => {
    await seedCatalog();
    await writeService(
      {
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        specifications: [
          { type: 'openapi', path: 'openapi.yml', name: 'Orders API' },
          { type: 'asyncapi', path: 'missing.yml' },
        ],
        markdown: '',
      },
      { override: true }
    );
    fs.writeFileSync(
      path.join(CATALOG_PATH, 'services', 'OrdersService', 'openapi.yml'),
      'openapi: 3.0.0\ninfo:\n  title: Orders <API>\n'
    );

    const html = await exportHtml({ dir: CATALOG_PATH });
    const start = html.indexOf('id="service-OrdersService"');
    const section = html.slice(start, html.indexOf('</section>', start));

    expect(section).toContain(
      '<button class="spec-row" id="spec-service-OrdersService-0" type="button" data-file="openapi.yml" data-lang="yaml" data-name="Orders API" data-type="openapi"><span class="spec-icon openapi"></span>'
    );
    expect(section).toContain('<template>openapi: 3.0.0\ninfo:\n  title: Orders &lt;API>\n</template>');
    expect(section).toContain(
      '<div class="spec-row missing" title="The file could not be read"><span class="spec-icon asyncapi"></span>'
    );
    expect(html).toContain('.spec-icon.openapi{background-image:url("data:image/svg+xml;base64,');
    expect(html).toContain('id="spec-modal"');
    expect(section).toContain(
      '<button class="spec-link" type="button" data-open="spec-service-OrdersService-0"><span class="spec-icon openapi"></span>Orders API<small>OpenAPI</small></button>'
    );
    expect(
      section.indexOf('<div class="sticky"><div class="box"><div class="box-head"><span>Specifications</span>')
    ).toBeGreaterThan(-1);
  });

  it('only includes the logos of specification types the catalog uses', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).not.toContain('.spec-icon.openapi{');
  });

  it('leaves hidden resources out of the reference', async () => {
    await seedCatalog();
    await writeService({ id: 'SecretService', name: 'Secret Service', version: '1.0.0', hidden: true, markdown: '' } as any);
    await writeEvent({ id: 'SecretEvent', name: 'Secret Event', version: '1.0.0', hidden: true, markdown: '' } as any);

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).not.toContain('SecretService');
    expect(html).not.toContain('SecretEvent');
  });

  it('does not count a service pinned to an older message version as a producer of the latest version', async () => {
    await seedCatalog();
    await writeService(
      {
        id: 'LegacyService',
        name: 'Legacy Service',
        version: '1.0.0',
        sends: [{ id: 'OrderPlaced', version: '0.0.1' }],
        markdown: '',
      },
      { override: true }
    );
    await writeService(
      {
        id: 'RangeService',
        name: 'Range Service',
        version: '1.0.0',
        sends: [{ id: 'OrderPlaced', version: '^1.0.0' }],
        markdown: '',
      },
      { override: true }
    );

    const html = await exportHtml({ dir: CATALOG_PATH });
    const start = html.indexOf('id="event-OrderPlaced"');
    const event = html.slice(start, html.indexOf('</section>', start));
    const legacyStart = html.indexOf('id="service-LegacyService"');
    const legacy = html.slice(legacyStart, html.indexOf('</section>', legacyStart));

    expect(event).not.toContain('href="#service-LegacyService"');
    expect(event).toContain('href="#service-RangeService"');
    expect(legacy).toContain('Order Placed<small>v0.0.1</small>');
  });

  it('does not link a message to the latest channel when it points at an older channel version', async () => {
    await seedCatalog();
    await writeService(
      {
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        sends: [{ id: 'OrderPlaced', version: '1.0.0', to: [{ id: 'orders-topic', version: '0.0.1' }] }],
        markdown: '',
      },
      { override: true }
    );

    const html = await exportHtml({ dir: CATALOG_PATH });
    const channelStart = html.indexOf('id="channel-orders-topic"');
    const channel = html.slice(channelStart, html.indexOf('</section>', channelStart));
    const serviceStart = html.indexOf('id="service-OrdersService"');
    const service = html.slice(serviceStart, html.indexOf('</section>', serviceStart));

    expect(channel).not.toContain('href="#event-OrderPlaced"');
    expect(service).toContain('Order Placed<small>Orders topic v0.0.1</small>');
  });

  it('matches number-like versions such as 1 and v1 the way the catalog does', async () => {
    await writeEvent({ id: 'PriceChanged', name: 'Price Changed', version: '1', markdown: '' });
    await writeService({
      id: 'Pricing',
      name: 'Pricing',
      version: '1.0.0',
      sends: [{ id: 'PriceChanged', version: '^1' }],
      markdown: '',
    });
    await writeService({
      id: 'Basket',
      name: 'Basket',
      version: '1.0.0',
      receives: [{ id: 'PriceChanged', version: 'v1' }],
      markdown: '',
    });

    const html = await exportHtml({ dir: CATALOG_PATH });
    const start = html.indexOf('id="event-PriceChanged"');
    const event = html.slice(start, html.indexOf('</section>', start));

    expect(event).toContain('href="#service-Pricing"');
    expect(event).toContain('href="#service-Basket"');
  });

  it('does not link a service to the latest data store when it points at an older store version', async () => {
    await seedCatalog();
    await writeDataStore({ id: 'orders-db', name: 'Orders DB', version: '1.0.0', container_type: 'database', markdown: '' });
    await writeService(
      {
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        writesTo: [{ id: 'orders-db', version: '0.0.1' }],
        markdown: '',
      },
      { override: true }
    );

    const html = await exportHtml({ dir: CATALOG_PATH });
    const storeStart = html.indexOf('id="container-orders-db"');
    const store = html.slice(storeStart, html.indexOf('</section>', storeStart));
    const serviceStart = html.indexOf('id="service-OrdersService"');
    const service = html.slice(serviceStart, html.indexOf('</section>', serviceStart));

    expect(store).not.toContain('href="#service-OrdersService"');
    expect(service).toContain('<span class="ep-verb dat">WRITES</span><span class="ep-path">Orders DB v0.0.1</span>');
  });

  it('only links repository and Slack URLs with http or https', async () => {
    await seedCatalog();
    await writeService(
      { id: 'OrdersService', name: 'Orders Service', version: '1.0.0', repository: { url: 'javascript:alert(1)' }, markdown: '' },
      { override: true }
    );

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('<p class="attr-desc">javascript:alert(1)</p>');
  });

  it('only places a service in a system when the system points at the exported service version', async () => {
    await seedCatalog();
    await writeSystem({
      id: 'billing',
      name: 'Billing System',
      version: '1.0.0',
      services: [{ id: 'BillingService', version: '0.0.1' }],
      markdown: '',
    } as any);
    await writeSystem({
      id: 'ordering',
      name: 'Ordering System',
      version: '1.0.0',
      services: [{ id: 'OrdersService', version: '1.x' }],
      markdown: '',
    } as any);

    const html = await exportHtml({ dir: CATALOG_PATH });
    const slice = (id: string) => {
      const start = html.indexOf(`id="${id}"`);
      return html.slice(start, html.indexOf('</section>', start));
    };

    expect(slice('service-BillingService')).not.toContain('href="#system-billing"');
    expect(slice('service-OrdersService')).toContain('href="#system-ordering"');
    expect(slice('system-billing')).toContain('Billing Service v0.0.1');
  });

  it('does not link a flow step to the latest version of a resource it pins to an older version', async () => {
    await seedCatalog();
    await writeFlow({
      id: 'checkout',
      name: 'Checkout',
      version: '1.0.0',
      markdown: '',
      steps: [{ id: 1, title: 'Place order', message: { id: 'PlaceOrder', version: '0.0.1' } }],
    });

    const html = await exportHtml({ dir: CATALOG_PATH });
    const start = html.indexOf('id="flow-checkout"');
    const flow = html.slice(start, html.indexOf('</section>', start));

    expect(flow).not.toContain('href="#command-PlaceOrder"');
    expect(flow).toContain('Place Order v0.0.1');
  });

  it('exports catalogs that only have flows, entities or other resources', async () => {
    await writeFlow({ id: 'onboarding', name: 'Onboarding', version: '1.0.0', markdown: '', steps: [{ id: 1, title: 'Start' }] });

    const html = await exportHtml({ dir: CATALOG_PATH });

    expect(html).toContain('id="flow-onboarding"');
  });

  it('uses the EventCatalog logo as the favicon', async () => {
    await seedCatalog();

    const html = await exportHtml({ dir: CATALOG_PATH });
    const favicon = html.match(/<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml;base64,([^"]+)">/);

    expect(favicon).not.toBeNull();
    expect(Buffer.from(favicon![1], 'base64').toString()).toContain('@media (prefers-color-scheme:dark)');
  });

  it('throws when the catalog has no resources', async () => {
    await expect(exportHtml({ dir: CATALOG_PATH })).rejects.toThrow('No resources found');
  });
});

describe('parseSchema', () => {
  it('marks required JSON schema properties and nests object properties as children', () => {
    const schema = parseSchema('schema.json', JSON.stringify(orderPlacedSchema), 'OrderPlaced');

    const [orderId, total, status] = schema.attributes;
    expect(orderId).toMatchObject({ name: 'orderId', type: 'string', format: 'uuid', required: true });
    expect(total.required).toBe(true);
    expect(total.children?.map((c) => c.name)).toEqual(['amount', 'currency']);
    expect(status).toMatchObject({ required: false, enum: ['PLACED', 'PAID'] });
  });

  it('builds an example payload from schema examples, enums and formats', () => {
    const schema = parseSchema('schema.json', JSON.stringify(orderPlacedSchema), 'OrderPlaced');

    expect(schema.example).toEqual({
      orderId: '3f6b2b8e-9a4c-4f0e-8f2a-1c2d3e4f5a6b',
      total: { amount: 42.5, currency: 'string' },
      status: 'PLACED',
    });
  });

  it('generates a TypeScript interface with optional properties for non-required fields', () => {
    const schema = parseSchema('schema.json', JSON.stringify(orderPlacedSchema), 'order-placed');

    expect(schema.typescript).toContain('export interface OrderPlaced {');
    expect(schema.typescript).toContain('orderId: string;');
    expect(schema.typescript).toContain('status?: "PLACED" | "PAID";');
  });

  it('keeps numeric and boolean enum values as literals in the generated TypeScript', () => {
    const json = {
      type: 'object',
      properties: {
        priority: { type: 'integer', enum: [1, 2] },
        flag: { type: 'boolean', enum: [true, false] },
        state: { type: 'string', enum: ['A', 'B'] },
      },
    };

    const schema = parseSchema('schema.json', JSON.stringify(json), 'Task');

    expect(schema.typescript).toContain('priority?: 1 | 2;');
    expect(schema.typescript).toContain('flag?: true | false;');
    expect(schema.typescript).toContain('state?: "A" | "B";');
  });

  it('reads Avro records like the catalog viewer: nullable unions and defaults are optional, enums list their symbols', () => {
    const avro = {
      type: 'record',
      name: 'OrderPlaced',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'note', type: ['null', 'string'], doc: 'Free text.' },
        { name: 'status', type: { type: 'enum', name: 'Status', symbols: ['PLACED', 'PAID'] }, default: 'PLACED' },
      ],
    };

    const schema = parseSchema('schema.avsc', JSON.stringify(avro), 'OrderPlaced');

    expect(schema.format).toBe('avro');
    expect(schema.attributes).toEqual([
      { name: 'id', type: 'string', required: true },
      { name: 'note', type: 'null | string', required: false, description: 'Free text.' },
      { name: 'status', type: 'enum: Status', required: false, default: 'PLACED', enum: ['PLACED', 'PAID'] },
    ]);
  });

  it('reads protobuf messages with their comments, field numbers and nested messages', () => {
    const proto = `syntax = "proto3";
// An order a customer placed.
message OrderPlaced {
  // The order id.
  string id = 1;
  repeated Line lines = 2;
}
message Line {
  string sku = 1; // Stock keeping unit
}`;

    const schema = parseSchema('schema.proto', proto, 'OrderPlaced');

    expect(schema.format).toBe('protobuf');
    expect(schema.description).toBe('An order a customer placed.');
    expect(schema.attributes[0]).toMatchObject({
      name: 'id',
      type: 'string',
      description: 'The order id.',
      constraints: [{ label: 'Field number', value: '1' }],
    });
    expect(schema.attributes[1]).toMatchObject({ name: 'lines', type: 'repeated Line' });
    expect(schema.attributes[1].children?.[0]).toMatchObject({ name: 'sku', description: 'Stock keeping unit' });
  });

  it('lists JSON schema constraints, defaults and titles under each attribute', () => {
    const json = {
      type: 'object',
      properties: { sku: { type: 'string', title: 'SKU', pattern: '^[A-Z]{3}$', maxLength: 3, default: 'ABC' } },
    };

    const [sku] = parseSchema('schema.json', JSON.stringify(json), 'Item').attributes;

    expect(sku).toMatchObject({
      title: 'SKU',
      default: 'ABC',
      constraints: [
        { label: 'Pattern', value: '^[A-Z]{3}$' },
        { label: 'Max length', value: '3' },
      ],
    });
  });

  it('expands oneOf into named options that keep the shared properties', () => {
    const json = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
      oneOf: [
        { title: 'Card', properties: { last4: { type: 'string' } }, required: ['last4'] },
        { title: 'Bank transfer', properties: { iban: { type: 'string' } } },
      ],
    };

    const schema = parseSchema('schema.json', JSON.stringify(json), 'Payment');

    expect(schema.variantType).toBe('oneOf');
    expect(schema.variants?.map((v) => v.title)).toEqual(['Card', 'Bank transfer']);
    expect(schema.variants?.[0].children.map((c) => [c.name, c.required])).toEqual([
      ['id', true],
      ['last4', true],
    ]);
  });

  it('keeps schema formats the catalog cannot show as properties as raw text', () => {
    const schema = parseSchema('schema.xsd', '<xs:schema/>', 'OrderPlaced');

    expect(schema).toMatchObject({ format: 'xsd', attributes: [], raw: '<xs:schema/>' });
  });

  it('highlights YAML without treating URLs as comments or prose as keywords', () => {
    const html = highlight('url: https://api.acme.test\ndescription: Built for checkout from the cart\nenabled: true', 'yaml');

    expect(html).toContain('https://api.acme.test');
    expect(html).not.toContain('t-com');
    expect(html).not.toContain('<span class="t-kw">for</span>');
    expect(html).toContain('<span class="t-kw">true</span>');
  });

  it('stops at circular $refs instead of recursing forever', () => {
    const circular = {
      type: 'object',
      properties: { node: { $ref: '#/definitions/Node' } },
      definitions: { Node: { type: 'object', properties: { next: { $ref: '#/definitions/Node' } } } },
    };

    const schema = parseSchema('schema.json', JSON.stringify(circular), 'Tree');

    expect(schema.attributes[0].name).toBe('node');
  });
});

describe('performance on hostile input', () => {
  // Each of these took quadratic time before (CodeQL: polynomial regular expressions); they must stay linear
  const time = (fn: () => unknown) => {
    const started = performance.now();
    fn();
    return performance.now() - started;
  };

  it('highlights long runs of $ and unterminated /* comments in linear time', () => {
    expect(time(() => highlight('$'.repeat(200_000)))).toBeLessThan(500);
    expect(time(() => highlight('/* '.repeat(100_000)))).toBeLessThan(500);
  });

  it('compacts HTML with many unclosed tags in linear time and leaves code untouched', () => {
    expect(time(() => compactHtml('<pre'.repeat(50_000) + '\n   text'))).toBeLessThan(500);
    expect(time(() => compactHtml('<style>'.repeat(50_000)))).toBeLessThan(500);
    expect(compactHtml('<div>\n    <p>a</p>\n\n</div><PRE>\n  keep\n</PRE><script>\n  x\n</script>')).toBe(
      '<div>\n<p>a</p>\n</div><PRE>\n  keep\n</PRE><script>\n  x\n</script>'
    );
  });
});

describe('renderMarkdown', () => {
  it('keeps fenced code untouched while stripping MDX from the prose around it', () => {
    const html = renderMarkdown('<Tabs>\n\nHello\n\n```ts\nconst a = <Foo />;\n```\n\n</Tabs>', () => undefined);

    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('&lt;Foo /&gt;');
    expect(html).not.toContain('Tabs');
  });

  it('removes components whose attributes hold nested braces and template literals', () => {
    const source = [
      'Before',
      '',
      '<Tile icon="BoltIcon" href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Sends ${frontmatter.sends.length} messages`} description="Order lifecycle events" />',
      '',
      '<Tabs items={[{ label: "A > B" }]}>',
      '',
      'Inside',
      '',
      '</Tabs>',
      '',
      'After',
    ].join('\n');

    const html = renderMarkdown(source, () => undefined);

    expect(html).toBe('<p>Before</p>\n<p>Inside</p>\n<p>After</p>');
  });

  it('escapes raw HTML from the catalog', () => {
    const html = renderMarkdown('<script>alert(1)</script>', () => undefined);

    expect(html).not.toContain('<script>');
  });
});
