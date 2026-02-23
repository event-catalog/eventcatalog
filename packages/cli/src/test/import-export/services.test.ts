import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import { exportResource } from '../../cli/export';
import createSDK from '@eventcatalog/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('services');
setup();

describe('services import-export rules', () => {
  describe('import (.ec to eventcatalog)', () => {
    it('when we import a service that does not exist in the catalog, a service resource is created from the DSL', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `service PaymentService {
  version 2.0.0
  name "Payment Service"
  summary "Handles payments"
}`
      );

      const result = await importDSL({ files: [ecFile], dir: catalogPath });

      expect(result).toContain('Created 1 resource(s)');

      const sdk = createSDK(catalogPath);
      const service = await sdk.getService('PaymentService', '2.0.0');
      expect(service).toBeDefined();
      expect(service!.name).toBe('Payment Service');
    });

    it('when no service exists, a service resource is created with NodeGraph data in markdown', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `service PaymentService {
  version 1.0.0
  name "Payment Service"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const service = await sdk.getService('PaymentService', '1.0.0');
      expect(service).toBeDefined();
      expect(service!.markdown).toContain('<NodeGraph />');
    });

    it('when we import a service with inline messages, the service and message resources are created', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated {
    version 1.0.0
    name "Order Created"
    summary "An order was created"
  }
}`
      );

      const result = await importDSL({ files: [ecFile], dir: catalogPath });

      expect(result).toContain('Created 2 resource(s)');

      const sdk = createSDK(catalogPath);
      expect(await sdk.getService('OrderService', '1.0.0')).toBeDefined();
      expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();
    });

    it('when we import a service that already exists with sends/receives and the DSL does not include them, sends/receives are removed', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeEvent({ id: 'OrderCreated', name: 'Order Created', version: '1.0.0', markdown: '' });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: 'existing service docs',
      });

      const ecFile = writeEcFile(
        'test.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`
      );

      const result = await importDSL({ files: [ecFile], dir: catalogPath });

      expect(result).toContain('Updated 1 resource(s)');

      const sdk2 = createSDK(catalogPath);
      const service = await sdk2.getService('OrderService', '1.0.0');
      expect(service!.name).toBe('Order Service Updated');
      expect((service as any).sends).toBeUndefined();
    });

    it('when we import a service that already exists, the existing markdown is preserved and NodeGraph is not added', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        markdown: 'existing docs',
      });

      const ecFile = writeEcFile(
        'test.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service V2"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk2 = createSDK(catalogPath);
      const service = await sdk2.getService('OrderService', '1.0.0');
      expect(service).toBeDefined();
      expect(service!.markdown).toBe('existing docs');
      expect(service!.markdown).not.toContain('<NodeGraph />');
    });

    it('when importing the same service version from multiple .ec files, the final result is deterministic and the last file wins', async () => {
      const firstFile = writeEcFile(
        'first.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service First"
  summary "first summary"
}`
      );
      const secondFile = writeEcFile(
        'second.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service Second"
}`
      );

      await importDSL({ files: [firstFile, secondFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const service = await sdk.getService('OrderService', '1.0.0');
      expect(service).toBeDefined();
      expect(service!.name).toBe('Order Service Second');
      expect((service as any).summary).toBeUndefined();
      expect(service!.markdown).toContain('<NodeGraph />');
    });

    it('when we import a service with draft true and deprecated true, both flags are written to service frontmatter', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service"
  draft true
  deprecated true
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const service = await sdk.getService('OrderService', '1.0.0');
      expect(service).toBeDefined();
      expect((service as any).draft).toBe(true);
      expect((service as any).deprecated).toBe(true);
    });

    it('when we import a service with draft false and deprecated false over existing true values, existing values are overridden and set to false', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeService({
        id: 'OrderService',
        version: '1.0.0',
        name: 'Order Service',
        draft: true,
        deprecated: true,
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service Updated"
  draft false
  deprecated false
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const service = await sdk.getService('OrderService', '1.0.0');
      expect(service).toBeDefined();
      expect(service!.name).toBe('Order Service Updated');
      expect((service as any).draft).toBe(false);
      expect((service as any).deprecated).toBe(false);
      expect(service!.markdown).toBe('Existing docs');
    });

    it('when we import a service with owner statements over existing owners, owners are overwritten from DSL', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeService({
        id: 'OrderService',
        version: '1.0.0',
        name: 'Order Service',
        owners: ['legacy-owner'],
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service Updated"
  owner orders-team
  owner platform-team
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const service = await sdk.getService('OrderService', '1.0.0');
      expect(service).toBeDefined();
      expect(service!.name).toBe('Order Service Updated');
      expect((service as any).owners).toEqual(['orders-team', 'platform-team']);
      expect(service!.markdown).toBe('Existing docs');
    });

    it('when we import a service without owner statements over existing owners, owners are removed from frontmatter', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeService({
        id: 'OrderService',
        version: '1.0.0',
        name: 'Order Service',
        owners: ['legacy-owner'],
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const service = await sdk.getService('OrderService', '1.0.0');
      expect(service).toBeDefined();
      expect(service!.name).toBe('Order Service Updated');
      expect((service as any).owners).toBeUndefined();
      expect(service!.markdown).toBe('Existing docs');
    });

    const managedServiceKeyCases: Array<{
      key: 'name' | 'version' | 'owners' | 'deprecated' | 'draft' | 'summary' | 'sends' | 'receives';
      existingValue: any;
      importSource: string;
      expectedValue: any;
      readVersion?: string;
    }> = [
      {
        key: 'name',
        existingValue: 'Legacy Order Service Name',
        importSource: `service OrderService {
  version 1.0.0
}`,
        expectedValue: 'OrderService',
        readVersion: '1.0.0',
      },
      {
        key: 'version',
        existingValue: '1.0.0',
        importSource: `service OrderService {
  name "Order Service Updated"
}`,
        expectedValue: undefined,
      },
      {
        key: 'owners',
        existingValue: ['orders-team'],
        importSource: `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'deprecated',
        existingValue: true,
        importSource: `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'draft',
        existingValue: true,
        importSource: `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'summary',
        existingValue: 'Legacy order service summary',
        importSource: `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'sends',
        existingValue: [{ id: 'OrderCreated', version: '1.0.0' }],
        importSource: `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'receives',
        existingValue: [{ id: 'CancelOrder', version: '1.0.0' }],
        importSource: `service OrderService {
  version 1.0.0
  name "Order Service Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
    ];

    it.each(managedServiceKeyCases)(
      'when importing over an existing service and the DSL does not provide managed key "$key", that managed key is not preserved from existing frontmatter',
      async ({ key, existingValue, importSource, expectedValue, readVersion }) => {
        const sdk = createSDK(catalogPath);
        const serviceToWrite: Record<string, any> = {
          id: 'OrderService',
          version: '1.0.0',
          name: 'Order Service',
          markdown: 'Existing docs',
        };
        serviceToWrite[key] = existingValue;
        await sdk.writeService(serviceToWrite as any);

        const ecFile = writeEcFile('test.ec', importSource);
        await importDSL({ files: [ecFile], dir: catalogPath });

        const service = await sdk.getService('OrderService', readVersion);
        expect(service).toBeDefined();
        expect(service!.id).toBe('OrderService');
        if (expectedValue === undefined) {
          expect((service as any)[key]).toBeUndefined();
        } else {
          expect((service as any)[key]).toEqual(expectedValue);
        }
        expect(service!.markdown).toBe('Existing docs');
      }
    );

    it('when importing a newer service version, non-DSL keys are carried forward from the latest version', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeService({
        id: 'OrderService',
        version: '1.0.0',
        name: 'Order Service',
        summary: 'Order service summary',
        markdown: 'Order service docs v1',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `service OrderService {
  version 2.0.0
  name "Order Service v2"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const service = await sdk.getService('OrderService', '2.0.0');
      expect(service).toBeDefined();
      expect(service!.name).toBe('Order Service v2');
      expect((service as any).summary).toBeUndefined();
      expect(service!.markdown).toBe('Order service docs v1\n\n<NodeGraph />');
    });
  });

  describe('export (from eventcatalog to .ec)', () => {
    it('when we export an existing service to stdout, the DSL output contains the service definition and visualizer entry', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        summary: 'Order management',
        markdown: '',
      });

      const result = await exportResource({
        resource: 'service',
        id: 'OrderService',
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        service OrderService {
          version 1.0.0
          name "Order Service"
          summary "Order management"
        }

        visualizer main {
          name "View of OrderService"
          service OrderService
        }
      `);
    });

    it('when we export a service with hydrate enabled and service sends messages, the message resources are included in the DSL output', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeEvent({
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
        resource: 'service',
        id: 'OrderService',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // EVENTS
        event OrderCreated {
          version 1.0.0
          name "Order Created"
        }

        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
          sends event OrderCreated@1.0.0
        }

        visualizer main {
          name "View of OrderService"
          event OrderCreated
          service OrderService
        }
      `);
    });

    it('when we export a service with hydrate enabled and service receives messages, the message resources are included in the DSL output', async () => {
      const sdk = createSDK(catalogPath);
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
        receives: [{ id: 'CancelOrder', version: '1.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: 'service',
        id: 'OrderService',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // COMMANDS
        command CancelOrder {
          version 1.0.0
          name "Cancel Order"
        }

        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
          receives command CancelOrder@1.0.0
        }

        visualizer main {
          name "View of OrderService"
          command CancelOrder
          service OrderService
        }
      `);
    });

    it('when we export a service with hydrate enabled, downstream consumers of published messages and upstream producers of consumed messages are included, but fellow consumers are excluded', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeCommand({
        id: 'CancelOrder',
        name: 'Cancel Order',
        version: '1.0.0',
        markdown: '',
      });
      // OrderService sends OrderCreated and receives CancelOrder
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        receives: [{ id: 'CancelOrder', version: '1.0.0' }],
        markdown: '',
      });
      // NotificationService consumes OrderCreated (downstream consumer of our published message)
      await sdk.writeService({
        id: 'NotificationService',
        name: 'Notification Service',
        version: '1.0.0',
        receives: [{ id: 'OrderCreated', version: '1.0.0' }],
        markdown: '',
      });
      // CustomerService produces CancelOrder (upstream producer of a message we consume)
      await sdk.writeService({
        id: 'CustomerService',
        name: 'Customer Service',
        version: '1.0.0',
        sends: [{ id: 'CancelOrder', version: '1.0.0' }],
        markdown: '',
      });
      // InventoryService also receives CancelOrder (fellow consumer — should NOT be included)
      await sdk.writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        receives: [{ id: 'CancelOrder', version: '1.0.0' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: 'service',
        id: 'OrderService',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      // The exported service and its messages should be present
      expect(result).toContain('service OrderService');
      expect(result).toContain('event OrderCreated');
      expect(result).toContain('command CancelOrder');
      // Consumers of messages this service publishes should be included
      expect(result).toContain('service NotificationService');
      // Producers of messages this service consumes should be included
      expect(result).toContain('service CustomerService');
      // Fellow consumers of the same messages should NOT be included
      expect(result).not.toContain('service InventoryService');
    });

    it('when we export a service with hydrate enabled and a related producer sends a message through a channel, the channel is included in the DSL output', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeChannel({
        id: 'inventory.{env}.events',
        name: 'Inventory Events Channel',
        version: '1.0.0',
        address: 'inventory.{env}.events',
        markdown: '',
      } as any);
      await sdk.writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory adjusted',
        version: '1.0.1',
        markdown: '',
      });
      // InventoryService sends InventoryAdjusted through a channel
      await sdk.writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.2',
        sends: [{ id: 'InventoryAdjusted', version: '1.0.1', to: [{ id: 'inventory.{env}.events' }] }],
        markdown: '',
      });
      // NotificationService receives InventoryAdjusted
      await sdk.writeService({
        id: 'NotificationService',
        name: 'Notifications',
        version: '0.0.2',
        receives: [{ id: 'InventoryAdjusted', version: '1.0.1' }],
        markdown: '',
      });

      const result = await exportResource({
        resource: 'service',
        id: 'NotificationService',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      // The upstream producer should be included
      expect(result).toContain('service InventoryService');
      // The channel the producer uses should also be included
      expect(result).toContain('channel inventory.{env}.events');
      expect(result).toContain('sends event InventoryAdjusted@1.0.1 to inventory.{env}.events');
    });

    it('when we export a service with hydrate enabled and service owners are defined, owner resources are included in the DSL output', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeTeam({
        id: 'orders-team',
        name: 'Orders Team',
        markdown: '',
      } as any);
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        owners: ['orders-team'],
        markdown: '',
      } as any);

      const result = await exportResource({
        resource: 'service',
        id: 'OrderService',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // TEAMS
        team orders-team {
          name "Orders Team"
        }

        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
          owner orders-team
        }

        visualizer main {
          name "View of OrderService"
          service OrderService
        }
      `);
    });

    it('when we export a service with hydrate enabled and message pointers use semver ranges, the ranges are resolved to concrete versions in the DSL output', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory adjusted',
        version: '1.0.1',
        summary: 'Indicates a change in inventory level',
        markdown: '',
      });
      await sdk.writeEvent({
        id: 'PaymentProcessed',
        name: 'Payment Processed',
        version: '1.0.0',
        summary: 'Payment has been processed',
        markdown: '',
      });
      await sdk.writeService({
        id: 'NotificationService',
        name: 'Notifications',
        version: '0.0.2',
        receives: [
          { id: 'InventoryAdjusted', version: '>1.0.0' },
          { id: 'PaymentProcessed', version: '^1.0.0' },
        ],
        markdown: '',
      });

      const result = await exportResource({
        resource: 'service',
        id: 'NotificationService',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      // Semver ranges should be resolved to concrete versions
      expect(result).toContain('receives event InventoryAdjusted@1.0.1');
      expect(result).not.toContain('>1.0.0');
      expect(result).toContain('receives event PaymentProcessed@1.0.0');
      expect(result).not.toContain('^1.0.0');
      // Hydrated message definitions should have their summaries
      expect(result).toContain('summary "Indicates a change in inventory level"');
      expect(result).toContain('summary "Payment has been processed"');
    });

    it('when we export a service that does not exist, a not found error is returned with the requested service id', async () => {
      await expect(
        exportResource({
          resource: 'service',
          id: 'MissingService',
          stdout: true,
          dir: catalogPath,
        })
      ).rejects.toThrow(`service 'MissingService (latest)' not found in catalog at '${catalogPath}'`);
    });
  });
});
