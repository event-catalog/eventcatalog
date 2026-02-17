import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import createSDK from '@eventcatalog/sdk';
import { importFromDSL } from '../cli/import';

const CATALOG_PATH = path.join(__dirname, 'catalog-import-test');
const DSL_PATH = path.join(CATALOG_PATH, 'example.ec');

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('import command', () => {
  it('imports a simple .ec file into event and service frontmatter', async () => {
    fs.writeFileSync(
      DSL_PATH,
      `event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
}
`,
      'utf-8'
    );

    await importFromDSL({
      file: DSL_PATH,
      dir: CATALOG_PATH,
    });

    const sdk = createSDK(CATALOG_PATH);
    const event = await sdk.getEvent('OrderCreated');
    const service = await sdk.getService('OrderService');

    expect(event?.id).toBe('OrderCreated');
    expect(event?.name).toBe('Order Created');
    expect(service?.id).toBe('OrderService');
    expect(service?.sends?.[0].id).toBe('OrderCreated');
    expect(service?.sends?.[0].version).toBe('1.0.0');
  });

  it('supports dry-run mode without writing files', async () => {
    fs.writeFileSync(
      DSL_PATH,
      `event PaymentProcessed {
  version 1.2.3
}
`,
      'utf-8'
    );

    const output = await importFromDSL({
      file: DSL_PATH,
      dir: CATALOG_PATH,
      dryRun: true,
    });

    const sdk = createSDK(CATALOG_PATH);
    const event = await sdk.getEvent('PaymentProcessed');

    expect(output).toContain("Would import event 'PaymentProcessed'");
    expect(event).toBeUndefined();
  });
});
