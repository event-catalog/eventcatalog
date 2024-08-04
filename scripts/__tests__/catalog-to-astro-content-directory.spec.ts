import { catalogToAstro } from '../catalog-to-astro-content-directory';
import * as path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
// import * as fs from 'fs-extra';

const TMP_DIRECTORY = path.join(__dirname, 'tmp');
const ASTRO_OUTPUT = path.join(TMP_DIRECTORY, 'content');
const OUTPUT_EXTERNAL_FILES = path.join(TMP_DIRECTORY, 'catalog-files');

import { expect, describe, it, vi, beforeEach, beforeAll, afterAll } from 'vitest';

describe('catalog-to-astro-content-directory', () => {
  beforeAll(() => {
    fs.mkdir(TMP_DIRECTORY, { recursive: true });
    fs.mkdir(ASTRO_OUTPUT, { recursive: true });
    fs.mkdir(path.join(ASTRO_OUTPUT, 'config.ts'), 'export const config = {};');
  });

  afterAll(() => {
    fs.rm(TMP_DIRECTORY, { recursive: true });
  });

  describe('events', () => {
    describe('/events directory', () => {
      it.only('takes an event from the users catalog and puts it into the expected directory structure', async () => {
        const source = path.join(__dirname, 'catalog-example');

        await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

        // Check if file exists
        expect(existsSync(path.join(ASTRO_OUTPUT, 'events', 'PaymentProcessed', 'index.mdx'))).toBe(true);

        // expect(fs.exis(path.join(ASTRO_OUTPUT, 'events', 'PaymentProcessed', 'index.mdx'))).toBe(true);
      });
      // it('when an event is versioned it copies this version into the correct location', async () => {
      //   const source = path.join(__dirname, 'catalog-example');

      //   await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

      //   expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'events', 'PaymentProcessed', 'versioned', '0.0.1', 'index.mdx'))).toBe(
      //     true
      //   );
      // });

      // it('when an event has a schema file along side it, that is copied to the correct location', async () => {
      //   const source = path.join(__dirname, 'catalog-example');

      //   await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

      //   expect(fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'events', 'PaymentProcessed', 'schema.json'))).toBe(true);
      // });

      // it('when an event has been versioned and that version has a schema file along side it, that is copied to the correct location', async () => {
      //   const source = path.join(__dirname, 'catalog-example');

      //   await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

      //   expect(
      //     fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'events', 'PaymentProcessed', 'versioned', '0.0.1', 'schema.json'))
      //   ).toBe(true);
      // });
    });

    // describe('events within the /services directory', () => {
    //   it('when an event is inside a service folder it copies the event into the correct location', async () => {
    //     const source = path.join(__dirname, 'catalog-example');
    //     const target = ASTRO_OUTPUT;

    //     await catalogToAstro(source, target, OUTPUT_EXTERNAL_FILES);

    //     expect(fs.existsSync(path.join(target, 'events', 'PaymentServiceTestEvent1', 'index.mdx'))).toBe(true);
    //   });

    //   it('when an event is versioned and it is within the service directory it copies this version into the correct location', async () => {
    //     const source = path.join(__dirname, 'catalog-example');
    //     const target = ASTRO_OUTPUT;

    //     await catalogToAstro(source, target, OUTPUT_EXTERNAL_FILES);

    //     expect(fs.existsSync(path.join(target, 'events', 'PaymentServiceTestEvent1', 'versioned', '0.0.1', 'index.mdx'))).toBe(
    //       true
    //     );
    //   });

    //   it('when an event has a schema file along side it, that is copied to the correct location', async () => {
    //     const source = path.join(__dirname, 'catalog-example');

    //     await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

    //     expect(fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'events', 'PaymentServiceTestEvent1', 'schema.json'))).toBe(true);
    //   });
    // });

    // describe('events within the /domain directory', () => {
    //   it('when an event is inside a domain folder it copies the event into the correct location', async () => {
    //     const source = path.join(__dirname, 'catalog-example');
    //     const target = ASTRO_OUTPUT;

    //     await catalogToAstro(source, target, OUTPUT_EXTERNAL_FILES);

    //     expect(fs.existsSync(path.join(target, 'events', 'PaymentDomainTestEvent1', 'index.mdx'))).toBe(true);
    //   });

    //   it('when an event has a schema file along side it, that is copied to the correct location', async () => {
    //     const source = path.join(__dirname, 'catalog-example');

    //     await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

    //     expect(fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'events', 'PaymentDomainTestEvent1', 'schema.json'))).toBe(true);
    //   });
    // });
  });

  // describe('commands', () => {
  //   describe('/commands directory', () => {
  //     it('takes an command from the users catalog and puts it into the expected directory structure', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'commands', 'ProcessPayment', 'index.mdx'))).toBe(true);
  //     });
  //     it('when an command is versioned it copies this version into the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'commands', 'ProcessPayment', 'versioned', '0.0.1', 'index.mdx'))).toBe(
  //         true
  //       );
  //     });

  //     it('when an command has a schema file along side it, that is copied to the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'commands', 'ProcessPayment', 'schema.json'))).toBe(true);
  //     });

  //     it('when an command has been versioned and that version has a schema file along side it, that is copied to the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(
  //         fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'commands', 'ProcessPayment', 'versioned', '0.0.1', 'schema.json'))
  //       ).toBe(true);
  //     });
  //   });
  // });

  // describe('services', () => {
  //   describe('/services directory', () => {
  //     it('takes services from the users catalog and puts it into the expected directory structure', async () => {
  //       const source = path.join(__dirname, 'catalog-example');
  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'services', 'Payment Service', 'index.mdx'))).toBe(true);
  //     });

  //     it('when a service is versioned it copies this version into the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'services', 'Payment Service', 'versioned', '0.0.1', 'index.mdx'))).toBe(
  //         true
  //       );
  //     });

  //     it('when a service has a file within its directory (not markdown file, e.g AsyncAPI), it copies this version into the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'services', 'Payment Service', 'asyncapi.yml'))).toBe(true);
  //     });
  //   });
  //   describe('services within the /domains directory', () => {
  //     it('takes services from the users catalog (which are in a domains folder) and puts it into the expected directory structure', async () => {
  //       const source = path.join(__dirname, 'catalog-example');
  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'services', 'ExternalPaymentService', 'index.mdx'))).toBe(true);
  //     });

  //     it('when a service is versioned (within a domain folder) it copies this version into the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(
  //         fs.existsSync(path.join(ASTRO_OUTPUT, 'services', 'ExternalPaymentService', 'versioned', '0.0.1', 'index.mdx'))
  //       ).toBe(true);
  //     });

  //     it('when a service has a file within its directory (not markdown file, e.g AsyncAPI), it copies this version into the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'services', 'ExternalPaymentService', 'asyncapi.yml'))).toBe(true);
  //     });
  //   });
  // });
  // describe('domains', () => {
  //   describe('/domain directory', () => {
  //     it('takes domains from the domains catalog and puts it into the expected directory structure', async () => {
  //       const source = path.join(__dirname, 'catalog-example');
  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'domains', 'Payment', 'index.mdx'))).toBe(true);
  //     });

  //     it('when a domain is versioned it copies this version into the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'domains', 'Payment', 'versioned', '0.0.1', 'index.mdx'))).toBe(true);
  //     });

  //     it('when a domain has a file within its directory (not markdown file, e.g AsyncAPI), it copies this version into the correct location', async () => {
  //       const source = path.join(__dirname, 'catalog-example');

  //       await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //       expect(fs.existsSync(path.join(OUTPUT_EXTERNAL_FILES, 'domains', 'Payment', 'asyncapi.yml'))).toBe(true);
  //     });
  //   });
  // });

  // describe('users', () => {
  //   it('takes users from the catalog and puts it into the expected directory structure', async () => {
  //     const source = path.join(__dirname, 'catalog-example');
  //     await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //     expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'users', 'dboyne.md'))).toBe(true);
  //   });
  // });

  // describe('teams', () => {
  //   it('takes teams from the catalog and puts it into the expected directory structure', async () => {
  //     const source = path.join(__dirname, 'catalog-example');
  //     await catalogToAstro(source, ASTRO_OUTPUT, OUTPUT_EXTERNAL_FILES);

  //     expect(fs.existsSync(path.join(ASTRO_OUTPUT, 'teams', 'auth-team.md'))).toBe(true);
  //   });
  // });
});
