import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import { exportResource } from '../../cli/export';
import createSDK from '@eventcatalog/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { createCatalogHelper } from './helpers';

const messageTypes = [
  { type: 'event', dslKeyword: 'event', plural: 'events', write: 'writeEvent', get: 'getEvent', version: 'versionEvent' },
  {
    type: 'command',
    dslKeyword: 'command',
    plural: 'commands',
    write: 'writeCommand',
    get: 'getCommand',
    version: 'versionCommand',
  },
  { type: 'query', dslKeyword: 'query', plural: 'queries', write: 'writeQuery', get: 'getQuery', version: 'versionQuery' },
] as const;

type MessageTypeConfig = (typeof messageTypes)[number];

const { catalogPath, setup, writeEcFile } = createCatalogHelper('messages');
setup();

describe.each(messageTypes)('$type import-export rules', (c: MessageTypeConfig) => {
  describe('import (.ec to eventcatalog)', () => {
    it(`when we import a ${c.type} that does not exist in the catalog, a ${c.type} resource is created from the DSL`, async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created"
  summary "An order was created"
}`
      );

      const result = await importDSL({
        files: [ecFile],
        dir: catalogPath,
      });

      expect(result).toContain('Created 1 resource(s)');
      expect(result).toContain('OrderCreated@1.0.0');

      const sdk = createSDK(catalogPath);
      const resource = await sdk[c.get]('OrderCreated', '1.0.0');
      expect(resource).toBeDefined();
      expect(resource!.name).toBe('Order Created');
    });

    it(`when we import a ${c.type} without a version, the ${c.type} resource is created in the root folder`, async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} SimpleMessage {
  name "Simple Message"
}`
      );

      const result = await importDSL({ files: [ecFile], dir: catalogPath });

      expect(result).toContain('Created 1 resource(s)');

      const sdk = createSDK(catalogPath);
      const resource = await sdk[c.get]('SimpleMessage');
      expect(resource).toBeDefined();
      expect(resource!.name).toBe('Simple Message');
    });

    it(`when no ${c.type} exists, a ${c.type} resource is created with NodeGraph data in markdown`, async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const resource = await sdk[c.get]('OrderCreated', '1.0.0');
      expect(resource).toBeDefined();
      expect(resource!.markdown).toContain('<NodeGraph />');
    });

    it(`when we import a ${c.type} that already exists, the existing markdown is preserved and NodeGraph is not added`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: 'existing docs',
      });

      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created V2"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk2 = createSDK(catalogPath);
      const resource = await sdk2[c.get]('OrderCreated', '1.0.0');
      expect(resource).toBeDefined();
      expect(resource!.markdown).toBe('existing docs');
      expect(resource!.markdown).not.toContain('<NodeGraph />');
    });

    it(`when importing the same ${c.type} version from multiple .ec files, the final result is deterministic and the last file wins`, async () => {
      const firstFile = writeEcFile(
        'first.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created First"
  summary "first summary"
}`
      );
      const secondFile = writeEcFile(
        'second.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created Second"
}`
      );

      await importDSL({ files: [firstFile, secondFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const resource = await sdk[c.get]('OrderCreated', '1.0.0');
      expect(resource).toBeDefined();
      expect(resource!.name).toBe('Order Created Second');
      expect((resource as any).summary).toBeUndefined();
      expect(resource!.markdown).toContain('<NodeGraph />');
    });

    it(`when we import a ${c.type} with draft true and deprecated true, both flags are written to ${c.type} frontmatter`, async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created"
  draft true
  deprecated true
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const resource = await sdk[c.get]('OrderCreated', '1.0.0');
      expect(resource).toBeDefined();
      expect((resource as any).draft).toBe(true);
      expect((resource as any).deprecated).toBe(true);
    });

    it(`when we import a ${c.type} with draft false and deprecated false over existing true values, existing values are overridden and set to false`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        version: '1.0.0',
        name: 'Order Created',
        draft: true,
        deprecated: true,
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created Updated"
  draft false
  deprecated false
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const resource = await sdk[c.get]('OrderCreated', '1.0.0');
      expect(resource).toBeDefined();
      expect(resource!.name).toBe('Order Created Updated');
      expect((resource as any).draft).toBe(false);
      expect((resource as any).deprecated).toBe(false);
      expect(resource!.markdown).toBe('Existing docs');
    });

    it(`when we import a ${c.type} with owner statements over existing owners, owners are overwritten from DSL`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        version: '1.0.0',
        name: 'Order Created',
        owners: ['legacy-owner'],
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created Updated"
  owner orders-team
  owner platform-team
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const resource = await sdk[c.get]('OrderCreated', '1.0.0');
      expect(resource).toBeDefined();
      expect(resource!.name).toBe('Order Created Updated');
      expect((resource as any).owners).toEqual(['orders-team', 'platform-team']);
      expect(resource!.markdown).toBe('Existing docs');
    });

    it(`when we import a ${c.type} without owner statements over existing owners, owners are removed from frontmatter`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        version: '1.0.0',
        name: 'Order Created',
        owners: ['legacy-owner'],
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created Updated"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const resource = await sdk[c.get]('OrderCreated', '1.0.0');
      expect(resource).toBeDefined();
      expect(resource!.name).toBe('Order Created Updated');
      expect((resource as any).owners).toBeUndefined();
      expect(resource!.markdown).toBe('Existing docs');
    });

    const managedMessageKeyCases: Array<{
      key: 'name' | 'version' | 'owners' | 'deprecated' | 'draft' | 'summary';
      existingValue: any;
      importSource: string;
      expectedValue: any;
      readVersion?: string;
    }> = [
      {
        key: 'name',
        existingValue: 'Legacy Order Created Name',
        importSource: `${c.dslKeyword} OrderCreated {
  version 1.0.0
}`,
        expectedValue: 'OrderCreated',
        readVersion: '1.0.0',
      },
      {
        key: 'version',
        existingValue: '1.0.0',
        importSource: `${c.dslKeyword} OrderCreated {
  name "Order Created Updated"
}`,
        expectedValue: undefined,
      },
      {
        key: 'owners',
        existingValue: ['orders-team'],
        importSource: `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'deprecated',
        existingValue: true,
        importSource: `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'draft',
        existingValue: true,
        importSource: `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'summary',
        existingValue: 'Legacy order created summary',
        importSource: `${c.dslKeyword} OrderCreated {
  version 1.0.0
  name "Order Created Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
    ];

    it.each(managedMessageKeyCases)(
      `when importing over an existing ${c.type} and the DSL does not provide managed key "$key", that managed key is not preserved from existing frontmatter`,
      async ({ key, existingValue, importSource, expectedValue, readVersion }) => {
        const sdk = createSDK(catalogPath);
        const resourceToWrite: Record<string, any> = {
          id: 'OrderCreated',
          version: '1.0.0',
          name: 'Order Created',
          markdown: 'Existing docs',
        };
        resourceToWrite[key] = existingValue;
        await sdk[c.write](resourceToWrite as any);

        const ecFile = writeEcFile('test.ec', importSource);
        await importDSL({ files: [ecFile], dir: catalogPath });

        const resource = await sdk[c.get]('OrderCreated', readVersion);
        expect(resource).toBeDefined();
        expect(resource!.id).toBe('OrderCreated');
        if (expectedValue === undefined) {
          expect((resource as any)[key]).toBeUndefined();
        } else {
          expect((resource as any)[key]).toEqual(expectedValue);
        }
        expect(resource!.markdown).toBe('Existing docs');
      }
    );

    it(`when importing a newer ${c.type} version, non-DSL keys are carried forward from the latest version`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        version: '1.0.0',
        name: 'Order Created',
        summary: 'Order created summary',
        markdown: 'Order created docs v1',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `${c.dslKeyword} OrderCreated {
  version 2.0.0
  name "Order Created v2"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const resource = await sdk[c.get]('OrderCreated', '2.0.0');
      expect(resource).toBeDefined();
      expect(resource!.name).toBe('Order Created v2');
      expect((resource as any).summary).toBeUndefined();
      expect(resource!.markdown).toBe('Order created docs v1\n\n<NodeGraph />');
    });
  });

  describe('export (from eventcatalog to .ec)', () => {
    it(`when we export an existing ${c.type} to stdout, the DSL output contains the ${c.type} definition and visualizer entry`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'An order was created',
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        ${c.dslKeyword} OrderCreated {
          version 1.0.0
          name "Order Created"
          summary "An order was created"
        }

        visualizer main {
          name "View of OrderCreated"
          ${c.dslKeyword} OrderCreated
        }
      `);
    });

    it(`when we export an existing ${c.type}, the latest version is used unless a version is specified`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'v1 summary',
        markdown: '',
      });
      await sdk[c.version]('OrderCreated');
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created V2',
        version: '2.0.0',
        summary: 'v2 summary',
        markdown: '',
      });

      // Without version, exports latest (2.0.0)
      const latestResult = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        stdout: true,
        dir: catalogPath,
      });

      expect(latestResult).toBe(dsl`
        ${c.dslKeyword} OrderCreated {
          version 2.0.0
          name "Order Created V2"
          summary "v2 summary"
        }

        visualizer main {
          name "View of OrderCreated"
          ${c.dslKeyword} OrderCreated
        }
      `);

      // With version, exports that specific version
      const v1Result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        version: '1.0.0',
        stdout: true,
        dir: catalogPath,
      });

      expect(v1Result).toBe(dsl`
        ${c.dslKeyword} OrderCreated {
          version 1.0.0
          name "Order Created"
          summary "v1 summary"
        }

        visualizer main {
          name "View of OrderCreated"
          ${c.dslKeyword} OrderCreated
        }
      `);
    });

    it(`when we export a ${c.type} with hydrate enabled and ${c.type} owners are defined, owner resources are included in the DSL output`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeTeam({
        id: 'orders-team',
        name: 'Orders Team',
        markdown: '',
      } as any);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        owners: ['orders-team'],
        markdown: '',
      } as any);

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // TEAMS
        team orders-team {
          name "Orders Team"
        }

        // ${c.plural.toUpperCase()}
        ${c.dslKeyword} OrderCreated {
          version 1.0.0
          name "Order Created"
          owner orders-team
        }

        visualizer main {
          name "View of OrderCreated"
          ${c.dslKeyword} OrderCreated
        }
      `);
    });

    it(`when we export a ${c.type} with hydrate enabled, the DSL output contains the producers and consumers of the ${c.type}`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });
      await sdk.writeService({
        id: 'NotificationService',
        name: 'Notification Service',
        version: '1.0.0',
        receives: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // ${c.plural.toUpperCase()}
        ${c.dslKeyword} OrderCreated {
          version 1.0.0
          name "Order Created"
        }

        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
          sends ${c.dslKeyword} OrderCreated@1.0.0
        }

        service NotificationService {
          version 1.0.0
          name "Notification Service"
          receives ${c.dslKeyword} OrderCreated@1.0.0
        }

        visualizer main {
          name "View of OrderCreated"
          ${c.dslKeyword} OrderCreated
          service OrderService
          service NotificationService
        }
      `);
    });

    it(`when we export a ${c.type} with hydrate enabled, the DSL output contains the producers and consumers of the ${c.type}, the producers and consumers only contain the ${c.type} and no other messages`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeEvent({
        id: 'OrderShipped',
        name: 'Order Shipped',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeCommand({
        id: 'CancelOrder',
        name: 'Cancel Order',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [
          { id: 'OrderCreated', version: '1.0.0' },
          { id: 'OrderShipped', version: '1.0.0' },
        ],
        receives: [{ id: 'CancelOrder', version: '1.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      // Service should only contain OrderCreated references, not OrderShipped or CancelOrder
      expect(result).toContain('service OrderService');
      expect(result).toContain(`sends ${c.dslKeyword} OrderCreated@1.0.0`);
      expect(result).not.toContain('OrderShipped');
      expect(result).not.toContain('CancelOrder');
    });

    it(`when we export a ${c.type} with hydrate enabled, producers and consumers using semver range patterns are matched`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.2.3',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '^1.0.0' }],
        markdown: '',
      });
      await sdk.writeService({
        id: 'NotificationService',
        name: 'Notification Service',
        version: '1.0.0',
        receives: [{ id: 'OrderCreated', version: '~1.2.0' }],
        markdown: '',
      });
      await sdk.writeService({
        id: 'ArchiveService',
        name: 'Archive Service',
        version: '1.0.0',
        receives: [{ id: 'OrderCreated', version: '2.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      // ^1.0.0 matches 1.2.3, ~1.2.0 matches 1.2.3
      expect(result).toContain('service OrderService');
      expect(result).toContain('service NotificationService');
      // 2.0.0 does not match 1.2.3
      expect(result).not.toContain('ArchiveService');
    });

    it(`when we export a ${c.type} with hydrate enabled and multiple versions of the same service publish the ${c.type}, all versions are included in the DSL output`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });
      await sdk.versionService('OrderService');
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service V2',
        version: '2.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      // Both versions of OrderService should be included
      expect(result).toContain('service OrderService {');
      expect(result).toContain('version 1.0.0');
      expect(result).toContain('version 2.0.0');
      expect(result).toContain('name "Order Service"');
      expect(result).toContain('name "Order Service V2"');
    });

    it(`when we export a ${c.type} with hydrate enabled, the DSL output contains the producers and consumers, any duplicates are removed`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        receives: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // ${c.plural.toUpperCase()}
        ${c.dslKeyword} OrderCreated {
          version 1.0.0
          name "Order Created"
        }

        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
          sends ${c.dslKeyword} OrderCreated@1.0.0
          receives ${c.dslKeyword} OrderCreated@1.0.0
        }

        visualizer main {
          name "View of OrderCreated"
          ${c.dslKeyword} OrderCreated
          service OrderService
        }
      `);
    });

    it(`when we export a ${c.type} with hydrate enabled, any channels used by the services to consume or produce the ${c.type} are included in the DSL output`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeChannel({
        id: 'orders-topic',
        name: 'Orders Topic',
        version: '1.0.0',
        address: 'orders.events',
        markdown: '',
      } as any);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0', to: [{ id: 'orders-topic', version: '1.0.0' }] }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // CHANNELS
        channel orders-topic {
          version 1.0.0
          name "Orders Topic"
          address "orders.events"
        }

        // ${c.plural.toUpperCase()}
        ${c.dslKeyword} OrderCreated {
          version 1.0.0
          name "Order Created"
        }

        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
          sends ${c.dslKeyword} OrderCreated@1.0.0 to orders-topic@1.0.0
        }

        visualizer main {
          name "View of OrderCreated"
          ${c.dslKeyword} OrderCreated
          service OrderService
        }
      `);
    });

    it(`when we export a ${c.type} with hydrate enabled and multiple versions of the same service exist, the visualizer block includes version-qualified service references`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });
      await sdk.versionService('OrderService');
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service V2',
        version: '2.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toContain('service OrderService@2.0.0');
      expect(result).toContain('service OrderService@1.0.0');
    });

    it(`when we export a ${c.type} with hydrate enabled, if there are services, they are added to the visualizer block`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'OrderCreated',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // ${c.plural.toUpperCase()}
        ${c.dslKeyword} OrderCreated {
          version 1.0.0
          name "Order Created"
        }

        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
          sends ${c.dslKeyword} OrderCreated@1.0.0
        }

        visualizer main {
          name "View of OrderCreated"
          ${c.dslKeyword} OrderCreated
          service OrderService
        }
      `);
    });

    it(`when we export a ${c.type} with hydrate enabled and a service references the ${c.type} without a version (latest), the service is included as a consumer/producer`, async () => {
      const sdk = createSDK(catalogPath);
      await sdk[c.write]({
        id: 'PaymentProcessed',
        name: 'Payment Processed',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'ShippingService',
        name: 'Shipping Service',
        version: '1.0.0',
        receives: [{ id: 'PaymentProcessed' }],
        markdown: '',
      });
      await sdk.writeService({
        id: 'PaymentService',
        name: 'Payment Service',
        version: '1.0.0',
        sends: [{ id: 'PaymentProcessed' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: c.type,
        id: 'PaymentProcessed',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toContain('service ShippingService');
      expect(result).toContain(`receives ${c.dslKeyword} PaymentProcessed`);
      expect(result).toContain('service PaymentService');
      expect(result).toContain(`sends ${c.dslKeyword} PaymentProcessed`);
    });

    it(`when we export a ${c.type} that does not exist, a not found error is returned with the requested ${c.type} id`, async () => {
      await expect(
        exportResource({
          resource: c.type,
          id: 'MissingMessage',
          stdout: true,
          dir: catalogPath,
        })
      ).rejects.toThrow(`${c.type} 'MissingMessage (latest)' not found in catalog at '${catalogPath}'`);
    });
  });
});
