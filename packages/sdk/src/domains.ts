import type { Domain, UbiquitousLanguageDictionary } from './types';
import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import fsSync from 'node:fs';
import {
  addFileToResource,
  getResource,
  getResourcePath,
  getResources,
  rmResourceById,
  versionResource,
  writeResource,
} from './internal/resources';
import { findFileById, readMdxFile, uniqueVersions } from './internal/utils';
import matter from 'gray-matter';

/**
 * Returns a domain from EventCatalog.
 *
 * You can optionally specify a version to get a specific version of the domain
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getDomain } = utils('/path/to/eventcatalog');
 *
 * // Gets the latest version of the domain
 * const domain = await getDomain('Payment');
 *
 * // Gets a version of the domain
 * const domain = await getDomain('Payment', '0.0.1');
 * ```
 */
export const getDomain =
  (directory: string) =>
  async (id: string, version?: string): Promise<Domain> =>
    getResource(directory, id, version, { type: 'domain' }) as Promise<Domain>;

/**
 * Returns all domains from EventCatalog.
 *
 * You can optionally specify if you want to get the latest version of the domains.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getDomains } = utils('/path/to/eventcatalog');
 *
 * // Gets all domains (and versions) from the catalog
 * const domains = await getDomains();
 *
 * // Gets all domains (only latest version) from the catalog
 * const domains = await getDomains({ latestOnly: true });
 * ```
 */
export const getDomains =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<Domain[]> =>
    getResources(directory, {
      type: 'domains',
      ignore: ['**/services/**', '**/events/**', '**/commands/**', '**/queries/**', '**/flows/**', '**/entities/**'],
      ...options,
    }) as Promise<Domain[]>;

/**
 * Write a domain to EventCatalog.
 *
 * You can optionally overide the path of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeDomain } = utils('/path/to/eventcatalog');
 *
 * // Write a domain
 * // Domain would be written to domains/Payment
 * await writeDomain({
 *   id: 'Payment',
 *   name: 'Payment domain',
 *   version: '0.0.1',
 *   summary: 'Domain for all things to do with payments',
 *   markdown: '# Hello world',
 * });
 *
 * // Write a domain to the catalog but override the path
 * // Domain would be written to domains/Inventory/Payment
 * await writeDomain({
 *    id: 'Payment',
 *    name: 'Inventory Adjusted',
 *    version: '0.0.1',
 *    summary: 'This is a summary',
 *    markdown: '# Hello world',
 * }, { path: "/Inventory/Payment"});
 *
 * // Write a domain to the catalog and override the existing content (if there is any)
 * await writeDomain({
 *    id: 'Payment',
 *    name: 'Inventory Adjusted',
 *    version: '0.0.1',
 *    summary: 'This is a summary',
 *    markdown: '# Hello world',
 * }, { override: true });
 *
 * // Write a domain to the catalog and version the previous version
 * // only works if the new version is greater than the previous version
 * await writeDomain({
 *    id: 'Payment',
 *    name: 'Inventory Adjusted',
 *    version: '0.0.1',
 *    summary: 'This is a summary',
 *    markdown: '# Hello world',
 * }, { versionExistingContent: true });
 *
 * ```
 */
export const writeDomain =
  (directory: string) =>
  async (
    domain: Domain,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      versionExistingContent: false,
      format: 'mdx',
    }
  ) => {
    const resource: Domain = { ...domain };

    if (Array.isArray(domain.services)) {
      resource.services = uniqueVersions(domain.services as { id: string; version: string }[]);
    }

    if (Array.isArray(domain.domains)) {
      resource.domains = uniqueVersions(domain.domains as { id: string; version: string }[]);
    }

    if (Array.isArray(domain.sends)) {
      resource.sends = uniqueVersions(domain.sends as { id: string; version: string }[]);
    }

    if (Array.isArray(domain.receives)) {
      resource.receives = uniqueVersions(domain.receives as { id: string; version: string }[]);
    }

    if (Array.isArray(domain.dataProducts)) {
      resource.dataProducts = uniqueVersions(domain.dataProducts as { id: string; version: string }[]);
    }

    return await writeResource(directory, resource, { ...options, type: 'domain' });
  };

/**
 * Version a domain by it's id.
 *
 * Takes the latest domain and moves it to a versioned directory.
 * All files with this domain are also versioned. (e.g /domains/Payment/openapi.yml)
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { versionDomain } = utils('/path/to/eventcatalog');
 *
 * // moves the latest Payment domain to a versioned directory
 * // the version within that domain is used as the version number.
 * await versionDomain('Payment');
 *
 * ```
 */
export const versionDomain = (directory: string) => async (id: string) => versionResource(directory, id);

/**
 * Delete a domain at it's given path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmDomain } = utils('/path/to/eventcatalog');
 *
 * // Removes the domain at domains/Payment
 * await rmDomain('/Payment');
 * ```
 */
export const rmDomain = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
};

/**
 * Delete a domain by it's id.
 *
 * Optionally specify a version to delete a specific version of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmDomainById } = utils('/path/to/eventcatalog');
 *
 * // deletes the latest Payment event
 * await rmDomainById('Payment');
 *
 * // deletes a specific version of the Payment event
 * await rmDomainById('Payment', '0.0.1');
 * ```
 */
export const rmDomainById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) =>
  rmResourceById(directory, id, version, { type: 'domain', persistFiles });

/**
 * Add a file to a domain by it's id.
 *
 * Optionally specify a version to add a file to a specific version of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { addFileToDomain } = utils('/path/to/eventcatalog');
 *
 * // adds a file to the latest Payment event
 * await addFileToDomain('Payment', { content: 'Hello world', fileName: 'hello.txt' });
 *
 * // adds a file to a specific version of the Payment event
 * await addFileToDomain('Payment', { content: 'Hello world', fileName: 'hello.txt' }, '0.0.1');
 *
 * ```
 */

export const addFileToDomain =
  (directory: string) => async (id: string, file: { content: string; fileName: string }, version?: string) =>
    addFileToResource(directory, id, file, version);

/**
 * Adds a ubiquitous language dictionary to a domain.
 *
 * Optionally specify a version to add a ubiquitous language dictionary to a specific version of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { addUbiquitousLanguageToDomain } = utils('/path/to/eventcatalog');
 *
 * // Adds a ubiquitous language dictionary to the latest Payment domain
 * await addUbiquitousLanguageToDomain('Payment', { dictionary: [{ id: 'Order', name: 'Order', summary: 'All things to do with the payment systems', description: 'This is a description', icon: 'KeyIcon' }] });
 *
 * // Adds a ubiquitous language dictionary to a specific version of the domain
 * await addUbiquitousLanguageToDomain('Payment', { dictionary: [{ id: 'Order', name: 'Order', summary: 'All things to do with the payment systems', description: 'This is a description', icon: 'KeyIcon' }] }, '0.0.1');
 * ```
 */

export const addUbiquitousLanguageToDomain =
  (directory: string) => async (id: string, ubiquitousLanguageDictionary: UbiquitousLanguageDictionary, version?: string) => {
    const content = matter.stringify('', {
      ...ubiquitousLanguageDictionary,
    });
    await addFileToResource(directory, id, { content, fileName: 'ubiquitous-language.mdx' }, version);
  };

/**
 * Returns the ubiquitous language dictionary from a domain.
 *
 * Optionally specify a version to get the ubiquitous language dictionary from a specific version of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getUbiquitousLanguageFromDomain } = utils('/path/to/eventcatalog');
 *
 * const ubiquitousLanguage = await getUbiquitousLanguageFromDomain('Payment');
 *
 * // Returns the ubiquitous language dictionary from a specific version of the domain
 * const ubiquitousLanguage = await getUbiquitousLanguageFromDomain('Payment', '0.0.1');
 * ```
 */
export const getUbiquitousLanguageFromDomain = (directory: string) => async (id: string, version?: string) => {
  const pathToDomain = (await findFileById(directory, id, version)) || '';
  const pathToUbiquitousLanguage = path.join(path.dirname(pathToDomain), 'ubiquitous-language.mdx');

  const fileExists = fsSync.existsSync(pathToUbiquitousLanguage);

  if (!fileExists) {
    return undefined;
  }

  const content = await readMdxFile(pathToUbiquitousLanguage);

  return content;
};

/**
 * Check to see if the catalog has a version for the given domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { domainHasVersion } = utils('/path/to/eventcatalog');
 *
 * // returns true if version is found for the given event and version (supports semver)
 * await domainHasVersion('Orders', '0.0.1');
 * await domainHasVersion('Orders', 'latest');
 * await domainHasVersion('Orders', '0.0.x');*
 *
 * ```
 */
export const domainHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

/**
 * Add a service to a domain by it's id.
 *
 * Optionally specify a version to add the service to a specific version of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * // Adds a service to the domain
 * const { addServiceToDomain } = utils('/path/to/eventcatalog');
 *
 * // Adds a service (Orders Service) to the domain (Orders)
 * await addServiceToDomain('Orders', { service: 'Order Service', version: '2.0.0' });
 * // Adds a service (Orders Service) to the domain (Orders) with a specific version
 * await addServiceToDomain('Orders', { service: 'Order Service', version: '2.0.0' }, '1.0.0');
 * ```
 */

export const addServiceToDomain =
  (directory: string) => async (id: string, service: { id: string; version: string }, version?: string) => {
    let domain: Domain = await getDomain(directory)(id, version);
    const domainPath = await getResourcePath(directory, id, version);

    // Get the extension of the file
    const extension = path.extname(domainPath?.fullPath || '');

    if (domain.services === undefined) {
      domain.services = [];
    }

    const serviceExistsInList = domain.services.some((s) => s.id === service.id && s.version === service.version);

    if (serviceExistsInList) {
      return;
    }

    // Add service to the list
    domain.services.push(service);

    await rmDomainById(directory)(id, version, true);
    await writeDomain(directory)(domain, { format: extension === '.md' ? 'md' : 'mdx' });
  };

/**
 * Add a subdomain to a domain by it's id.
 * Optionally specify a version to add the subdomain to a specific version of the domain
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * // Adds a subdomain to the given domain
 * const { addSubDomainToDomain } = utils('/path/to/eventcatalog');
 *
 * // Adds a subdomain (Payment Domain) to the domain (Orders)
 * await addSubDomainToDomain('Orders', { service: 'Payment Domain', version: '2.0.0' });
 * // Adds a subdomain (Inventory Domain) to the domain (Orders) with a specific version
 * await addSubDomainToDomain('Orders', { service: 'Inventory Domain', version: '2.0.0' }, '1.0.0');
 * ```
 */

export const addSubDomainToDomain =
  (directory: string) => async (id: string, subDomain: { id: string; version: string }, version?: string) => {
    let domain: Domain = await getDomain(directory)(id, version);
    const domainPath = await getResourcePath(directory, id, version);

    // Get the extension of the file
    const extension = path.extname(domainPath?.fullPath || '');

    if (domain.domains === undefined) {
      domain.domains = [];
    }

    const subDomainExistsInList = domain.domains.some((s) => s.id === subDomain.id && s.version === subDomain.version);

    if (subDomainExistsInList) {
      return;
    }

    // Add service to the list
    domain.domains.push(subDomain);

    await rmDomainById(directory)(id, version, true);
    await writeDomain(directory)(domain, { format: extension === '.md' ? 'md' : 'mdx' });
  };

/**
 * Add an entity to a domain by its id.
 * Optionally specify a version to add the entity to a specific version of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * // Adds an entity to the domain
 * const { addEntityToDomain } = utils('/path/to/eventcatalog');
 *
 * // Adds an entity (User) to the domain (Orders)
 * await addEntityToDomain('Orders', { id: 'User', version: '1.0.0' });
 * // Adds an entity (Product) to the domain (Orders) with a specific version
 * await addEntityToDomain('Orders', { id: 'Product', version: '2.0.0' }, '1.0.0');
 * ```
 */
export const addEntityToDomain =
  (directory: string) => async (id: string, entity: { id: string; version: string }, version?: string) => {
    let domain: Domain = await getDomain(directory)(id, version);
    const domainPath = await getResourcePath(directory, id, version);

    // Get the extension of the file
    const extension = path.extname(domainPath?.fullPath || '');

    if (domain.entities === undefined) {
      domain.entities = [];
    }

    const entityExistsInList = domain.entities.some((e) => e.id === entity.id && e.version === entity.version);

    if (entityExistsInList) {
      return;
    }

    // Add entity to the list
    domain.entities.push(entity);

    await rmDomainById(directory)(id, version, true);
    await writeDomain(directory)(domain, { format: extension === '.md' ? 'md' : 'mdx' });
  };

/**
 * Add a data product to a domain by its id.
 * Optionally specify a version to add the data product to a specific version of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * // Adds a data product to the domain
 * const { addDataProductToDomain } = utils('/path/to/eventcatalog');
 *
 * // Adds a data product (CustomerDataProduct) to the domain (Orders)
 * await addDataProductToDomain('Orders', { id: 'CustomerDataProduct', version: '1.0.0' });
 * // Adds a data product (SalesDataProduct) to the domain (Orders) with a specific version
 * await addDataProductToDomain('Orders', { id: 'SalesDataProduct', version: '2.0.0' }, '1.0.0');
 * ```
 */
export const addDataProductToDomain =
  (directory: string) => async (id: string, dataProduct: { id: string; version: string }, version?: string) => {
    let domain: Domain = await getDomain(directory)(id, version);
    const domainPath = await getResourcePath(directory, id, version);

    // Get the extension of the file
    const extension = path.extname(domainPath?.fullPath || '');

    if (domain.dataProducts === undefined) {
      domain.dataProducts = [];
    }

    const dataProductExistsInList = domain.dataProducts.some(
      (dp) => dp.id === dataProduct.id && dp.version === dataProduct.version
    );

    if (dataProductExistsInList) {
      return;
    }

    // Add data product to the list
    domain.dataProducts.push(dataProduct);

    await rmDomainById(directory)(id, version, true);
    await writeDomain(directory)(domain, { format: extension === '.md' ? 'md' : 'mdx' });
  };

/**
 * Add an event/command/query to a domain by its id.
 *
 * Optionally specify a version to add the message to a specific version of the domain.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * // Adds an event to the domain
 * const { addEventToDomain, addCommandToDomain, addQueryToDomain } = utils('/path/to/eventcatalog');
 *
 * // Adds a new event (OrderCreated) that the Orders domain will send
 * await addEventToDomain('Orders', 'sends', { id: 'OrderCreated', version: '2.0.0' });
 *
 * // Adds a new event (PaymentProcessed) that the Orders domain will receive
 * await addEventToDomain('Orders', 'receives', { id: 'PaymentProcessed', version: '1.0.0' });
 *
 * // Adds a new command (ProcessOrder) that the Orders domain will receive
 * await addCommandToDomain('Orders', 'receives', { id: 'ProcessOrder', version: '1.0.0' });
 *
 * // Adds a message to a specific version of the domain
 * await addEventToDomain('Orders', 'sends', { id: 'OrderShipped', version: '1.0.0' }, '2.0.0');
 * ```
 */
export const addMessageToDomain =
  (directory: string) => async (id: string, direction: string, message: { id: string; version: string }, version?: string) => {
    let domain: Domain = await getDomain(directory)(id, version);
    const domainPath = await getResourcePath(directory, id, version);
    const extension = path.extname(domainPath?.fullPath || '');

    if (direction === 'sends') {
      if (domain.sends === undefined) {
        domain.sends = [];
      }
      // Check if the message is already in the list
      for (let i = 0; i < domain.sends.length; i++) {
        if (domain.sends[i].id === message.id && domain.sends[i].version === message.version) {
          return;
        }
      }
      domain.sends.push({ id: message.id, version: message.version });
    } else if (direction === 'receives') {
      if (domain.receives === undefined) {
        domain.receives = [];
      }
      // Check if the message is already in the list
      for (let i = 0; i < domain.receives.length; i++) {
        if (domain.receives[i].id === message.id && domain.receives[i].version === message.version) {
          return;
        }
      }
      domain.receives.push({ id: message.id, version: message.version });
    } else {
      throw new Error(`Direction ${direction} is invalid, only 'receives' and 'sends' are supported`);
    }

    const existingResource = await findFileById(directory, id, version);

    if (!existingResource) {
      throw new Error(`Cannot find domain ${id} in the catalog`);
    }

    // Get where the domain was located, make sure it goes back there (handles subdomains)
    // Use lastIndexOf to find the last /domains/ in the path (for nested domains)
    const normalizedPath = existingResource.replace(/\\/g, '/');
    const lastDomainsIndex = normalizedPath.lastIndexOf('/domains/');
    const pathToResource = existingResource.substring(0, lastDomainsIndex + '/domains'.length);

    await rmDomainById(directory)(id, version, true);
    await writeDomain(pathToResource)(domain, { format: extension === '.md' ? 'md' : 'mdx' });
  };
