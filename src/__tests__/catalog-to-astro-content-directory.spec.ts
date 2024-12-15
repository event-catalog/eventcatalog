import { catalogToAstro } from '../catalog-to-astro-content-directory';
import * as path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
// import * as fs from 'fs-extra';

const TMP_DIRECTORY = path.join(__dirname, 'tmp');
const ASTRO_OUTPUT = path.join(TMP_DIRECTORY);
const ASTRO_CONTENT_DIRECTORY = path.join(TMP_DIRECTORY, 'src', 'content');
// const OUTPUT_EXTERNAL_FILES = path.join(TMP_DIRECTORY, 'catalog-files');
const CATALOG_DIR = path.join(__dirname, 'example-catalog');
const CATALOG_FILES_DIR = path.join(TMP_DIRECTORY, 'src/catalog-files');

import { expect, describe, it, beforeAll, afterAll } from 'vitest';

describe('catalog-to-astro-content-directory', () => {
  beforeAll(async () => {
    await fs.mkdir(TMP_DIRECTORY, { recursive: true });
    await fs.mkdir(ASTRO_OUTPUT, { recursive: true });
    // create src/content inside astro directory
    await fs.mkdir(ASTRO_CONTENT_DIRECTORY, { recursive: true });
    await fs.writeFile(path.join(ASTRO_CONTENT_DIRECTORY, 'config.ts'), 'export const config = {};');

    // console.log(path.join(ASTRO_OUTPUT, 'config.ts'))

    // Convert the catalog
    await catalogToAstro(CATALOG_DIR, ASTRO_OUTPUT);
  });

  afterAll(async () => {
    await fs.rm(TMP_DIRECTORY, { recursive: true });
    // await fs.rm(path.join(__dirname, 'public'), { recursive: true });
    const defaultFile = await fs.readFile(path.join(CATALOG_DIR, 'eventcatalog.config.defaults.js'), 'utf8');
    await fs.writeFile(path.join(CATALOG_DIR, 'eventcatalog.config.js'), defaultFile);
  });

  describe('events', () => {
    describe('/events directory', () => {
      it('takes events from the users catalog and puts it into the expected directory structure', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'Inventory'))).toBe(true);
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'Inventory/InventoryAdjusted'))).toBe(true);
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'Inventory/InventoryAdjusted/versioned/0.0.1'))).toBe(
          true
        );
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'Inventory/InventoryAdjusted/versioned/1.0.0'))).toBe(
          true
        );
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'Order'))).toBe(true);
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'Order/OrderAmended', 'index.mdx'))).toBe(true);
      });
      it('when an event is versioned it copies this version into the correct location', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'Inventory/InventoryAdjusted/versioned/0.0.1'))).toBe(
          true
        );
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'Inventory/InventoryAdjusted/versioned/1.0.0'))).toBe(
          true
        );
      });

      it('when an event has a schema file along side it, that is copied to the correct location', async () => {
        expect(existsSync(path.join(CATALOG_FILES_DIR, 'events', 'Order/OrderAmended', 'schema.json'))).toBe(true);
      });

      it('when an event has been versioned and that version has a schema file along side it, that is copied to the correct location', async () => {
        expect(
          existsSync(path.join(CATALOG_FILES_DIR, 'events', 'Inventory/InventoryAdjusted', 'versioned', '0.0.1', 'schema.avro'))
        ).toBe(true);
      });
    });

    describe('events within the /services directory', () => {
      it('when an event is inside a service folder it copies the event into the correct location', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'PaymentAccepted', 'index.mdx'))).toBe(true);
      });

      it('when an event is versioned and it is within the service directory it copies this version into the correct location', async () => {
        expect(
          existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'PaymentAccepted', 'versioned', '0.0.1', 'index.mdx'))
        ).toBe(true);
      });

      it('when an event has a schema file along side it, that is copied to the correct location', async () => {
        expect(existsSync(path.join(CATALOG_FILES_DIR, 'events', 'PaymentAccepted', 'schema.json'))).toBe(true);
      });
    });

    describe('events within the /domain directory', () => {
      it('when an event is inside a domain folder it copies the event into the correct location', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'events', 'PaymentDomainTestEvent1', 'index.mdx'))).toBe(true);
      });

      it('when an event has a schema file along side it, that is copied to the correct location', async () => {
        expect(existsSync(path.join(CATALOG_FILES_DIR, 'events', 'PaymentDomainTestEvent1', 'schema.json'))).toBe(true);
      });
    });
  });

  describe('commands', () => {
    describe('/commands directory', () => {
      it('takes an command from the users catalog and puts it into the expected directory structure', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'commands', 'AddInventory', 'index.mdx'))).toBe(true);
      });
      it('when an command is versioned it copies this version into the correct location', async () => {
        expect(
          existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'commands', 'AddInventory', 'versioned', '0.0.1', 'index.mdx'))
        ).toBe(true);
      });

      it('when an command has a schema file along side it, that is copied to the correct location', async () => {
        expect(existsSync(path.join(CATALOG_FILES_DIR, 'commands', 'AddInventory', 'schema.json'))).toBe(true);
      });

      it('when an command has been versioned and that version has a schema file along side it, that is copied to the correct location', async () => {
        expect(existsSync(path.join(CATALOG_FILES_DIR, 'commands', 'AddInventory', 'versioned', '0.0.1', 'schema.json'))).toBe(
          true
        );
      });
    });
  });

  describe('services', () => {
    describe('/services directory', () => {
      it('takes services from the users catalog and puts it into the expected directory structure', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'services', 'PaymentService', 'index.mdx'))).toBe(true);
      });

      it('when a service is versioned it copies this version into the correct location', async () => {
        expect(
          existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'services', 'PaymentService', 'versioned', '0.0.1', 'index.mdx'))
        ).toBe(true);
      });

      it('when a service has a file within its directory (not markdown file, e.g AsyncAPI), it copies this version into the correct location', async () => {
        expect(existsSync(path.join(CATALOG_FILES_DIR, 'services', 'PaymentService', 'asyncapi.yml'))).toBe(true);
      });
    });
    describe('services within the /domains directory', () => {
      it('takes services from the users catalog (which are in a domains folder) and puts it into the expected directory structure', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'services', 'ExternalPaymentService', 'index.mdx'))).toBe(true);
      });

      it('when a service is versioned (within a domain folder) it copies this version into the correct location', async () => {
        expect(
          existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'services', 'ExternalPaymentService', 'versioned', '0.0.1', 'index.mdx'))
        ).toBe(true);
      });

      it('when a service has a file within its directory (not markdown file, e.g AsyncAPI), it copies this version into the correct location', async () => {
        expect(existsSync(path.join(CATALOG_FILES_DIR, 'services', 'ExternalPaymentService', 'asyncapi.yml'))).toBe(true);
      });
    });
  });

  describe('domains', () => {
    describe('/domain directory', () => {
      it('takes domains from the domains catalog and puts it into the expected directory structure', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'domains', 'Payment', 'index.mdx'))).toBe(true);
      });

      it('when a domain is versioned it copies this version into the correct location', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'domains', 'Payment', 'versioned', '0.0.1', 'index.mdx'))).toBe(
          true
        );
      });

      it('when a domain has a file within its directory (not markdown file, e.g AsyncAPI), it copies this version into the correct location', async () => {
        expect(existsSync(path.join(CATALOG_FILES_DIR, 'domains', 'Payment', 'asyncapi.yml'))).toBe(true);
      });
    });

    describe('ubiquitous-language', () => {
      it('takes ubiquitous-language from the users catalog (within domains) and puts it into the expected directory structure', async () => {
        expect(
          existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'ubiquitousLanguages', 'domains', 'Payment', 'ubiquitous-language.mdx'))
        ).toBe(true);
      });
    });
  });

  describe('flows', () => {
    describe('/flows directory', () => {
      it('takes flows from the users catalog and puts it into the expected directory structure', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'flows', 'Payment', 'PaymentProcessed', 'index.mdx'))).toBe(true);
      });

      it('when a flow is versioned it copies this version into the correct location', async () => {
        expect(
          existsSync(
            path.join(ASTRO_CONTENT_DIRECTORY, 'flows', 'Payment', 'PaymentProcessed', 'versioned', '0.0.1', 'index.mdx')
          )
        ).toBe(true);
      });
    });
    describe('flows within the /services directory', () => {
      it('takes flows from the users catalog (which are in a services folder) and puts it into the expected directory structure', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'flows', 'PaymentAccepted', 'index.mdx'))).toBe(true);
      });

      it('when a flow is versioned (within a services folder) it copies this version into the correct location', async () => {
        expect(
          existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'flows', 'PaymentAccepted', 'versioned', '0.0.1', 'index.mdx'))
        ).toBe(true);
      });
    });

    describe('flows within the /domains directory', () => {
      it('takes flows from the users catalog (which are in a domains folder) and puts it into the expected directory structure', async () => {
        expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'flows', 'ProcessingOfAnOrder', 'index.mdx'))).toBe(true);
      });

      it('when a flow is versioned (within a domains folder) it copies this version into the correct location', async () => {
        expect(
          existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'flows', 'ProcessingOfAnOrder', 'versioned', '0.0.1', 'index.mdx'))
        ).toBe(true);
      });
    });
  });

  describe('users', () => {
    it('takes users from the catalog and puts it into the expected directory structure', async () => {
      expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'users', 'dboyne.md'))).toBe(true);
    });
  });

  describe('teams', () => {
    it('takes teams from the catalog and puts it into the expected directory structure', async () => {
      expect(existsSync(path.join(ASTRO_CONTENT_DIRECTORY, 'teams', 'full-stack.md'))).toBe(true);
    });
  });

  // describe('eventcatalog.config.js file', () => {
  //   it('adds cId missing property on the eventcatalog.config.js file', async () => {
  //     const file = await fs.readFile(path.join(CATALOG_DIR, 'eventcatalog.config.js'), 'utf8');
  //     expect(file).toContain('cId:');
  //   });
  // });
});
