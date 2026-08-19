import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import utils from '../index';

const CATALOG_PATH = path.join(__dirname, 'catalog-build-index');

const sdk = utils(CATALOG_PATH);

const rawHashFile = (contentPath: string) =>
  createHash('sha256')
    .update(fs.readFileSync(path.join(CATALOG_PATH, contentPath)))
    .digest('hex');

const hashFile = (contentPath: string) => `sha256:${rawHashFile(contentPath)}`;

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

// if hashContent is set to true the MDX content and schema files are hashed
// What it toggles
// hashContent: true (default) — for each resource, read the MDX file and the schema file, SHA-256 the bytes, put the digests in the index:

describe('buildIndex', () => {
  it('builds a valid index for an empty catalog', async () => {
    await expect(sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' })).resolves.toEqual({
      indexVersion: 1,
      source: 'acme/payments',
      commit: '4a1b7e2',
      resources: [],
    });
  });

  it('indexes resources from an already composed catalog', async () => {
    const federatedService = path.join(CATALOG_PATH, 'federated/acme/services/payment-service/index.mdx');
    fs.mkdirSync(path.dirname(federatedService), { recursive: true });
    fs.writeFileSync(federatedService, '---\nid: payment-service\nname: Payment service\n---\n# Federated');

    const index = await sdk.buildIndex({ source: 'composed-catalog', commit: 'abc1234' });

    expect(index.resources).toEqual([
      expect.objectContaining({
        id: 'payment-service',
        name: 'Payment service',
        contentPath: 'federated/acme/services/payment-service/index.mdx',
      }),
    ]);
  });

  it('can exclude federated resources when indexing local catalog ownership', async () => {
    const localService = path.join(CATALOG_PATH, 'services/payment-service/index.mdx');
    const federatedService = path.join(CATALOG_PATH, 'federated/acme/services/payment-service/index.mdx');
    const federatedOnlyService = path.join(CATALOG_PATH, 'federated/acme/services/order-service/index.mdx');
    const federatedEventWithLocalServiceId = path.join(CATALOG_PATH, 'federated/acme/events/payment-service/index.mdx');
    fs.mkdirSync(path.dirname(localService), { recursive: true });
    fs.mkdirSync(path.dirname(federatedService), { recursive: true });
    fs.mkdirSync(path.dirname(federatedOnlyService), { recursive: true });
    fs.mkdirSync(path.dirname(federatedEventWithLocalServiceId), { recursive: true });
    fs.writeFileSync(localService, '---\nid: payment-service\nname: Local payment service\n---\n# Local');
    fs.writeFileSync(federatedService, '---\nid: payment-service\nname: Federated payment service\n---\n# Federated');
    fs.writeFileSync(federatedOnlyService, '---\nid: order-service\nname: Federated order service\n---\n# Federated');
    fs.writeFileSync(
      federatedEventWithLocalServiceId,
      '---\nid: payment-service\nname: Federated event with local service ID\n---\n# Federated'
    );

    const index = await sdk.buildIndex({
      source: 'central-catalog',
      commit: 'local',
      includeFederated: false,
    });

    expect(index.resources).toEqual([
      expect.objectContaining({
        id: 'payment-service',
        name: 'Local payment service',
        contentPath: 'services/payment-service/index.mdx',
      }),
    ]);
  });

  it('excludes generated catalog resources', async () => {
    const localService = path.join(CATALOG_PATH, 'services/payment-service/index.mdx');
    const distService = path.join(CATALOG_PATH, 'dist/services/generated-service/index.mdx');
    const coreService = path.join(CATALOG_PATH, '.eventcatalog-core/services/cached-service/index.mdx');
    fs.mkdirSync(path.dirname(localService), { recursive: true });
    fs.mkdirSync(path.dirname(distService), { recursive: true });
    fs.mkdirSync(path.dirname(coreService), { recursive: true });
    fs.writeFileSync(localService, '---\nid: payment-service\nname: Payment service\n---\n# Local');
    fs.writeFileSync(distService, '---\nid: generated-service\nname: Generated service\n---\n# Generated');
    fs.writeFileSync(coreService, '---\nid: cached-service\nname: Cached service\n---\n# Cached');

    const index = await sdk.buildIndex({ source: 'acme/payments', commit: 'local' });

    expect(index.resources).toEqual([
      expect.objectContaining({
        id: 'payment-service',
        contentPath: 'services/payment-service/index.mdx',
      }),
    ]);
  });

  it('indexes teams and users from an already composed catalog using their federated paths', async () => {
    const federatedTeam = path.join(CATALOG_PATH, 'federated/acme/teams/payments-team.mdx');
    const federatedUser = path.join(CATALOG_PATH, 'federated/acme/users/alice.mdx');
    fs.mkdirSync(path.dirname(federatedTeam), { recursive: true });
    fs.mkdirSync(path.dirname(federatedUser), { recursive: true });
    fs.writeFileSync(federatedTeam, '---\nid: payments-team\nname: Payments team\nmembers:\n  - alice\n---\n# Team');
    fs.writeFileSync(federatedUser, '---\nid: alice\nname: Alice\n---\n# User');

    const index = await sdk.buildIndex({ source: 'composed-catalog', commit: 'abc1234' });

    expect(index.resources).toEqual([
      expect.objectContaining({
        type: 'team',
        id: 'payments-team',
        contentPath: 'federated/acme/teams/payments-team.mdx',
      }),
      expect.objectContaining({
        type: 'user',
        id: 'alice',
        contentPath: 'federated/acme/users/alice.mdx',
      }),
    ]);
  });

  it('indexes public files and components as assets', async () => {
    fs.mkdirSync(path.join(CATALOG_PATH, 'public/icons/languages'), { recursive: true });
    fs.mkdirSync(path.join(CATALOG_PATH, 'components'), { recursive: true });
    fs.writeFileSync(path.join(CATALOG_PATH, 'public/icons/languages/nodejs.svg'), '<svg>Node.js</svg>');
    fs.writeFileSync(path.join(CATALOG_PATH, 'components/TeamBadge.astro'), '<span>Team badge</span>');

    const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

    expect(index).toEqual({
      indexVersion: 1,
      source: 'acme/payments',
      commit: '4a1b7e2',
      resources: [],
      assets: [
        {
          path: 'components/TeamBadge.astro',
          hash: hashFile('components/TeamBadge.astro'),
        },
        {
          path: 'public/icons/languages/nodejs.svg',
          hash: hashFile('public/icons/languages/nodejs.svg'),
        },
      ],
    });
  });

  it('creates a basic index from resources from eventcatalog', async () => {
    await sdk.writeEvent({
      id: 'payment-captured',
      name: 'Payment Captured',
      version: '2.0.0',
      draft: true,
      diagrams: [{ id: 'payment-lifecycle', version: '1.0.0' }, { id: 'payment-errors' }],
      markdown: '# Payment Captured',
    });
    await sdk.writeService({
      id: 'payment-service',
      name: 'Payment Service',
      version: '1.0.0',
      deprecated: true,
      markdown: '# Payment Service',
    });

    const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

    expect(index).toEqual({
      indexVersion: 1,
      source: 'acme/payments',
      commit: '4a1b7e2',
      resources: [
        {
          type: 'event',
          id: 'payment-captured',
          version: '2.0.0',
          name: 'Payment Captured',
          draft: true,
          diagrams: [{ id: 'payment-lifecycle', version: '1.0.0' }, { id: 'payment-errors' }],
          contentPath: 'events/payment-captured/index.mdx',
          contentHash: hashFile('events/payment-captured/index.mdx'),
        },
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          deprecated: true,
          contentPath: 'services/payment-service/index.mdx',
          contentHash: hashFile('services/payment-service/index.mdx'),
        },
      ],
    });
  });

  it('indexes channels and channel pointers from messages', async () => {
    await sdk.writeChannel({
      id: 'payments.events',
      name: 'Payments Events',
      version: '2.0.0',
      address: 'payments.{region}.events',
      protocols: ['kafka'],
      deliveryGuarantee: 'at-least-once',
      routes: [{ id: 'payments.dead-letter', version: '1.0.0' }],
      parameters: {
        region: {
          enum: ['eu', 'us'],
          default: 'eu',
          examples: ['eu'],
        },
      },
      markdown: '# Payments Events',
    });
    await sdk.writeEvent({
      id: 'payment-captured',
      name: 'Payment Captured',
      version: '1.0.0',
      channels: [{ id: 'payments.events', version: '2.0.0', parameters: { region: 'eu' } }],
      markdown: '# Payment Captured',
    });

    const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

    expect(index).toEqual({
      indexVersion: 1,
      source: 'acme/payments',
      commit: '4a1b7e2',
      resources: [
        {
          type: 'channel',
          id: 'payments.events',
          version: '2.0.0',
          name: 'Payments Events',
          contentPath: 'channels/payments.events/index.mdx',
          contentHash: hashFile('channels/payments.events/index.mdx'),
          address: 'payments.{region}.events',
          protocols: ['kafka'],
          deliveryGuarantee: 'at-least-once',
          routes: [{ id: 'payments.dead-letter', version: '1.0.0' }],
          parameters: {
            region: {
              enum: ['eu', 'us'],
              default: 'eu',
              examples: ['eu'],
            },
          },
        },
        {
          type: 'event',
          id: 'payment-captured',
          version: '1.0.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/index.mdx',
          contentHash: hashFile('events/payment-captured/index.mdx'),
          channels: [{ id: 'payments.events', version: '2.0.0', parameters: { region: 'eu' } }],
        },
      ],
    });
  });

  it('does not hash resource content when `hashContent` is false', async () => {
    await sdk.writeEvent({
      id: 'payment-captured',
      name: 'Payment Captured',
      version: '2.0.0',
      markdown: '# Payment Captured',
    });

    const index = await sdk.buildIndex({
      source: 'acme/payments',
      commit: '4a1b7e2',
      hashContent: false,
    });

    expect(index).toEqual({
      indexVersion: 1,
      source: 'acme/payments',
      commit: '4a1b7e2',
      resources: [
        {
          type: 'event',
          id: 'payment-captured',
          version: '2.0.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/index.mdx',
        },
      ],
    });
  });

  it('verioned resources in eventcatalog are also in the index', async () => {
    await sdk.writeEvent({
      id: 'payment-captured',
      name: 'Payment Captured',
      version: '1.0.0',
      markdown: '',
    });
    await sdk.versionEvent('payment-captured');
    await sdk.writeEvent({
      id: 'payment-captured',
      name: 'Payment Captured',
      version: '2.0.0',
      markdown: '',
    });

    const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

    expect(index).toEqual({
      indexVersion: 1,
      source: 'acme/payments',
      commit: '4a1b7e2',
      resources: [
        {
          type: 'event',
          id: 'payment-captured',
          version: '2.0.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/index.mdx',
          contentHash: hashFile('events/payment-captured/index.mdx'),
        },
        {
          type: 'event',
          id: 'payment-captured',
          version: '1.0.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/versioned/1.0.0/index.mdx',
          contentHash: hashFile('events/payment-captured/versioned/1.0.0/index.mdx'),
        },
      ],
    });
  });

  it('hashes schemas and specifications relative to each resource version', async () => {
    await sdk.writeEvent({
      id: 'payment-captured',
      name: 'Payment Captured',
      version: '1.0.0',
      schemaPath: 'schema.json',
      markdown: '# Payment Captured v1',
    });
    await sdk.addSchemaToEvent('payment-captured', {
      fileName: 'schema.json',
      schema: '{"version":1}',
    });
    await sdk.versionEvent('payment-captured');
    await sdk.writeEvent({
      id: 'payment-captured',
      name: 'Payment Captured',
      version: '2.0.0',
      schemaPath: 'schema.json',
      markdown: '# Payment Captured v2',
    });
    await sdk.addSchemaToEvent('payment-captured', {
      fileName: 'schema.json',
      schema: '{"version":2}',
    });

    await sdk.writeService({
      id: 'payment-service',
      name: 'Payment Service',
      version: '1.0.0',
      specifications: { openapiPath: 'openapi.yaml' },
      markdown: '# Payment Service v1',
    });
    await sdk.addFileToService('payment-service', {
      fileName: 'openapi.yaml',
      content: 'openapi: 3.0.0',
    });
    await sdk.versionService('payment-service');
    await sdk.writeService({
      id: 'payment-service',
      name: 'Payment Service',
      version: '2.0.0',
      specifications: { openapiPath: 'openapi.yaml' },
      markdown: '# Payment Service v2',
    });
    await sdk.addFileToService('payment-service', {
      fileName: 'openapi.yaml',
      content: 'openapi: 3.1.0',
    });

    const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

    expect(index).toEqual({
      indexVersion: 1,
      source: 'acme/payments',
      commit: '4a1b7e2',
      resources: [
        {
          type: 'event',
          id: 'payment-captured',
          version: '2.0.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/index.mdx',
          contentHash: hashFile('events/payment-captured/index.mdx'),
          schemas: [
            {
              path: 'schema.json',
              default: true,
              hash: hashFile('events/payment-captured/schema.json'),
            },
          ],
        },
        {
          type: 'event',
          id: 'payment-captured',
          version: '1.0.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/versioned/1.0.0/index.mdx',
          contentHash: hashFile('events/payment-captured/versioned/1.0.0/index.mdx'),
          schemas: [
            {
              path: 'schema.json',
              default: true,
              hash: hashFile('events/payment-captured/versioned/1.0.0/schema.json'),
            },
          ],
        },
        {
          type: 'service',
          id: 'payment-service',
          version: '2.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash: hashFile('services/payment-service/index.mdx'),
          specifications: [
            {
              type: 'openapi',
              path: 'openapi.yaml',
              hash: hashFile('services/payment-service/openapi.yaml'),
            },
          ],
        },
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/versioned/1.0.0/index.mdx',
          contentHash: hashFile('services/payment-service/versioned/1.0.0/index.mdx'),
          specifications: [
            {
              type: 'openapi',
              path: 'openapi.yaml',
              hash: hashFile('services/payment-service/versioned/1.0.0/openapi.yaml'),
            },
          ],
        },
      ],
    });
  });

  it('returns resources in stable type, id, and version order regardless of creation order', async () => {
    await sdk.writeService({ id: 'z-service', name: 'Z Service', version: '1.0.0', markdown: '# Z Service' });
    await sdk.writeEvent({ id: 'z-event', name: 'Z Event', version: '1.0.0', markdown: '# Z Event' });
    await sdk.writeEvent({ id: 'a-event', name: 'A Event', version: '1.0.0', markdown: '# A Event v1' });
    await sdk.versionEvent('a-event');
    await sdk.writeEvent({ id: 'a-event', name: 'A Event', version: '2.0.0', markdown: '# A Event v2' });
    await sdk.writeCommand({ id: 'a-command', name: 'A Command', version: '1.0.0', markdown: '# A Command' });

    const first = await sdk.buildIndex({ source: 'acme/catalog', commit: 'abc1234' });
    const second = await sdk.buildIndex({ source: 'acme/catalog', commit: 'abc1234' });
    const expectedIndex = {
      indexVersion: 1,
      source: 'acme/catalog',
      commit: 'abc1234',
      resources: [
        {
          type: 'command',
          id: 'a-command',
          version: '1.0.0',
          name: 'A Command',
          contentPath: 'commands/a-command/index.mdx',
          contentHash: hashFile('commands/a-command/index.mdx'),
        },
        {
          type: 'event',
          id: 'a-event',
          version: '2.0.0',
          name: 'A Event',
          contentPath: 'events/a-event/index.mdx',
          contentHash: hashFile('events/a-event/index.mdx'),
        },
        {
          type: 'event',
          id: 'a-event',
          version: '1.0.0',
          name: 'A Event',
          contentPath: 'events/a-event/versioned/1.0.0/index.mdx',
          contentHash: hashFile('events/a-event/versioned/1.0.0/index.mdx'),
        },
        {
          type: 'event',
          id: 'z-event',
          version: '1.0.0',
          name: 'Z Event',
          contentPath: 'events/z-event/index.mdx',
          contentHash: hashFile('events/z-event/index.mdx'),
        },
        {
          type: 'service',
          id: 'z-service',
          version: '1.0.0',
          name: 'Z Service',
          contentPath: 'services/z-service/index.mdx',
          contentHash: hashFile('services/z-service/index.mdx'),
        },
      ],
    };

    expect(first).toEqual(expectedIndex);
    expect(second).toEqual(expectedIndex);
  });

  it('indexes resource owners when they are set', async () => {
    await sdk.writeEvent({
      id: 'payment-captured',
      name: 'Payment Captured',
      version: '2.0.0',
      markdown: '# Payment Captured',
      owners: ['team-payments', 'team-platform'],
    });

    const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

    expect(index).toEqual({
      indexVersion: 1,
      source: 'acme/payments',
      commit: '4a1b7e2',
      resources: [
        {
          type: 'event',
          id: 'payment-captured',
          version: '2.0.0',
          name: 'Payment Captured',
          owners: ['team-payments', 'team-platform'],
          contentPath: 'events/payment-captured/index.mdx',
          contentHash: hashFile('events/payment-captured/index.mdx'),
        },
      ],
    });
  });

  describe('domains', () => {
    it('indexes domain relationships with and without versions', async () => {
      await sdk.writeDomain({
        id: 'payments',
        name: 'Payments',
        version: '1.0.0',
        markdown: '# Payments',
        services: [{ id: 'payment-service', version: '1.0.0' }, { id: 'refund-service' }],
        agents: [{ id: 'fraud-agent', version: '2.0.0' }, { id: 'support-agent' }],
        domains: [{ id: 'commerce', version: '1.0.0' }, { id: 'reporting' }],
        systems: [{ id: 'payment-processing', version: '3.0.0' }, { id: 'ledger' }],
        entities: [{ id: 'payment', version: '1.0.0' }, { id: 'refund' }],
        dataProducts: [{ id: 'payment-analytics', version: '1.0.0' }, { id: 'finance-reporting' }],
        flows: [{ id: 'checkout', version: '2.0.0' }, { id: 'issue-refund' }],
        sends: [{ id: 'payment-captured', version: '2.0.0' }, { id: 'payment-failed' }],
        receives: [{ id: 'capture-payment', version: '1.0.0' }, { id: 'refund-payment' }],
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'domain',
            id: 'payments',
            version: '1.0.0',
            name: 'Payments',
            contentPath: 'domains/payments/index.mdx',
            contentHash: hashFile('domains/payments/index.mdx'),
            services: [{ id: 'payment-service', version: '1.0.0' }, { id: 'refund-service' }],
            agents: [{ id: 'fraud-agent', version: '2.0.0' }, { id: 'support-agent' }],
            domains: [{ id: 'commerce', version: '1.0.0' }, { id: 'reporting' }],
            systems: [{ id: 'payment-processing', version: '3.0.0' }, { id: 'ledger' }],
            entities: [{ id: 'payment', version: '1.0.0' }, { id: 'refund' }],
            dataProducts: [{ id: 'payment-analytics', version: '1.0.0' }, { id: 'finance-reporting' }],
            flows: [{ id: 'checkout', version: '2.0.0' }, { id: 'issue-refund' }],
            sends: [{ id: 'payment-captured', version: '2.0.0' }, { id: 'payment-failed' }],
            receives: [{ id: 'capture-payment', version: '1.0.0' }, { id: 'refund-payment' }],
          },
        ],
      });
    });

    it('indexes ubiquitous language and changelogs as sidecars beside a resource', async () => {
      await sdk.writeDomain({
        id: 'payments',
        name: 'Payments',
        version: '1.0.0',
        markdown: '# Payments',
      });
      await sdk.addUbiquitousLanguageToDomain('payments', {
        dictionary: [
          {
            id: 'payment',
            name: 'Payment',
            summary: 'An exchange of money for goods or services.',
          },
        ],
      });
      await sdk.writeChangelog('payments', {
        createdAt: '2026-08-07',
        markdown: '### Added payment terminology',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'domain',
            id: 'payments',
            version: '1.0.0',
            name: 'Payments',
            contentPath: 'domains/payments/index.mdx',
            contentHash: hashFile('domains/payments/index.mdx'),
            sidecars: [
              {
                path: 'domains/payments/changelog.mdx',
                hash: hashFile('domains/payments/changelog.mdx'),
              },
              {
                path: 'domains/payments/ubiquitous-language.mdx',
                hash: hashFile('domains/payments/ubiquitous-language.mdx'),
              },
            ],
          },
        ],
      });
    });

    it('indexes resource-level docs as sidecars', async () => {
      await sdk.writeDomain({
        id: 'payments',
        name: 'Payments',
        version: '1.0.0',
        markdown: '# Payments',
      });
      fs.mkdirSync(path.join(CATALOG_PATH, 'domains/payments/docs'), { recursive: true });
      fs.mkdirSync(path.join(CATALOG_PATH, 'domains/payments/docs/runbooks'), { recursive: true });
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/docs/onboarding.mdx'), '# Onboarding');
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/docs/runbook.mdx'), '# Runbook');
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/docs/runbooks/incident-response.mdx'), '# Incident Response');
      fs.writeFileSync(
        path.join(CATALOG_PATH, 'domains/payments/docs/runbooks/category.json'),
        JSON.stringify({ label: 'Operational Runbooks', position: 1 })
      );

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'domain',
            id: 'payments',
            version: '1.0.0',
            name: 'Payments',
            contentPath: 'domains/payments/index.mdx',
            contentHash: hashFile('domains/payments/index.mdx'),
            sidecars: [
              {
                path: 'domains/payments/docs/onboarding.mdx',
                hash: hashFile('domains/payments/docs/onboarding.mdx'),
              },
              {
                path: 'domains/payments/docs/runbook.mdx',
                hash: hashFile('domains/payments/docs/runbook.mdx'),
              },
              {
                path: 'domains/payments/docs/runbooks/category.json',
                hash: hashFile('domains/payments/docs/runbooks/category.json'),
              },
              {
                path: 'domains/payments/docs/runbooks/incident-response.mdx',
                hash: hashFile('domains/payments/docs/runbooks/incident-response.mdx'),
              },
            ],
          },
        ],
      });
    });

    it('indexes arbitrary files within each resource boundary as sidecars', async () => {
      await sdk.writeDomain({
        id: 'payments',
        name: 'Payments',
        version: '1.0.0',
        markdown: '# Payments',
      });
      await sdk.writeServiceToDomain(
        {
          id: 'payment-service',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '# Payment Service',
        },
        { id: 'payments' }
      );
      fs.mkdirSync(path.join(CATALOG_PATH, 'domains/payments/attachments'), { recursive: true });
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/attachments/context.txt'), 'Domain context');
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/services/payment-service/schema.sql'), 'CREATE TABLE payments;');

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'domain',
            id: 'payments',
            version: '1.0.0',
            name: 'Payments',
            contentPath: 'domains/payments/index.mdx',
            contentHash: hashFile('domains/payments/index.mdx'),
            sidecars: [
              {
                path: 'domains/payments/attachments/context.txt',
                hash: hashFile('domains/payments/attachments/context.txt'),
              },
            ],
          },
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'domains/payments/services/payment-service/index.mdx',
            contentHash: hashFile('domains/payments/services/payment-service/index.mdx'),
            sidecars: [
              {
                path: 'domains/payments/services/payment-service/schema.sql',
                hash: hashFile('domains/payments/services/payment-service/schema.sql'),
              },
            ],
          },
        ],
      });
    });

    it('ignores common non-content files while collecting resource sidecars', async () => {
      await sdk.writeDomain({
        id: 'payments',
        name: 'Payments',
        version: '1.0.0',
        markdown: '# Payments',
      });
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/notes.txt'), 'Useful notes');
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/.DS_Store'), 'finder metadata');
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/Thumbs.db'), 'windows metadata');
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/.gitkeep'), '');
      fs.mkdirSync(path.join(CATALOG_PATH, 'domains/payments/node_modules/example'), { recursive: true });
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/node_modules/example/index.js'), 'generated dependency');

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index.resources[0].sidecars).toEqual([
        {
          path: 'domains/payments/notes.txt',
          hash: hashFile('domains/payments/notes.txt'),
        },
      ]);
    });

    it('honors an optional .eventcatalogignore when collecting resource sidecars', async () => {
      await sdk.writeDomain({
        id: 'payments',
        name: 'Payments',
        version: '1.0.0',
        markdown: '# Payments',
      });
      fs.writeFileSync(path.join(CATALOG_PATH, '.eventcatalogignore'), ['**/*.log', 'domains/payments/generated/**'].join('\n'));
      fs.mkdirSync(path.join(CATALOG_PATH, 'domains/payments/attachments'), { recursive: true });
      fs.mkdirSync(path.join(CATALOG_PATH, 'domains/payments/generated'), { recursive: true });
      fs.mkdirSync(path.join(CATALOG_PATH, 'public/logs'), { recursive: true });
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/attachments/context.txt'), 'Domain context');
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/attachments/debug.log'), 'Debug output');
      fs.writeFileSync(path.join(CATALOG_PATH, 'domains/payments/generated/report.json'), '{"generated":true}');
      fs.writeFileSync(path.join(CATALOG_PATH, 'public/logs/debug.log'), 'Public debug output');

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index.resources[0].sidecars).toEqual([
        {
          path: 'domains/payments/attachments/context.txt',
          hash: hashFile('domains/payments/attachments/context.txt'),
        },
      ]);
      expect(index.assets).toBeUndefined();
    });
  });

  describe('systems', () => {
    it('indexes system relationships with and without versions', async () => {
      await sdk.writeSystem({
        id: 'payment-processing',
        name: 'Payment Processing',
        version: '1.0.0',
        markdown: '# Payment Processing',
        services: [{ id: 'payment-service', version: '1.0.0' }, { id: 'refund-service' }],
        flows: [{ id: 'checkout', version: '2.0.0' }, { id: 'issue-refund' }],
        entities: [{ id: 'payment', version: '1.0.0' }, { id: 'refund' }],
        containers: [{ id: 'payments-database', version: '2.0.0' }, { id: 'audit-log' }],
        relationships: [
          { id: 'stripe', version: '1.0.0', label: 'charges through' },
          { id: 'fraud-detection', label: 'screens with' },
        ],
        actors: [
          { id: 'customer', name: 'Customer', label: 'initiates payments', direction: 'inbound' },
          { id: 'operator', direction: 'outbound' },
        ],
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'system',
            id: 'payment-processing',
            version: '1.0.0',
            name: 'Payment Processing',
            contentPath: 'systems/payment-processing/index.mdx',
            contentHash: hashFile('systems/payment-processing/index.mdx'),
            services: [{ id: 'payment-service', version: '1.0.0' }, { id: 'refund-service' }],
            flows: [{ id: 'checkout', version: '2.0.0' }, { id: 'issue-refund' }],
            entities: [{ id: 'payment', version: '1.0.0' }, { id: 'refund' }],
            containers: [{ id: 'payments-database', version: '2.0.0' }, { id: 'audit-log' }],
            relationships: [
              { id: 'stripe', version: '1.0.0', label: 'charges through' },
              { id: 'fraud-detection', label: 'screens with' },
            ],
            actors: [
              { id: 'customer', name: 'Customer', label: 'initiates payments', direction: 'inbound' },
              { id: 'operator', direction: 'outbound' },
            ],
          },
        ],
      });
    });
  });

  describe('services', () => {
    it('indexes service relationships with and without versions', async () => {
      await sdk.writeService({
        id: 'payment-service',
        name: 'Payment Service',
        version: '1.0.0',
        markdown: '# Payment Service',
        sends: [{ id: 'payment-captured', version: '2.0.0' }, { id: 'payment-failed' }],
        receives: [{ id: 'capture-payment', version: '1.0.0' }, { id: 'refund-payment' }],
        entities: [{ id: 'payment', version: '1.0.0' }, { id: 'ledger-entry' }],
        writesTo: [{ id: 'payments-database', version: '2.0.0' }, { id: 'audit-log' }],
        readsFrom: [{ id: 'customer-database', version: '3.0.0' }, { id: 'exchange-rates' }],
        flows: [{ id: 'checkout', version: '2.0.0' }, { id: 'issue-refund' }],
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: hashFile('services/payment-service/index.mdx'),
            sends: [{ id: 'payment-captured', version: '2.0.0' }, { id: 'payment-failed' }],
            receives: [{ id: 'capture-payment', version: '1.0.0' }, { id: 'refund-payment' }],
            entities: [{ id: 'payment', version: '1.0.0' }, { id: 'ledger-entry' }],
            writesTo: [{ id: 'payments-database', version: '2.0.0' }, { id: 'audit-log' }],
            readsFrom: [{ id: 'customer-database', version: '3.0.0' }, { id: 'exchange-rates' }],
            flows: [{ id: 'checkout', version: '2.0.0' }, { id: 'issue-refund' }],
          },
        ],
      });
    });

    it('indexes the channels used to send and receive messages', async () => {
      await sdk.writeService({
        id: 'payment-service',
        name: 'Payment Service',
        version: '1.0.0',
        markdown: '# Payment Service',
        sends: [
          {
            id: 'payment-captured',
            version: '2.0.0',
            to: [{ id: 'payments-topic', version: '1.0.0' }, { id: 'audit-topic' }],
          },
        ],
        receives: [
          {
            id: 'capture-payment',
            version: '1.0.0',
            from: [{ id: 'payments-commands', version: '2.0.0' }, { id: 'retry-queue' }],
          },
        ],
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: hashFile('services/payment-service/index.mdx'),
            sends: [
              {
                id: 'payment-captured',
                version: '2.0.0',
                to: [{ id: 'payments-topic', version: '1.0.0' }, { id: 'audit-topic' }],
              },
            ],
            receives: [
              {
                id: 'capture-payment',
                version: '1.0.0',
                from: [{ id: 'payments-commands', version: '2.0.0' }, { id: 'retry-queue' }],
              },
            ],
          },
        ],
      });
    });

    it('normalizes and hashes service specifications', async () => {
      await sdk.writeService({
        id: 'payment-service',
        name: 'Payment Service',
        version: '1.0.0',
        markdown: '# Payment Service',
        specifications: {
          asyncapiPath: 'asyncapi.yaml',
          openapiPath: 'openapi.yaml',
          graphqlPath: 'schema.graphql',
        },
      });
      await sdk.addFileToService('payment-service', {
        fileName: 'asyncapi.yaml',
        content: 'asyncapi: 3.0.0',
      });
      await sdk.addFileToService('payment-service', {
        fileName: 'openapi.yaml',
        content: 'openapi: 3.1.0',
      });
      await sdk.addFileToService('payment-service', {
        fileName: 'schema.graphql',
        content: 'type Query { payment: Payment }',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: hashFile('services/payment-service/index.mdx'),
            specifications: [
              {
                type: 'asyncapi',
                path: 'asyncapi.yaml',
                hash: hashFile('services/payment-service/asyncapi.yaml'),
              },
              {
                type: 'openapi',
                path: 'openapi.yaml',
                hash: hashFile('services/payment-service/openapi.yaml'),
              },
              {
                type: 'graphql',
                path: 'schema.graphql',
                hash: hashFile('services/payment-service/schema.graphql'),
              },
            ],
          },
        ],
      });
    });

    it('does not hash service specifications when `hashContent` is false', async () => {
      await sdk.writeService({
        id: 'payment-service',
        name: 'Payment Service',
        version: '1.0.0',
        markdown: '# Payment Service',
        specifications: {
          asyncapiPath: 'asyncapi.yaml',
        },
      });
      await sdk.addFileToService('payment-service', {
        fileName: 'asyncapi.yaml',
        content: 'asyncapi: 3.0.0',
      });

      const index = await sdk.buildIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        hashContent: false,
      });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            specifications: [
              {
                type: 'asyncapi',
                path: 'asyncapi.yaml',
              },
            ],
          },
        ],
      });
    });
  });

  describe('data products', () => {
    it('indexes data product inputs and outputs with and without versions', async () => {
      await sdk.writeDataProduct({
        id: 'payment-analytics',
        name: 'Payment Analytics',
        version: '1.0.0',
        markdown: '# Payment Analytics',
        inputs: [{ id: 'payment-captured', version: '2.0.0' }, { id: 'payment-failed' }],
        outputs: [{ id: 'daily-payments', version: '1.0.0' }, { id: 'refund-report' }],
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'data-product',
            id: 'payment-analytics',
            version: '1.0.0',
            name: 'Payment Analytics',
            contentPath: 'data-products/payment-analytics/index.mdx',
            contentHash: hashFile('data-products/payment-analytics/index.mdx'),
            inputs: [{ id: 'payment-captured', version: '2.0.0' }, { id: 'payment-failed' }],
            outputs: [{ id: 'daily-payments', version: '1.0.0' }, { id: 'refund-report' }],
          },
        ],
      });
    });
  });

  describe('data stores', () => {
    it('indexes data stores as containers', async () => {
      await sdk.writeDataStore({
        id: 'payments-database',
        name: 'Payments Database',
        version: '1.0.0',
        markdown: '# Payments Database',
        container_type: 'database',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'container',
            id: 'payments-database',
            version: '1.0.0',
            name: 'Payments Database',
            container_type: 'database',
            contentPath: 'containers/payments-database/index.mdx',
            contentHash: hashFile('containers/payments-database/index.mdx'),
          },
        ],
      });
    });
  });

  describe('entities', () => {
    it('indexes entities', async () => {
      await sdk.writeEntity({
        id: 'payment',
        name: 'Payment',
        version: '1.0.0',
        markdown: '# Payment',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'entity',
            id: 'payment',
            version: '1.0.0',
            name: 'Payment',
            contentPath: 'entities/payment/index.mdx',
            contentHash: hashFile('entities/payment/index.mdx'),
          },
        ],
      });
    });
  });

  describe('flows', () => {
    it('flattens flow step pointers into references', async () => {
      await sdk.writeFlow({
        id: 'payment-capture-flow',
        name: 'Payment Capture',
        version: '1.0.0',
        owners: ['team-payments'],
        markdown: '# Payment Capture',
        steps: [
          {
            id: 'payment-service',
            title: 'Capture payment',
            service: { id: 'payment-service' },
            next_step: 'payment-captured',
          },
          {
            id: 'payment-captured',
            title: 'Publish payment captured',
            message: { id: 'payment-captured', version: '2.0.0' },
            next_step: 'ledger-service',
          },
          {
            id: 'ledger-service',
            title: 'Record payment',
            service: { id: 'ledger-service' },
            next_step: 'payments-db',
          },
          {
            id: 'payments-db',
            title: 'Store payment',
            container: { id: 'payments-db' },
            next_step: 'settlement-flow',
          },
          {
            id: 'settlement-flow',
            title: 'Settle payment',
            flow: { id: 'settlement-flow' },
          },
        ],
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'flow',
            id: 'payment-capture-flow',
            version: '1.0.0',
            name: 'Payment Capture',
            owners: ['team-payments'],
            contentPath: 'flows/payment-capture-flow/index.mdx',
            contentHash: hashFile('flows/payment-capture-flow/index.mdx'),
            references: [
              { kind: 'service', id: 'payment-service' },
              { kind: 'message', id: 'payment-captured', version: '2.0.0' },
              { kind: 'service', id: 'ledger-service' },
              { kind: 'container', id: 'payments-db' },
              { kind: 'flow', id: 'settlement-flow' },
            ],
          },
        ],
      });
    });
  });

  describe('ADRs', () => {
    it('indexes ADR relationships with and without versions', async () => {
      await sdk.writeAdr(
        {
          id: 'adr-118',
          name: 'Use Avro for all payment events',
          version: '1.0.0',
          owners: ['team-architecture'],
          status: 'accepted',
          date: '2026-08-07',
          appliesTo: [
            { type: 'service', id: 'payment-service' },
            { type: 'event', id: 'payment-captured', version: '2.0.0' },
            { type: 'domain', id: 'finance' },
          ],
          supersedes: [{ id: 'adr-092' }],
          supersededBy: [],
          amends: [],
          amendedBy: [{ id: 'adr-131' }],
          related: [{ id: 'adr-104' }],
          markdown: '# Use Avro for all payment events',
        },
        { path: '/118-avro-for-payment-events' }
      );

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'adr',
            id: 'adr-118',
            version: '1.0.0',
            name: 'Use Avro for all payment events',
            owners: ['team-architecture'],
            status: 'accepted',
            appliesTo: [
              { type: 'service', id: 'payment-service' },
              { type: 'event', id: 'payment-captured', version: '2.0.0' },
              { type: 'domain', id: 'finance' },
            ],
            supersedes: [{ id: 'adr-092' }],
            supersededBy: [],
            amends: [],
            amendedBy: [{ id: 'adr-131' }],
            related: [{ id: 'adr-104' }],
            contentPath: 'adrs/118-avro-for-payment-events/index.mdx',
            contentHash: hashFile('adrs/118-avro-for-payment-events/index.mdx'),
          },
        ],
      });
    });
  });

  describe('agents', () => {
    it('indexes agent relationships with and without versions', async () => {
      await sdk.writeAgent({
        id: 'payment-support-agent',
        name: 'Payment Support Agent',
        version: '1.0.0',
        markdown: '# Payment Support Agent',
        sends: [
          {
            id: 'support-response',
            version: '2.0.0',
            to: [{ id: 'support-responses', version: '1.0.0' }],
          },
          { id: 'escalation-requested' },
        ],
        receives: [
          {
            id: 'support-request',
            version: '1.0.0',
            from: [{ id: 'support-requests' }],
          },
          { id: 'customer-replied' },
        ],
        writesTo: [{ id: 'support-memory', version: '2.0.0' }, { id: 'audit-log' }],
        readsFrom: [{ id: 'payments-database', version: '3.0.0' }, { id: 'customer-database' }],
        flows: [{ id: 'resolve-payment-issue', version: '1.0.0' }, { id: 'escalate-payment-issue' }],
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'agent',
            id: 'payment-support-agent',
            version: '1.0.0',
            name: 'Payment Support Agent',
            contentPath: 'agents/payment-support-agent/index.mdx',
            contentHash: hashFile('agents/payment-support-agent/index.mdx'),
            sends: [
              {
                id: 'support-response',
                version: '2.0.0',
                to: [{ id: 'support-responses', version: '1.0.0' }],
              },
              { id: 'escalation-requested' },
            ],
            receives: [
              {
                id: 'support-request',
                version: '1.0.0',
                from: [{ id: 'support-requests' }],
              },
              { id: 'customer-replied' },
            ],
            writesTo: [{ id: 'support-memory', version: '2.0.0' }, { id: 'audit-log' }],
            readsFrom: [{ id: 'payments-database', version: '3.0.0' }, { id: 'customer-database' }],
            flows: [{ id: 'resolve-payment-issue', version: '1.0.0' }, { id: 'escalate-payment-issue' }],
          },
        ],
      });
    });
  });

  describe('teams', () => {
    it('indexes teams and their members', async () => {
      await sdk.writeTeam({
        id: 'team-payments',
        name: 'Payments Team',
        members: ['alice', 'bob'],
        markdown: '# Payments Team',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'team',
            id: 'team-payments',
            name: 'Payments Team',
            members: ['alice', 'bob'],
            contentPath: 'teams/team-payments.mdx',
            contentHash: hashFile('teams/team-payments.mdx'),
          },
        ],
      });
    });
  });

  describe('users', () => {
    it('indexes users', async () => {
      await sdk.writeUser({
        id: 'alice',
        name: 'Alice',
        markdown: '# Alice',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'user',
            id: 'alice',
            name: 'Alice',
            contentPath: 'users/alice.mdx',
            contentHash: hashFile('users/alice.mdx'),
          },
        ],
      });
    });
  });

  describe('diagrams', () => {
    it('indexes diagrams', async () => {
      await sdk.writeDiagram({
        id: 'payment-lifecycle',
        name: 'Payment Lifecycle',
        version: '1.0.0',
        markdown: '# Payment Lifecycle',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'diagram',
            id: 'payment-lifecycle',
            version: '1.0.0',
            name: 'Payment Lifecycle',
            contentPath: 'diagrams/payment-lifecycle/index.mdx',
            contentHash: hashFile('diagrams/payment-lifecycle/index.mdx'),
          },
        ],
      });
    });
  });

  describe('messages', () => {
    it('indexes commands', async () => {
      await sdk.writeCommand({
        id: 'capture-payment',
        name: 'Capture Payment',
        version: '1.0.0',
        markdown: '# Capture Payment',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'command',
            id: 'capture-payment',
            version: '1.0.0',
            name: 'Capture Payment',
            contentPath: 'commands/capture-payment/index.mdx',
            contentHash: hashFile('commands/capture-payment/index.mdx'),
          },
        ],
      });
    });

    it('indexes queries', async () => {
      await sdk.writeQuery({
        id: 'get-payment',
        name: 'Get Payment',
        version: '1.0.0',
        markdown: '# Get Payment',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'query',
            id: 'get-payment',
            version: '1.0.0',
            name: 'Get Payment',
            contentPath: 'queries/get-payment/index.mdx',
            contentHash: hashFile('queries/get-payment/index.mdx'),
          },
        ],
      });
    });

    it('normalizes schemaPath into the schemas array', async () => {
      await sdk.writeEvent({
        id: 'payment-captured',
        name: 'Payment Captured',
        version: '2.0.0',
        markdown: '# Payment Captured',
        schemaPath: 'schema.avsc',
      });
      await sdk.addSchemaToEvent('payment-captured', {
        fileName: 'schema.avsc',
        schema: '{"type":"record","name":"PaymentCaptured","fields":[]}',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
            contentHash: hashFile('events/payment-captured/index.mdx'),
            schemas: [
              {
                path: 'schema.avsc',
                default: true,
                hash: hashFile('events/payment-captured/schema.avsc'),
              },
            ],
          },
        ],
      });
    });

    it('normalizes and hashes multiple schemas', async () => {
      await sdk.writeEvent({
        id: 'payment-captured',
        name: 'Payment Captured',
        version: '2.0.0',
        markdown: '# Payment Captured',
        schemas: [
          {
            id: 'avro',
            file: 'schema.avsc',
            format: 'avro',
            environments: ['production'],
            default: true,
          },
          { id: 'json', path: 'schema.json', format: 'json-schema' },
        ],
      });
      await sdk.addFileToEvent('payment-captured', {
        fileName: 'schema.avsc',
        content: '{"type":"record","name":"PaymentCaptured","fields":[]}',
      });
      await sdk.addFileToEvent('payment-captured', {
        fileName: 'schema.json',
        content: '{"type":"object","properties":{}}',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2' });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
            contentHash: hashFile('events/payment-captured/index.mdx'),
            schemas: [
              {
                id: 'avro',
                path: 'schema.avsc',
                format: 'avro',
                environments: ['production'],
                default: true,
                hash: hashFile('events/payment-captured/schema.avsc'),
              },
              {
                id: 'json',
                path: 'schema.json',
                format: 'json-schema',
                hash: hashFile('events/payment-captured/schema.json'),
              },
            ],
          },
        ],
      });
    });

    it('does not hash schemas when `hashContent` is false', async () => {
      await sdk.writeEvent({
        id: 'payment-captured',
        name: 'Payment Captured',
        version: '2.0.0',
        markdown: '# Payment Captured',
        schemaPath: 'schema.avsc',
      });
      await sdk.addSchemaToEvent('payment-captured', {
        fileName: 'schema.avsc',
        schema: '{"type":"record","name":"PaymentCaptured","fields":[]}',
      });

      const index = await sdk.buildIndex({ source: 'acme/payments', commit: '4a1b7e2', hashContent: false });

      expect(index).toEqual({
        indexVersion: 1,
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
            schemas: [
              {
                path: 'schema.avsc',
                default: true,
              },
            ],
          },
        ],
      });
    });
  });
});
