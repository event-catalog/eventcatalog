import { describe, it, expect } from 'vitest';
import { importDSL } from '../../cli/import';
import { exportResource } from '../../cli/export';
import createSDK from '@eventcatalog/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { createCatalogHelper } from './helpers';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('domains');
setup();

describe('domains import-export rules', () => {
  describe('import (.ec to eventcatalog)', () => {
    it('when we import a domain that does not exist in the catalog, a domain resource is created from the DSL', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `domain Orders {
  version 1.0.0
  name "Orders Domain"
  summary "Order management"
}`
      );

      const result = await importDSL({ files: [ecFile], dir: catalogPath });

      expect(result).toContain('Created 1 resource(s)');

      const sdk = createSDK(catalogPath);
      const domain = await sdk.getDomain('Orders', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.name).toBe('Orders Domain');
    });

    it('when no domain exists, a domain resource is created with NodeGraph data in markdown', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `domain Orders {
  version 1.0.0
  name "Orders Domain"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const domain = await sdk.getDomain('Orders', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.markdown).toContain('<NodeGraph />');
    });

    it('when we import a domain with a subdomain, the parent domain contains a subdomain pointer and the subdomain resource is created', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `domain Ecommerce {
  version 1.0.0
  name "Ecommerce Domain"
  subdomain Payments {
    version 1.0.0
    name "Payments Subdomain"
    summary "Payments context"
  }
}`
      );

      const result = await importDSL({ files: [ecFile], dir: catalogPath });
      expect(result).toContain('Created 2 resource(s)');

      const sdk = createSDK(catalogPath);
      const domain = await sdk.getDomain('Ecommerce', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.domains).toEqual([{ id: 'Payments', version: '1.0.0' }]);

      const subdomain = await sdk.getDomain('Payments', '1.0.0');
      expect(subdomain).toBeDefined();
      expect(subdomain!.name).toBe('Payments Subdomain');
      expect(subdomain!.summary).toBe('Payments context');
    });

    it('when we import a domain with duplicate service and subdomain references, domain pointers are deduplicated in frontmatter', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `domain Ecommerce {
  version 1.0.0
  name "Ecommerce Domain"

  service OrderService {
    version 1.0.0
    name "Order Service"
  }

  service OrderService {
    version 1.0.0
    name "Order Service"
  }

  subdomain Payments {
    version 1.0.0
    name "Payments Subdomain"
  }

  subdomain Payments {
    version 1.0.0
    name "Payments Subdomain"
  }
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const domain = await sdk.getDomain('Ecommerce', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.services).toEqual([{ id: 'OrderService', version: '1.0.0' }]);
      expect(domain!.domains).toEqual([{ id: 'Payments', version: '1.0.0' }]);
    });

    it('when importing the same domain version from multiple .ec files, the final result is deterministic and the last file wins', async () => {
      const firstFile = writeEcFile(
        'first.ec',
        `domain Orders {
  version 1.0.0
  name "Orders Domain First"
  summary "first summary"
}`
      );
      const secondFile = writeEcFile(
        'second.ec',
        `domain Orders {
  version 1.0.0
  name "Orders Domain Second"
}`
      );

      await importDSL({ files: [firstFile, secondFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const domain = await sdk.getDomain('Orders', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.name).toBe('Orders Domain Second');
      expect((domain as any).summary).toBeUndefined();
      expect(domain!.markdown).toContain('<NodeGraph />');
    });

    it('when importing in --flat mode, domain and subdomain output paths are flat and domain pointers remain correct', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `domain Ecommerce {
  version 1.0.0
  name "Ecommerce Domain"
  subdomain Payments {
    version 1.0.0
    name "Payments Subdomain"
  }
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath, flat: true });

      const sdk = createSDK(catalogPath);
      const domain = await sdk.getDomain('Ecommerce', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.domains).toEqual([{ id: 'Payments', version: '1.0.0' }]);
      expect(await sdk.getDomain('Payments', '1.0.0')).toBeDefined();

      expect(fs.existsSync(path.join(catalogPath, 'domains', 'Ecommerce', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(catalogPath, 'domains', 'Payments', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(catalogPath, 'domains', 'Ecommerce', 'subdomains', 'Payments'))).toBe(false);
      expect(fs.existsSync(path.join(catalogPath, 'domains', 'Ecommerce', 'domains', 'Payments'))).toBe(false);
    });

    it('when importing in --flat mode, services from domains are written to top-level paths and domain service pointers remain correct', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `domain Ecommerce {
  version 1.0.0
  name "Ecommerce Domain"
  service OrderService {
    version 1.0.0
    name "Order Service"
  }
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath, flat: true });

      const sdk = createSDK(catalogPath);
      const domain = await sdk.getDomain('Ecommerce', '1.0.0');
      const service = await sdk.getService('OrderService', '1.0.0');
      expect(domain).toBeDefined();
      expect(service).toBeDefined();
      expect(domain!.services).toEqual([{ id: 'OrderService', version: '1.0.0' }]);

      expect(fs.existsSync(path.join(catalogPath, 'services', 'OrderService', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(catalogPath, 'domains', 'Ecommerce', 'services', 'OrderService'))).toBe(false);
    });

    it('when importing in --flat mode, messages from domain services are written to top-level paths and service message pointers remain correct', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `domain Ecommerce {
  version 1.0.0
  name "Ecommerce Domain"
  service OrderService {
    version 1.0.0
    name "Order Service"
    sends event OrderCreated {
      version 1.0.0
      name "Order Created"
    }
    receives command CancelOrder {
      version 1.0.0
      name "Cancel Order"
    }
  }
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath, flat: true });

      const sdk = createSDK(catalogPath);
      const service = await sdk.getService('OrderService', '1.0.0');
      expect(service).toBeDefined();
      expect(service!.sends).toEqual([{ id: 'OrderCreated', version: '1.0.0' }]);
      expect(service!.receives).toEqual([{ id: 'CancelOrder', version: '1.0.0' }]);
      expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();
      expect(await sdk.getCommand('CancelOrder', '1.0.0')).toBeDefined();

      expect(fs.existsSync(path.join(catalogPath, 'events', 'OrderCreated', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(catalogPath, 'commands', 'CancelOrder', 'index.mdx'))).toBe(true);
      expect(
        fs.existsSync(path.join(catalogPath, 'domains', 'Ecommerce', 'services', 'OrderService', 'events', 'OrderCreated'))
      ).toBe(false);
      expect(
        fs.existsSync(path.join(catalogPath, 'domains', 'Ecommerce', 'services', 'OrderService', 'commands', 'CancelOrder'))
      ).toBe(false);
    });

    it('when we import a domain with draft true and deprecated true, both flags are written to domain frontmatter', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `domain Orders {
  version 1.0.0
  name "Orders Domain"
  draft true
  deprecated true
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const sdk = createSDK(catalogPath);
      const domain = await sdk.getDomain('Orders', '1.0.0');
      expect(domain).toBeDefined();
      expect((domain as any).draft).toBe(true);
      expect((domain as any).deprecated).toBe(true);
    });

    it('when we import a domain with draft false and deprecated false over existing true values, existing values are overridden and set to false', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeDomain({
        id: 'Orders',
        version: '1.0.0',
        name: 'Orders Domain',
        draft: true,
        deprecated: true,
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
  draft false
  deprecated false
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const domain = await sdk.getDomain('Orders', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.name).toBe('Orders Domain Updated');
      expect((domain as any).draft).toBe(false);
      expect((domain as any).deprecated).toBe(false);
      expect(domain!.markdown).toBe('Existing docs');
    });

    it('when we import a domain with owner statements over existing owners, owners are overwritten from DSL', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeDomain({
        id: 'Orders',
        version: '1.0.0',
        name: 'Orders Domain',
        owners: ['legacy-owner'],
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
  owner orders-team
  owner platform-team
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const domain = await sdk.getDomain('Orders', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.name).toBe('Orders Domain Updated');
      expect((domain as any).owners).toEqual(['orders-team', 'platform-team']);
      expect(domain!.markdown).toBe('Existing docs');
    });

    it('when we import a domain without owner statements over existing owners, owners are removed from frontmatter', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeDomain({
        id: 'Orders',
        version: '1.0.0',
        name: 'Orders Domain',
        owners: ['legacy-owner'],
        markdown: 'Existing docs',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const domain = await sdk.getDomain('Orders', '1.0.0');
      expect(domain).toBeDefined();
      expect(domain!.name).toBe('Orders Domain Updated');
      expect((domain as any).owners).toBeUndefined();
      expect(domain!.markdown).toBe('Existing docs');
    });

    const managedDomainKeyCases: Array<{
      key: 'name' | 'version' | 'owners' | 'schemaPath' | 'deprecated' | 'draft' | 'summary' | 'services' | 'domains';
      existingValue: any;
      importSource: string;
      expectedValue: any;
      readVersion?: string;
    }> = [
      {
        key: 'name',
        existingValue: 'Legacy Orders Domain Name',
        importSource: `domain Orders {
  version 1.0.0
}`,
        expectedValue: 'Orders',
        readVersion: '1.0.0',
      },
      {
        key: 'version',
        existingValue: '1.0.0',
        importSource: `domain Orders {
  name "Orders Domain Updated"
}`,
        expectedValue: undefined,
      },
      {
        key: 'owners',
        existingValue: ['orders-team'],
        importSource: `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'schemaPath',
        existingValue: 'schemas/orders.avsc',
        importSource: `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'deprecated',
        existingValue: true,
        importSource: `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'draft',
        existingValue: true,
        importSource: `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'summary',
        existingValue: 'Legacy orders summary',
        importSource: `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'services',
        existingValue: [{ id: 'OrderService', version: '1.0.0' }],
        importSource: `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
      {
        key: 'domains',
        existingValue: [{ id: 'Payments', version: '1.0.0' }],
        importSource: `domain Orders {
  version 1.0.0
  name "Orders Domain Updated"
}`,
        expectedValue: undefined,
        readVersion: '1.0.0',
      },
    ];

    it.each(managedDomainKeyCases)(
      'when importing over an existing domain and the DSL does not provide managed key "$key", that managed key is not preserved from existing frontmatter',
      async ({ key, existingValue, importSource, expectedValue, readVersion }) => {
        const sdk = createSDK(catalogPath);
        const domainToWrite: Record<string, any> = {
          id: 'Orders',
          version: '1.0.0',
          name: 'Orders Domain',
          markdown: 'Existing docs',
          customField: 'preserve-me',
        };
        domainToWrite[key] = existingValue;
        await sdk.writeDomain(domainToWrite as any);

        const ecFile = writeEcFile('test.ec', importSource);
        await importDSL({ files: [ecFile], dir: catalogPath });

        const domain = await sdk.getDomain('Orders', readVersion);
        expect(domain).toBeDefined();
        expect(domain!.id).toBe('Orders');
        if (expectedValue === undefined) {
          expect((domain as any)[key]).toBeUndefined();
        } else {
          expect((domain as any)[key]).toEqual(expectedValue);
        }
        expect(domain!.markdown).toBe('Existing docs');
        expect((domain as any).customField).toBe('preserve-me');
      }
    );

    it('when importing a newer domain version, non-DSL keys are carried forward from the latest version', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeDomain({
        id: 'Billing',
        version: '1.0.0',
        name: 'Billing Domain',
        summary: 'Billing summary',
        markdown: 'Billing docs v1',
        customField: 'carry-forward',
      } as any);

      const ecFile = writeEcFile(
        'test.ec',
        `domain Billing {
  version 2.0.0
  name "Billing Domain v2"
}`
      );

      await importDSL({ files: [ecFile], dir: catalogPath });

      const domain = await sdk.getDomain('Billing', '2.0.0');
      expect(domain).toBeDefined();
      expect(domain!.name).toBe('Billing Domain v2');
      expect((domain as any).summary).toBeUndefined();
      expect(domain!.markdown).toBe('Billing docs v1\n\n<NodeGraph />');
      expect((domain as any).customField).toBe('carry-forward');
    });
  });

  describe('export (from eventcatalog to .ec)', () => {
    it('when we export an existing domain to stdout, the DSL output contains the domain definition and visualizer entry', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        summary: 'Order management',
        markdown: '',
      });

      const result = await exportResource({
        resource: 'domain',
        id: 'Orders',
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        domain Orders {
          version 1.0.0
          name "Orders Domain"
          summary "Order management"
        }

        visualizer main {
          name "View of Orders"
          domain Orders
        }
      `);
    });

    it('when we export a domain with hydrate enabled, referenced service resources are included in the DSL output', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        services: [{ id: 'OrderService', version: '1.0.0' }],
        markdown: '',
      } as any);

      const result = await exportResource({
        resource: 'domain',
        id: 'Orders',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
        }

        // DOMAINS
        domain Orders {
          version 1.0.0
          name "Orders Domain"
          service OrderService@1.0.0
        }

        visualizer main {
          name "View of Orders"
          domain Orders
        }
      `);
    });

    it('when we export a domain with hydrate enabled and a referenced service publishes and subscribes to messages, the service and message resources are included in the DSL output', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeEvent({
        id: 'OrderCancelled',
        name: 'Order Cancelled',
        version: '1.0.0',
        markdown: '',
      });
      await sdk.writeService({
        id: 'OrderService',
        name: 'Order Service',
        version: '1.0.0',
        sends: [{ id: 'OrderCreated', version: '1.0.0' }],
        receives: [{ id: 'OrderCancelled', version: '1.0.0' }],
        markdown: '',
      });
      await sdk.writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        services: [{ id: 'OrderService', version: '1.0.0' }],
        markdown: '',
      } as any);

      const result = await exportResource({
        resource: 'domain',
        id: 'Orders',
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

        event OrderCancelled {
          version 1.0.0
          name "Order Cancelled"
        }

        // SERVICES
        service OrderService {
          version 1.0.0
          name "Order Service"
          sends event OrderCreated@1.0.0
          receives event OrderCancelled@1.0.0
        }

        // DOMAINS
        domain Orders {
          version 1.0.0
          name "Orders Domain"
          service OrderService@1.0.0
        }

        visualizer main {
          name "View of Orders"
          domain Orders
        }
      `);
    });

    it('when we export a domain with hydrate enabled and domain owners are defined, owner resources are included in the DSL output', async () => {
      const sdk = createSDK(catalogPath);
      await sdk.writeTeam({
        id: 'orders-team',
        name: 'Orders Team',
        markdown: '',
      } as any);
      await sdk.writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        owners: ['orders-team'],
        markdown: '',
      } as any);

      const result = await exportResource({
        resource: 'domain',
        id: 'Orders',
        hydrate: true,
        stdout: true,
        dir: catalogPath,
      });

      expect(result).toBe(dsl`
        // TEAMS
        team orders-team {
          name "Orders Team"
        }

        // DOMAINS
        domain Orders {
          version 1.0.0
          name "Orders Domain"
          owner orders-team
        }

        visualizer main {
          name "View of Orders"
          domain Orders
        }
      `);
    });

    it('when we export a domain that does not exist, a not found error is returned with the requested domain id', async () => {
      await expect(
        exportResource({
          resource: 'domain',
          id: 'MissingDomain',
          stdout: true,
          dir: catalogPath,
        })
      ).rejects.toThrow(`domain 'MissingDomain (latest)' not found in catalog at '${catalogPath}'`);
    });
  });
});
