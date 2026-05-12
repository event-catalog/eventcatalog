import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Config } from '../eventcatalog.config';
import { collectSearchRecords, markdownToSearchText } from '../search-indexer';

const config = {
  title: 'Test catalog',
  tagline: false,
  organizationName: 'EventCatalog',
  homepageLink: 'https://eventcatalog.dev',
  editUrl: '',
  docs: { sidebar: {} },
} as Config;

let tempDirs: string[] = [];

const createTempCatalog = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-search-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe('markdownToSearchText', () => {
  it('extracts useful prose from Markdown and MDX without rendering components', () => {
    const text = markdownToSearchText(`
import Thing from './Thing.astro';

# Order Processing

<Tile title="Order support" description="Troubleshoot order failures" />

Read [[service|OrdersService]] and [the guide](/docs/custom/guide).
`);

    expect(text).toContain('Order Processing');
    expect(text).toContain('Order support');
    expect(text).toContain('Troubleshoot order failures');
    expect(text).toContain('OrdersService');
    expect(text).toContain('the guide');
    expect(text).not.toContain('import Thing');
  });
});

describe('collectSearchRecords', () => {
  it('indexes resource pages from source Markdown', async () => {
    const projectDir = await createTempCatalog();
    await fs.mkdir(path.join(projectDir, 'services', 'OrdersService'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'services', 'OrdersService', 'index.mdx'),
      `---
id: OrdersService
name: Orders Service
version: 1.0.0
summary: Handles customer orders.
owners:
  - platform
---

Creates and tracks customer orders.
`
    );

    const records = await collectSearchRecords({ projectDir, config });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      url: '/docs/services/OrdersService/1.0.0',
      title: 'Orders Service',
      type: 'Service',
      collection: 'services',
      id: 'OrdersService',
      version: '1.0.0',
      summary: 'Handles customer orders.',
    });
    expect(records[0].content).toContain('Creates and tracks customer orders');
    expect(records[0].content).toContain('platform');
  });

  it('does not index draft resources when draft is configured with a message', async () => {
    const projectDir = await createTempCatalog();
    await fs.mkdir(path.join(projectDir, 'services', 'DraftService'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'services', 'DraftService', 'index.mdx'),
      `---
id: DraftService
name: Draft Service
version: 1.0.0
draft:
  message: Not ready yet.
---

This should not be searchable.
`
    );

    const records = await collectSearchRecords({ projectDir, config });

    expect(records).toHaveLength(0);
  });

  it('indexes custom docs under /docs/custom', async () => {
    const projectDir = await createTempCatalog();
    await fs.mkdir(path.join(projectDir, 'docs', 'runbooks'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'docs', 'runbooks', 'orders.mdx'),
      `---
title: Orders Runbook
summary: Operational guide for orders.
---

Restart the order processor when the queue stalls.
`
    );

    const records = await collectSearchRecords({ projectDir, config });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      url: '/docs/custom/runbooks/orders',
      title: 'Orders Runbook',
      type: 'Custom Doc',
      collection: 'custom-docs',
      id: 'runbooks/orders',
    });
  });

  it('indexes resource docs against their owning resource URL space', async () => {
    const projectDir = await createTempCatalog();
    await fs.mkdir(path.join(projectDir, 'domains', 'Commerce', 'docs', 'adrs'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'domains', 'Commerce', 'index.mdx'),
      `---
id: Commerce
name: Commerce
version: 2.0.0
summary: Commerce domain.
---

Commerce overview.
`
    );
    await fs.writeFile(
      path.join(projectDir, 'domains', 'Commerce', 'docs', 'adrs', '01-events.md'),
      `---
title: Use Events
summary: Why the domain uses events.
---

Events decouple services.
`
    );

    const records = await collectSearchRecords({ projectDir, config });
    const doc = records.find((record) => record.type === 'Resource Doc');

    expect(doc).toMatchObject({
      url: '/docs/domains/Commerce/2.0.0/adrs/events',
      title: 'Use Events',
      type: 'Resource Doc',
      collection: 'adrs',
      id: 'events',
      version: '2.0.0',
    });
  });

  it('indexes resource docs under versioned resource folders with the versioned URL', async () => {
    const projectDir = await createTempCatalog();
    await fs.mkdir(path.join(projectDir, 'events', 'OrderCreated', 'versioned', '1.2.0', 'docs', 'guides'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'events', 'OrderCreated', 'versioned', '1.2.0', 'index.mdx'),
      `---
id: OrderCreated
name: Order Created
version: 1.2.0
summary: Published when an order is created.
---

Order created overview.
`
    );
    await fs.writeFile(
      path.join(projectDir, 'events', 'OrderCreated', 'versioned', '1.2.0', 'docs', 'guides', '01-consuming.md'),
      `---
title: Consuming Order Created
---

Use this event to trigger fulfilment.
`
    );

    const records = await collectSearchRecords({ projectDir, config });
    const doc = records.find((record) => record.type === 'Resource Doc');

    expect(doc).toMatchObject({
      url: '/docs/events/OrderCreated/1.2.0/guides/consuming',
      title: 'Consuming Order Created',
      type: 'Resource Doc',
      collection: 'guides',
      id: 'consuming',
      version: '1.2.0',
    });
  });
});
