import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils, { matchesProperty } from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-properties');

const { writeEvent, writeService, writeDomain, writeEventToService, versionEvent, getResourcesByProperty } = utils(CATALOG_PATH);

beforeEach(async () => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });

  await writeDomain({ id: 'Payments', name: 'Payments', version: '1.0.0', markdown: '', 'x-public': true });
  await writeService({
    id: 'PaymentAPI',
    name: 'Payment API',
    version: '1.0.0',
    markdown: '',
    'x-public': true,
    'x-tier': 1,
    'x-audience': ['partners', 'public'],
  });
  await writeService({ id: 'PaymentWorker', name: 'Payment Worker', version: '1.0.0', markdown: '', 'x-tier': 2 });
  await writeEventToService(
    { id: 'PaymentTaken', name: 'Payment Taken', version: '1.0.0', markdown: '', 'x-public': 'true' },
    { id: 'PaymentAPI' }
  );
  await writeEvent({ id: 'Internal', name: 'Internal', version: '1.0.0', markdown: '', 'x-public': false });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

const ids = (resources: { type: string; id: string }[]) => resources.map((r) => `${r.type}:${r.id}`).sort();

describe('getResourcesByProperty', () => {
  it('returns every resource with the property, with its kind and value', async () => {
    const resources = await getResourcesByProperty('x-public');
    expect(ids(resources)).toEqual(['domain:Payments', 'event:Internal', 'event:PaymentTaken', 'service:PaymentAPI']);
    expect(resources.find((r) => r.id === 'PaymentAPI')).toMatchObject({
      type: 'service',
      version: '1.0.0',
      value: true,
      latest: true,
    });
  });

  it('matches a value as text, whether the frontmatter has true or "true"', async () => {
    expect(ids(await getResourcesByProperty('x-public', { equals: true }))).toEqual([
      'domain:Payments',
      'event:PaymentTaken',
      'service:PaymentAPI',
    ]);
    expect(ids(await getResourcesByProperty('x-public', { equals: 'false' }))).toEqual(['event:Internal']);
  });

  it('matches any of several values, and a list when any of its items matches', async () => {
    expect(ids(await getResourcesByProperty('x-tier', { in: [1, 2] }))).toEqual(['service:PaymentAPI', 'service:PaymentWorker']);
    expect(ids(await getResourcesByProperty('x-audience', { equals: 'partners' }))).toEqual(['service:PaymentAPI']);
  });

  it('narrows by kind of resource', async () => {
    expect(ids(await getResourcesByProperty('x-public', { equals: true, types: ['event'] }))).toEqual(['event:PaymentTaken']);
  });

  it('includes older versions unless latestOnly is set', async () => {
    await versionEvent('PaymentTaken');
    await writeEventToService(
      { id: 'PaymentTaken', name: 'Payment Taken', version: '2.0.0', markdown: '', 'x-public': 'true' },
      { id: 'PaymentAPI' }
    );

    const all = await getResourcesByProperty('x-public', { types: ['event'], equals: true });
    expect(all.map((r) => [r.version, r.latest]).sort()).toEqual([
      ['1.0.0', false],
      ['2.0.0', true],
    ]);
    const latest = await getResourcesByProperty('x-public', { types: ['event'], equals: true, latestOnly: true });
    expect(latest.map((r) => r.version)).toEqual(['2.0.0']);
  });

  it('sees resources written after the first lookup', async () => {
    expect(await getResourcesByProperty('x-region')).toEqual([]);
    await writeEvent({ id: 'Refunded', name: 'Refunded', version: '1.0.0', markdown: '', 'x-region': 'eu' });
    expect(ids(await getResourcesByProperty('x-region', { equals: 'eu' }))).toEqual(['event:Refunded']);
  });

  it('take the kind from the collection a resource is in, whatever its own folder is called', async () => {
    await writeService({ id: 'events', name: 'Events', version: '1.0.0', markdown: '', 'x-region': 'eu' });
    await writeService({ id: 'examples', name: 'Examples', version: '1.0.0', markdown: '', 'x-region': 'eu' });

    expect(ids(await getResourcesByProperty('x-region', { types: ['service'] }))).toEqual(['service:events', 'service:examples']);
  });

  it("find resources inside a parent called examples, and skip index files in a resource's own examples", async () => {
    const write = (file: string, id: string) => {
      fs.mkdirSync(path.join(CATALOG_PATH, path.dirname(file)), { recursive: true });
      fs.writeFileSync(path.join(CATALOG_PATH, file), `---\nid: ${id}\nname: ${id}\nversion: 1.0.0\nx-zone: a\n---\n`);
    };
    write('domains/examples/services/Inside/index.mdx', 'Inside');
    write('events/Placed/examples/sample/index.mdx', 'Sample');

    expect(ids(await getResourcesByProperty('x-zone'))).toEqual(['service:Inside']);
  });

  it('mark a resource inside an older version of its parent as not the latest', async () => {
    const file = path.join(CATALOG_PATH, 'domains', 'Orders', 'versioned', '0.1.0', 'services', 'Old', 'index.mdx');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '---\nid: Old\nname: Old\nversion: 0.1.0\nx-zone: a\n---\n');

    expect(await getResourcesByProperty('x-zone', { latestOnly: true })).toEqual([]);
    expect((await getResourcesByProperty('x-zone')).map((r) => [r.type, r.id, r.latest])).toEqual([['service', 'Old', false]]);
  });

  it('only takes custom properties', async () => {
    await expect(getResourcesByProperty('owners')).rejects.toThrow('custom properties start with "x-"');
  });
});

describe('matchesProperty', () => {
  it('compares values as text', () => {
    expect(matchesProperty(true, ['true'])).toBe(true);
    expect(matchesProperty(1, ['1'])).toBe(true);
    expect(matchesProperty('eu', ['us'])).toBe(false);
  });

  it('matches a date written without quotes against the same date as text', () => {
    expect(matchesProperty(new Date('2027-02-10'), ['2027-02-10'])).toBe(true);
  });

  it('matches a list when any item matches, and never an object', () => {
    expect(matchesProperty(['partners', 'public'], ['public'])).toBe(true);
    expect(matchesProperty({ schedule: 'primary' }, ['primary'])).toBe(false);
    expect(matchesProperty(null, ['null'])).toBe(false);
  });
});
