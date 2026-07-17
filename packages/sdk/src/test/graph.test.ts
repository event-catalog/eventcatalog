import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import utils from '../index';

const CATALOG_PATH = path.join(__dirname, 'catalog-graph');

const {
  getGraph,
  versionDomain,
  writeAdr,
  writeAgent,
  writeChannel,
  writeCommand,
  writeDataProduct,
  writeDataStore,
  writeDomain,
  writeEntity,
  writeEvent,
  writeFlow,
  writeQuery,
  writeService,
  writeSystem,
} = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

const writeCatalog = async () => {
  await writeDomain({
    id: 'payments',
    name: 'Payments',
    version: '1.0.0',
    markdown: '# Payments v1',
  });
  await versionDomain('payments');
  await writeDomain({
    id: 'payments',
    name: 'Payments',
    version: '2.0.0',
    markdown: '# Payments v2',
    domains: [{ id: 'fraud' }],
    systems: [{ id: 'payment-system' }],
    entities: [{ id: 'payment' }],
    flows: [{ id: 'payment-flow' }],
    dataProducts: [{ id: 'payment-data-product' }],
  });
  await writeDomain({
    id: 'fraud',
    name: 'Fraud',
    version: '1.0.0',
    markdown: '# Fraud',
    agents: [{ id: 'fraud-agent' }],
  });
  await writeSystem({
    id: 'payment-system',
    name: 'Payment System',
    version: '1.0.0',
    markdown: '# Payment System',
    services: [{ id: 'payment-service' }],
    flows: [{ id: 'payment-flow' }],
    entities: [{ id: 'payment' }],
    containers: [{ id: 'payment-db' }],
  });
  await writeService({
    id: 'payment-service',
    name: 'Payment Service',
    version: '1.0.0',
    markdown: '# Payment Service',
    sends: [{ id: 'payment-created', version: '1.0.0' }],
    receives: [{ id: 'request-payment', version: '1.0.0' }],
    writesTo: [{ id: 'payment-db' }],
  });
  await writeAgent({
    id: 'fraud-agent',
    name: 'Fraud Agent',
    version: '1.0.0',
    markdown: '# Fraud Agent',
    receives: [{ id: 'payment-created', version: '1.0.0' }],
    sends: [{ id: 'get-risk', version: '1.0.0' }],
  });
  await writeEvent({
    id: 'payment-created',
    name: 'Payment Created',
    version: '1.0.0',
    markdown: '# Payment Created',
    channels: [{ id: 'payments-topic' }],
  });
  await writeCommand({
    id: 'request-payment',
    name: 'Request Payment',
    version: '1.0.0',
    markdown: '# Request Payment',
  });
  await writeQuery({
    id: 'get-risk',
    name: 'Get Risk',
    version: '1.0.0',
    markdown: '# Get Risk',
  });
  await writeChannel({
    id: 'payments-topic',
    name: 'Payments Topic',
    version: '1.0.0',
    markdown: '# Payments Topic',
  });
  await writeEntity({
    id: 'payment',
    name: 'Payment',
    version: '1.0.0',
    markdown: '# Payment',
  });
  await writeDataStore({
    id: 'payment-db',
    name: 'Payment Database',
    version: '1.0.0',
    markdown: '# Payment Database',
    container_type: 'database',
  });
  await writeFlow({
    id: 'payment-flow',
    name: 'Payment Flow',
    version: '1.0.0',
    markdown: '# Payment Flow',
    steps: [],
  });
  await writeDataProduct({
    id: 'payment-data-product',
    name: 'Payment Data Product',
    version: '1.0.0',
    markdown: '# Payment Data Product',
    inputs: [{ id: 'payment-created' }],
    outputs: [{ id: 'payment-db' }],
  });
  await writeAdr({
    id: 'payments-adr',
    name: 'Payments ADR',
    version: '1.0.0',
    markdown: '# Payments ADR',
    status: 'accepted',
    date: '2026-07-15',
    appliesTo: [{ type: 'service', id: 'payment-service' }],
  });

  await writeDomain({
    id: 'ordering',
    name: 'Ordering',
    version: '1.0.0',
    markdown: '# Ordering',
    services: [{ id: 'ordering-service' }],
  });
  await writeService({
    id: 'ordering-service',
    name: 'Ordering Service',
    version: '1.0.0',
    markdown: '# Ordering Service',
    receives: [{ id: 'payment-created' }],
  });
  await writeAdr({
    id: 'ordering-adr',
    name: 'Ordering ADR',
    version: '1.0.0',
    markdown: '# Ordering ADR',
    status: 'accepted',
    date: '2026-07-15',
    appliesTo: [{ type: 'service', id: 'ordering-service' }],
  });
};

describe('Graph SDK', () => {
  it('when a domain is requested without a version, the latest domain and its related resources are returned', async () => {
    await writeCatalog();

    const graph = await getGraph({ type: 'domain', id: 'payments' });

    expect(graph).toEqual({
      root: { type: 'domain', id: 'payments', version: '2.0.0' },
      resources: [
        { type: 'domain', id: 'payments', version: '2.0.0' },
        { type: 'domain', id: 'fraud', version: '1.0.0' },
        { type: 'system', id: 'payment-system', version: '1.0.0' },
        { type: 'service', id: 'payment-service', version: '1.0.0' },
        { type: 'agent', id: 'fraud-agent', version: '1.0.0' },
        { type: 'event', id: 'payment-created', version: '1.0.0' },
        { type: 'command', id: 'request-payment', version: '1.0.0' },
        { type: 'query', id: 'get-risk', version: '1.0.0' },
        { type: 'channel', id: 'payments-topic', version: '1.0.0' },
        { type: 'entity', id: 'payment', version: '1.0.0' },
        { type: 'container', id: 'payment-db', version: '1.0.0' },
        { type: 'data-product', id: 'payment-data-product', version: '1.0.0' },
        { type: 'flow', id: 'payment-flow', version: '1.0.0' },
        { type: 'adr', id: 'payments-adr', version: '1.0.0' },
      ],
    });
  });

  it('when a specific domain version is requested, only that version and its related resources are returned', async () => {
    await writeCatalog();

    const graph = await getGraph({ type: 'domain', id: 'payments', version: '1.0.0' });

    expect(graph).toEqual({
      root: { type: 'domain', id: 'payments', version: '1.0.0' },
      resources: [{ type: 'domain', id: 'payments', version: '1.0.0' }],
    });
  });

  it('when a system is the graph root, resources outside the system are not returned', async () => {
    await writeCatalog();

    const graph = await getGraph({ type: 'system', id: 'payment-system' });

    expect(graph).toEqual({
      root: { type: 'system', id: 'payment-system', version: '1.0.0' },
      resources: [
        { type: 'system', id: 'payment-system', version: '1.0.0' },
        { type: 'service', id: 'payment-service', version: '1.0.0' },
        { type: 'event', id: 'payment-created', version: '1.0.0' },
        { type: 'command', id: 'request-payment', version: '1.0.0' },
        { type: 'channel', id: 'payments-topic', version: '1.0.0' },
        { type: 'entity', id: 'payment', version: '1.0.0' },
        { type: 'container', id: 'payment-db', version: '1.0.0' },
        { type: 'flow', id: 'payment-flow', version: '1.0.0' },
        { type: 'adr', id: 'payments-adr', version: '1.0.0' },
      ],
    });
  });

  it('when resources contain circular references, each resource is returned once', async () => {
    await writeDomain({
      id: 'domain-a',
      name: 'Domain A',
      version: '1.0.0',
      markdown: '# Domain A',
      domains: [{ id: 'domain-b' }],
    });
    await writeDomain({
      id: 'domain-b',
      name: 'Domain B',
      version: '1.0.0',
      markdown: '# Domain B',
      domains: [{ id: 'domain-a' }],
    });

    const graph = await getGraph({ type: 'domain', id: 'domain-a' });

    expect(graph).toEqual({
      root: { type: 'domain', id: 'domain-a', version: '1.0.0' },
      resources: [
        { type: 'domain', id: 'domain-a', version: '1.0.0' },
        { type: 'domain', id: 'domain-b', version: '1.0.0' },
      ],
    });
  });

  it('when the requested graph root does not exist, undefined is returned', async () => {
    const graph = await getGraph({ type: 'domain', id: 'missing-domain' });

    expect(graph).toEqual(undefined);
  });
});
