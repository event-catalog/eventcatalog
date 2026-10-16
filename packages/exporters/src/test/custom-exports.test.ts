import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import createSDK from '@eventcatalog/sdk';
import { RESOURCE_LINK } from '../html/markdown';
import {
  CustomExportError,
  formatCustomExportReport,
  parseCustomExport,
  renderCustomExports,
  writeCustomExports,
  type CustomExportsConfig,
  type RenderedCustomExport,
} from '../custom-exports';

const CATALOG_PATH = path.join(__dirname, 'catalog-documents-test');

const {
  writeEvent,
  writeCommand,
  writeService,
  writeAgent,
  writeDomain,
  writeTeam,
  writeDataStore,
  writeFlow,
  writeSystem,
  addSchemaToEvent,
} = createSDK(CATALOG_PATH);

/**
 * Payments: a system (Payment API, Payment Worker, the payments database) in a domain with a Fraud API. The Payment API
 * sends PaymentSucceeded to the Order Service (in no domain) and listens to the Fraud API.
 */
const seedCatalog = async () => {
  await writeTeam({ id: 'payments-team', name: 'Payments Team', email: 'payments@acme.test', markdown: '' });
  await writeEvent({
    id: 'PaymentSucceeded',
    name: 'Payment Succeeded',
    version: '1.0.0',
    owners: ['payments-team'],
    markdown: '',
  });
  await writeEvent({
    id: 'FraudCheckPassed',
    name: 'Fraud Check Passed',
    version: '1.0.0',
    markdown: 'Raised by the [[service|FraudAPI]].',
  });
  await writeCommand({ id: 'AuthorizePayment', name: 'Authorize Payment', version: '1.0.0', markdown: '' });
  await writeDataStore({ id: 'payments-db', name: 'Payments DB', version: '1.0.0', container_type: 'database', markdown: '' });
  await writeService({
    id: 'PaymentAPI',
    name: 'Payment API',
    version: '1.0.0',
    owners: ['payments-team'],
    repository: { url: 'https://github.com/acme/payment-api' },
    sends: [{ id: 'PaymentSucceeded' }],
    receives: [{ id: 'AuthorizePayment' }, { id: 'FraudCheckPassed' }],
    writesTo: [{ id: 'payments-db' }],
    markdown: '',
  });
  await writeService({
    id: 'PaymentWorker',
    name: 'Payment Worker',
    version: '1.0.0',
    writesTo: [{ id: 'payments-db' }],
    markdown: '',
  });
  await writeService({ id: 'FraudAPI', name: 'Fraud API', version: '1.0.0', sends: [{ id: 'FraudCheckPassed' }], markdown: '' });
  await writeService({
    id: 'OrderService',
    name: 'Order Service',
    version: '1.0.0',
    receives: [{ id: 'PaymentSucceeded' }],
    markdown: '',
  });
  await writeSystem({
    id: 'payment-processing',
    name: 'Payment Processing',
    version: '1.0.0',
    services: [{ id: 'PaymentAPI' }, { id: 'PaymentWorker' }],
    containers: [{ id: 'payments-db' }],
    markdown: '',
  } as any);
  await writeDomain({
    id: 'Payments',
    name: 'Payments',
    version: '1.0.0',
    systems: [{ id: 'payment-processing' }],
    services: [{ id: 'FraudAPI' }],
    markdown: '',
  } as any);
};

const writeExportFile = (name: string, source: string) => {
  fs.mkdirSync(path.join(CATALOG_PATH, 'exports'), { recursive: true });
  fs.writeFileSync(path.join(CATALOG_PATH, 'exports', name), source);
};

const render = async (frontmatter: string, { config = {}, body = '' }: { config?: CustomExportsConfig; body?: string } = {}) => {
  writeExportFile('partners.mdx', `---\n${frontmatter.trim()}\n---\n${body}`);
  const {
    rendered: [exported],
    failed,
  } = await renderCustomExports(CATALOG_PATH, { config });
  if (failed.length) throw failed[0].error;
  return exported;
};

const sectionOf = (document: RenderedCustomExport, anchor: string) => {
  const start = document.html.indexOf(`id="${anchor}"`);
  return start === -1 ? '' : document.html.slice(start, document.html.indexOf('</section>', start));
};
const ids = (document: RenderedCustomExport) => document.report.included.map((r) => `${r.kind}:${r.id}`).sort();

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('custom export files', () => {
  it('read their frontmatter as what the export includes, and their body as its introduction', () => {
    const spec = parseCustomExport(
      `---\ntitle: Payments for partners\nversion: 2026.10\ninclude:\n  - system: payment-processing\n  - service: checkout-api\n    version: 1.x\n  - data-store: payments-db\n---\n\nWelcome!`,
      { fallbackId: 'partners' }
    );

    expect(spec).toMatchObject({
      id: 'partners',
      title: 'Payments for partners',
      version: '2026.10',
      include: [
        { kind: 'system', id: 'payment-processing' },
        { kind: 'service', id: 'checkout-api', version: '1.x' },
        { kind: 'container', id: 'payments-db' },
      ],
      exclude: [],
      hide: ['owners', 'repository', 'contacts', 'docs'],
      references: 'omit',
      intro: 'Welcome!',
    });
  });

  it('take their defaults from the config, and say everything that is wrong with them at once', () => {
    expect(
      parseCustomExport('---\ntitle: T\ninclude:\n  - event: A\n---\n', {
        fallbackId: 'd',
        defaults: { hide: [], references: 'name-only' },
      })
    ).toMatchObject({ hide: [], references: 'name-only' });

    let error: unknown;
    try {
      parseCustomExport('---\ninclude:\n  - widget: A\nhide: [secrets]\nreferences: all\ntheme: dark\n---\n', {
        fallbackId: 'd',
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CustomExportError);
    expect((error as CustomExportError).problems).toEqual([
      'title is missing',
      expect.stringContaining('"widget" isn\'t a resource kind'),
      expect.stringContaining('hide: "secrets" can\'t be hidden'),
      expect.stringContaining('references: "all"'),
      expect.stringContaining('"theme" isn\'t a custom export field'),
    ]);
  });
});

describe('custom exports', () => {
  it('include what a system holds, and drop every pointer out of the export', async () => {
    await seedCatalog();

    const document = await render(`title: Payments for partners\ninclude:\n  - system: payment-processing`);

    expect(ids(document)).toEqual([
      'command:AuthorizePayment',
      'container:payments-db',
      'event:FraudCheckPassed',
      'event:PaymentSucceeded',
      'service:PaymentAPI',
      'service:PaymentWorker',
      'system:payment-processing',
    ]);
    expect(document.report.included.find((r) => r.id === 'PaymentAPI')?.reason).toBe('in system payment-processing');
    // The Order Service consumes PaymentSucceeded, and the domain holds the system: neither is named
    expect(document.html).not.toContain('Order Service');
    expect(document.html).not.toContain('Fraud API');
    expect(document.html).not.toContain('href="#domain-Payments"');
    expect(document.report.links).toContainEqual({
      from: 'event PaymentSucceeded',
      to: 'service OrderService',
      action: 'dropped',
      reason: 'not in this export',
    });
    expect(sectionOf(document, 'event-PaymentSucceeded')).toContain('Nothing in this document.');
  });

  it('show pointers out of the export as plain names with references: name-only', async () => {
    await seedCatalog();

    const document = await render(`title: Payments\nreferences: name-only\ninclude:\n  - event: PaymentSucceeded`);

    expect(sectionOf(document, 'event-PaymentSucceeded')).toContain('Order Service');
    expect(document.html).not.toContain('href="#service-OrderService"');
    expect(document.report.links.find((l) => l.to === 'service OrderService')?.action).toBe('named');
  });

  it('pull in what included resources point at with references: include, one level only', async () => {
    await seedCatalog();

    const document = await render(`title: Payments\nreferences: include\ninclude:\n  - service: PaymentAPI`);

    expect(ids(document)).toContain('event:PaymentSucceeded');
    expect(ids(document)).toContain('container:payments-db');
    expect(document.report.included.find((r) => r.id === 'PaymentSucceeded')?.reason).toBe('referenced by service PaymentAPI');
    // Its system, but not what's in the system: the Payment Worker is two levels away (PaymentAPI → system → worker)
    expect(ids(document)).toContain('system:payment-processing');
    expect(ids(document)).not.toContain('service:PaymentWorker');
    expect(document.html).not.toContain('Payment Worker');
  });

  it('never name what exclude took out, even with references: name-only', async () => {
    await seedCatalog();

    const document = await render(
      `title: Payments\nreferences: name-only\nhide: [owners]\ninclude:\n  - domain: Payments\nexclude:\n  - service: FraudAPI\n  - data-store: payments-db`
    );

    expect(ids(document)).not.toContain('service:FraudAPI');
    expect(ids(document)).not.toContain('container:payments-db');
    expect(document.html).not.toContain('Fraud API');
    expect(document.html).not.toContain('FraudAPI');
    expect(document.html).not.toContain('Payments DB');
    // FraudCheckPassed's docs link to the Fraud API
    expect(sectionOf(document, 'event-FraudCheckPassed')).toContain('Raised by the another service.');
    expect(document.report.excluded.map((r) => r.id).sort()).toEqual(['FraudAPI', 'payments-db']);
    expect(document.report.links.find((l) => l.to === 'service FraudAPI')).toMatchObject({
      action: 'dropped',
      reason: 'exclude',
    });
  });

  it('leave out what an excluded service would have brought with it', async () => {
    await seedCatalog();

    const document = await render(`title: Payments\ninclude:\n  - system: payment-processing\nexclude:\n  - service: PaymentAPI`);

    expect(ids(document)).toEqual(['container:payments-db', 'service:PaymentWorker', 'system:payment-processing']);
    expect(document.report.excluded).toEqual([
      expect.objectContaining({ id: 'PaymentAPI', reason: 'exclude, was in system payment-processing' }),
    ]);
  });

  it('leave out what neverExport in the config names, whatever an export includes', async () => {
    await seedCatalog();

    const document = await render(`title: Payments\ninclude:\n  - domain: Payments\n  - service: FraudAPI`, {
      config: { neverExport: [{ service: 'FraudAPI' }] },
    });

    expect(ids(document)).not.toContain('service:FraudAPI');
    expect(document.report.excluded[0]).toMatchObject({ id: 'FraudAPI', reason: expect.stringContaining('neverExport') });
  });

  it('hide owners, repositories, contacts and docs unless the export asks for them', async () => {
    await seedCatalog();

    const hidden = await render(
      `title: Payments\ninclude:\n  - service: PaymentAPI\n  - team: payments-team\n  - event: FraudCheckPassed`
    );
    expect(sectionOf(hidden, 'service-PaymentAPI')).not.toContain('Owned by');
    expect(sectionOf(hidden, 'service-PaymentAPI')).not.toContain('No owner listed');
    expect(hidden.html).not.toContain('github.com/acme/payment-api');
    expect(hidden.html).not.toContain('payments@acme.test');
    expect(hidden.html).not.toContain('Raised by the');

    const shown = await render(
      `title: Payments\nhide: []\ninclude:\n  - service: PaymentAPI\n  - team: payments-team\n  - event: FraudCheckPassed`
    );
    expect(sectionOf(shown, 'service-PaymentAPI')).toContain('Owned by');
    expect(shown.html).toContain('github.com/acme/payment-api');
    expect(shown.html).toContain('payments@acme.test');
    expect(shown.html).toContain('Raised by the another service.');
  });

  it('hide ownership from the team side too: no Owns box, and a team brings in nothing it owns', async () => {
    await seedCatalog();

    const hidden = await render(`title: Payments\ninclude:\n  - team: payments-team\n  - event: PaymentSucceeded`);
    expect(hidden.html).not.toContain('<span>Owns</span>');
    expect(hidden.html).not.toMatch(/Owns \d+ resource/);
    expect(hidden.model.teams[0].owns).toEqual([]);

    const pulled = await render(`title: Team\nreferences: include\ninclude:\n  - team: payments-team`);
    expect(ids(pulled)).toEqual(['team:payments-team']);

    const shown = await render(`title: Payments\nhide: []\ninclude:\n  - team: payments-team\n  - event: PaymentSucceeded`);
    expect(shown.html).toContain('<span>Owns</span>');
  });

  it('report what they could not find, and docs that link outside them', async () => {
    await seedCatalog();

    const document = await render(
      `title: Payments\nhide: [owners]\ninclude:\n  - event: FraudCheckPassed\n  - service: PaymentAPI\n    version: 2.x\n  - service: Nope`
    );

    expect(document.report.unmatched).toEqual([
      { field: 'include', selector: 'service PaymentAPI (2.x)', reason: "only version 1.0.0 is exported, which isn't 2.x" },
      { field: 'include', selector: 'service Nope', reason: 'not in the catalog' },
    ]);
    expect(document.report.mentions).toEqual([
      { from: 'event FraudCheckPassed', to: 'service FraudAPI', shownAs: 'another service' },
    ]);
    expect(sectionOf(document, 'event-FraudCheckPassed')).not.toContain('FraudAPI');
    const text = formatCustomExportReport(document.report);
    expect(text).toContain('Included (1)');
    expect(text).toContain('Not found (2)');
    expect(text).toContain('event FraudCheckPassed  →  service FraudAPI  (shown as "another service")');
  });

  it('keep flow steps that lead outside the export, without naming what they point at', async () => {
    await seedCatalog();
    await writeFlow({
      id: 'pay',
      name: 'Pay',
      version: '1.0.0',
      markdown: '',
      steps: [
        { id: 'authorise', title: 'Authorise', message: { id: 'AuthorizePayment' }, next_step: 'orders' },
        { id: 'orders', title: 'Order Service', service: { id: 'OrderService' } },
      ],
    } as any);

    const document = await render(`title: Paying\ninclude:\n  - flow: pay\n  - command: AuthorizePayment`);
    const flow = sectionOf(document, 'flow-pay');

    expect(flow).toContain('href="#command-AuthorizePayment"');
    expect(flow).toContain('A step outside this document');
    expect(flow).not.toContain('Order Service');
  });

  it('render as their own page, with their title and introduction', async () => {
    await seedCatalog();

    const document = await render(
      `title: Payments for partners\nsummary: How to take payment.\naudience: Partners\nversion: 2026.10\ninclude:\n  - event: PaymentSucceeded`,
      { body: '\nListen for [[event|PaymentSucceeded]].\n' }
    );

    expect(document.html).toContain('<title>Payments for partners · EventCatalog</title>');
    expect(document.html).toContain('<h1>Payments for partners</h1>');
    expect(document.html).toContain('For <b>Partners</b>');
    expect(document.html).toContain('Version 2026.10');
    expect(document.html).toContain('<a href="#event-PaymentSucceeded">Payment Succeeded</a>');
    expect(document.html).not.toContain('Regenerate this reference');
  });

  it('are written one file each, from the exports folder', async () => {
    await seedCatalog();
    writeExportFile('partners.mdx', '---\ntitle: Partners\ninclude:\n  - event: PaymentSucceeded\n---\n');
    writeExportFile('regulator.md', '---\nid: audit\ntitle: Audit\ninclude:\n  - data-store: payments-db\n---\n');
    const outputDir = path.join(CATALOG_PATH, 'dist', 'exports');

    const { written } = await writeCustomExports({ dir: CATALOG_PATH, outputDir, config: {} });

    expect(written.map((d) => path.relative(CATALOG_PATH, d.path)).sort()).toEqual([
      path.join('dist', 'exports', 'audit.html'),
      path.join('dist', 'exports', 'partners.html'),
    ]);
    expect(fs.readFileSync(path.join(outputDir, 'audit.html'), 'utf-8')).toContain('<h1>Audit</h1>');

    const only = await writeCustomExports({ dir: CATALOG_PATH, outputDir, config: { only: ['audit'] } });
    expect(only.written.map((d) => d.spec.id)).toEqual(['audit']);
    const { failed } = await renderCustomExports(CATALOG_PATH, { only: ['nope'], config: {} });
    expect(failed).toEqual([
      { id: 'nope', error: expect.objectContaining({ message: expect.stringContaining('No custom export "nope" in exports/') }) },
    ]);
    expect(failed[0].error.problems).toEqual(['Custom exports: audit, partners']);
  });

  it('are each exported on their own: one with problems is reported, and the others are still written', async () => {
    await seedCatalog();
    writeExportFile('partners.mdx', '---\ntitle: Partners\ninclude:\n  - event: PaymentSucceeded\n---\n');
    writeExportFile('broken.mdx', '---\ntitle: [unclosed\n---\n');
    writeExportFile('invalid.mdx', '---\ntitle: Invalid\ninclude:\n  - widget: A\n---\n');
    writeExportFile('empty.mdx', '---\ntitle: Empty\ninclude:\n  - service: Nope\n---\n');
    const outputDir = path.join(CATALOG_PATH, 'dist', 'exports');

    const { written, failed } = await writeCustomExports({ dir: CATALOG_PATH, outputDir, config: {} });

    expect(written.map((d) => d.spec.id)).toEqual(['partners']);
    expect(fs.existsSync(path.join(outputDir, 'partners.html'))).toBe(true);
    expect(failed.map((f) => [f.id, f.file])).toEqual([
      ['broken', path.join('exports', 'broken.mdx')],
      ['invalid', path.join('exports', 'invalid.mdx')],
      ['empty', path.join('exports', 'empty.mdx')],
    ]);
    expect(failed[0].error.message).toContain("isn't valid YAML");
    expect(failed[1].error.problems).toEqual([expect.stringContaining('"widget" isn\'t a resource kind')]);
    expect(failed[2].error.message).toContain('has nothing in it');
  });

  it('report a file that fails under the id its frontmatter gives, not only its file name', async () => {
    await seedCatalog();
    writeExportFile('partner.mdx', '---\nid: public\ninclude:\n  - event: PaymentSucceeded\n---\n');

    const { failed } = await renderCustomExports(CATALOG_PATH, { only: ['public'], config: {} });

    expect(failed).toEqual([
      expect.objectContaining({
        id: 'public',
        file: path.join('exports', 'partner.mdx'),
        error: expect.objectContaining({ problems: ['title is missing'] }),
      }),
    ]);
  });

  it('refuse to export with a config file that cannot be loaded, rather than drop its neverExport', async () => {
    await seedCatalog();
    writeExportFile('partners.mdx', '---\ntitle: Partners\ninclude:\n  - event: PaymentSucceeded\n---\n');
    fs.writeFileSync(path.join(CATALOG_PATH, 'eventcatalog.config.js'), 'export default {{ broken');
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderCustomExports(CATALOG_PATH)).rejects.toThrow("eventcatalog.config.js couldn't be loaded");
    quiet.mockRestore();
  });

  it('leave out both files that claim the same id, since either could be the one meant', async () => {
    await seedCatalog();
    writeExportFile('partners.mdx', '---\ntitle: Partners\ninclude:\n  - event: PaymentSucceeded\n---\n');
    writeExportFile('a.mdx', '---\nid: audit\ntitle: A\ninclude:\n  - event: PaymentSucceeded\n---\n');
    writeExportFile('b.mdx', '---\nid: audit\ntitle: B\ninclude:\n  - event: PaymentSucceeded\n---\n');

    const { rendered, failed } = await renderCustomExports(CATALOG_PATH, { config: {} });

    expect(rendered.map((d) => d.spec.id)).toEqual(['partners']);
    expect(failed.map((f) => f.file)).toEqual([path.join('exports', 'a.mdx'), path.join('exports', 'b.mdx')]);
    expect(failed[0].error.message).toContain('are all the custom export "audit"');
  });

  it('read resource links with spaces around the id, and stay fast on text that only looks like one', async () => {
    await seedCatalog();

    const linked = await render(`title: Payments\ninclude:\n  - event: PaymentSucceeded`, {
      body: 'See [[event|  PaymentSucceeded ]], sent by the [[service | OrderService]].',
    });
    expect(linked.html).toContain('href="#event-PaymentSucceeded"');
    expect(linked.report.mentions).toEqual([
      { from: 'the introduction', to: 'service OrderService', shownAs: 'another service' },
    ]);

    // The pattern alone, timed: the patterns before it took seconds on these (quadratic), this one milliseconds
    for (const text of [`[[-|${' '.repeat(100_000)}`, `[[-|${'[[-|\\'.repeat(40_000)}`]) {
      const started = performance.now();
      text.replace(RESOURCE_LINK, '');
      expect(performance.now() - started).toBeLessThan(250);
    }
  });

  it('hide example payloads with hide: examples, including the one made from the schema', async () => {
    await seedCatalog();
    await writeEvent(
      { id: 'RefundIssued', name: 'Refund Issued', version: '1.0.0', markdown: '', schemaPath: 'schema.json' },
      { override: true }
    );
    await addSchemaToEvent('RefundIssued', {
      schema: JSON.stringify({ type: 'object', properties: { amount: { type: 'number' } } }),
      fileName: 'schema.json',
    });
    const exampleTab = /data-i="\d+">Example<\/button>/;

    const shown = await render(`title: Refunds\ninclude:\n  - event: RefundIssued`);
    expect(shown.model.messages[0].schema?.example).toBeDefined();
    expect(shown.html).toMatch(exampleTab);

    const hidden = await render(`title: Refunds\nhide: [examples]\ninclude:\n  - event: RefundIssued`);
    expect(hidden.model.messages[0].schema?.example).toBeUndefined();
    expect(hidden.html).not.toMatch(exampleTab);
  });

  it('match service selectors to services, and to an agent only when no service has the id', async () => {
    await seedCatalog();
    await writeAgent({ id: 'PaymentAPI', name: 'Payment Agent', version: '1.0.0', markdown: '' });
    await writeAgent({ id: 'SupportAgent', name: 'Support Agent', version: '1.0.0', markdown: '' });

    const both = await render(`title: Services\ninclude:\n  - service: PaymentAPI\n  - service: SupportAgent`);
    expect(ids(both)).toEqual(['agent:SupportAgent', 'service:PaymentAPI']);

    const byKind = await render(`title: Services\ninclude:\n  - service: SupportAgent\nexclude:\n  - service: PaymentAPI`);
    expect(ids(byKind)).toEqual(['agent:SupportAgent']);
  });

  it('refuse a custom export with nothing in it', async () => {
    await seedCatalog();

    await expect(render(`title: Empty\ninclude:\n  - service: Nope`)).rejects.toThrow('has nothing in it');
  });
});

describe('custom exports chosen by custom properties', () => {
  /** The seeded catalog, with custom properties on some of it: the system and two events are public. */
  const seedWithProperties = async () => {
    await seedCatalog();
    await writeSystem(
      {
        id: 'payment-processing',
        name: 'Payment Processing',
        version: '1.0.0',
        services: [{ id: 'PaymentAPI' }, { id: 'PaymentWorker' }],
        containers: [{ id: 'payments-db' }],
        markdown: '',
        'x-public': true,
      } as any,
      { override: true }
    );
    await writeEvent({
      id: 'RefundIssued',
      name: 'Refund Issued',
      version: '1.0.0',
      markdown: '',
      'x-public': 'true',
      'x-audience': ['partners', 'regulators'],
    });
    await writeEvent({ id: 'LedgerPosted', name: 'Ledger Posted', version: '1.0.0', markdown: '', 'x-public': false });
    await writeService(
      {
        id: 'PaymentWorker',
        name: 'Payment Worker',
        version: '1.0.0',
        writesTo: [{ id: 'payments-db' }],
        markdown: '',
        'x-internal': true,
        'x-cost-centre': 'payments-engineering',
      },
      { override: true }
    );
  };

  it('read x- fields in a selector as custom properties to match, narrowed by kind', () => {
    const spec = parseCustomExport(
      '---\ntitle: T\ninclude:\n  - x-public: true\n  - x-tier: [1, 2]\n    kind: [service, data-store]\nexclude:\n  - x-internal: true\n---\n',
      { fallbackId: 'd' }
    );

    expect(spec.include).toEqual([
      { properties: { 'x-public': ['true'] } },
      { properties: { 'x-tier': ['1', '2'] }, kinds: ['service', 'container'] },
    ]);
    expect(spec.exclude).toEqual([{ properties: { 'x-internal': ['true'] } }]);
  });

  it('refuse property selectors that also name a resource, take a version, or match an object', () => {
    let error: unknown;
    try {
      parseCustomExport(
        '---\ntitle: T\ninclude:\n  - x-public: true\n    service: PaymentAPI\n  - x-public: true\n    version: 1.x\n  - x-on-call:\n      schedule: primary\n  - x-public: true\n    kind: widget\n---\n',
        { fallbackId: 'd' }
      );
    } catch (e) {
      error = e;
    }
    expect((error as CustomExportError).problems).toEqual([
      expect.stringContaining('not both'),
      expect.stringContaining('version goes with one resource'),
      expect.stringContaining("an object or an empty value can't be matched"),
      expect.stringContaining('kind "widget" isn\'t a resource kind'),
    ]);
  });

  it('include every resource with the property, with what a matched system holds', async () => {
    await seedWithProperties();

    const document = await render(`title: Public\ninclude:\n  - x-public: true`);

    expect(ids(document)).toEqual([
      'command:AuthorizePayment',
      'container:payments-db',
      'event:FraudCheckPassed',
      'event:PaymentSucceeded',
      'event:RefundIssued',
      'service:PaymentAPI',
      'service:PaymentWorker',
      'system:payment-processing',
    ]);
    expect(document.report.included).toContainEqual(
      expect.objectContaining({ id: 'RefundIssued', reason: 'include x-public: true' })
    );
    expect(document.report.included).toContainEqual(
      expect.objectContaining({ id: 'PaymentWorker', reason: 'in system payment-processing' })
    );
  });

  it('match any of several values, and a list when any of its items matches', async () => {
    await seedWithProperties();

    const document = await render(`title: Regulators\ninclude:\n  - x-audience: [regulators, auditors]\n    kind: message`);

    expect(ids(document)).toEqual(['event:RefundIssued']);
  });

  it('take out what has an excluded property, wherever it came from', async () => {
    await seedWithProperties();

    const document = await render(`title: Public\ninclude:\n  - x-public: true\nexclude:\n  - x-internal: true`);

    expect(ids(document)).not.toContain('service:PaymentWorker');
    expect(document.report.excluded).toEqual([
      expect.objectContaining({ id: 'PaymentWorker', reason: 'exclude x-internal: true, was in system payment-processing' }),
    ]);
  });

  it('leave out what neverExport matches by property, with values from the config as written', async () => {
    await seedWithProperties();

    const document = await render(`title: Payments\ninclude:\n  - system: payment-processing`, {
      config: { neverExport: [{ 'x-internal': true }] },
    });

    expect(ids(document)).not.toContain('service:PaymentWorker');
    expect(document.report.excluded[0]).toMatchObject({
      id: 'PaymentWorker',
      reason: 'neverExport in eventcatalog.config.js x-internal: true, was in system payment-processing',
    });
  });

  it('report a property that nothing has', async () => {
    await seedWithProperties();

    const document = await render(`title: Public\ninclude:\n  - x-public: true\n  - x-partner: acme\n    kind: service`);

    expect(document.report.unmatched).toEqual([
      { field: 'include', selector: 'service with x-partner: acme', reason: 'nothing in the catalog has it' },
    ]);
  });

  it('never put the custom properties themselves in the export', async () => {
    await seedWithProperties();

    const document = await render(`title: Payments\ninclude:\n  - system: payment-processing`);

    expect(document.model.services.every((s) => Object.keys(s.properties).length === 0)).toBe(true);
    expect(document.html).not.toContain('payments-engineering');
  });
});
