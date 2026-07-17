import { maxSatisfying, validRange, satisfies } from 'semver';
import { getAdrs } from './adrs';
import { getAgents } from './agents';
import { getChannels } from './channels';
import { getCommands } from './commands';
import { getDataProducts } from './data-products';
import { getDataStores } from './data-stores';
import { getDomains } from './domains';
import { getEntities } from './entities';
import { getEvents } from './events';
import { getFlows } from './flows';
import { getQueries } from './queries';
import { getServices } from './services';
import { getSystems } from './systems';
import type {
  BaseSchema,
  CatalogGraph,
  CatalogGraphResource,
  CatalogGraphResourceType,
  CatalogGraphRoot,
  ResourcePointer,
} from './types';

type CatalogResource = BaseSchema & {
  hidden?: boolean;
  [key: string]: any;
};

type ResourceCollectionLoader = (options?: { latestOnly?: boolean }) => Promise<CatalogResource[] | undefined>;

type ResourceCollection = {
  all: CatalogResource[];
  latest: CatalogResource[];
};

const RESOURCE_TYPE_ORDER: CatalogGraphResourceType[] = [
  'domain',
  'system',
  'service',
  'agent',
  'event',
  'command',
  'query',
  'channel',
  'entity',
  'container',
  'data-product',
  'flow',
  'adr',
];

const resourceKey = (resource: CatalogGraphResource) => `${resource.type}:${resource.id}:${resource.version}`;

const toGraphResource = (type: CatalogGraphResourceType, resource: CatalogResource): CatalogGraphResource => ({
  type,
  id: resource.id,
  version: resource.version,
});

const pointerMatchesResource = (pointer: ResourcePointer, resource: CatalogGraphResource) => {
  if (pointer.type !== resource.type || pointer.id !== resource.id) return false;
  if (!pointer.version || pointer.version === 'latest') return true;
  if (pointer.version === resource.version) return true;

  const range = validRange(pointer.version);
  return range ? satisfies(resource.version, range) : false;
};

/**
 * Returns the resources reachable from a domain or system.
 *
 * Resources are returned as references. Use the relevant SDK getter to load a
 * resource's content or schema when it is needed.
 */
export const getGraph =
  (directory: string) =>
  async (root: CatalogGraphRoot): Promise<CatalogGraph | undefined> => {
    const collectionLoaders: Record<CatalogGraphResourceType, ResourceCollectionLoader> = {
      domain: getDomains(directory),
      system: getSystems(directory),
      service: getServices(directory),
      agent: getAgents(directory),
      event: getEvents(directory),
      command: getCommands(directory),
      query: getQueries(directory),
      flow: getFlows(directory),
      channel: getChannels(directory),
      entity: getEntities(directory),
      container: getDataStores(directory),
      'data-product': getDataProducts(directory),
      adr: getAdrs(directory),
    };

    const collectionCache = new Map<CatalogGraphResourceType, Promise<ResourceCollection>>();
    const resources = new Map<string, CatalogGraphResource>();

    const loadCollection = (type: CatalogGraphResourceType) => {
      const cachedCollection = collectionCache.get(type);
      if (cachedCollection) return cachedCollection;

      const collection = Promise.all([collectionLoaders[type](), collectionLoaders[type]({ latestOnly: true })]).then(
        ([all, latest]) => ({ all: all || [], latest: latest || [] })
      );
      collectionCache.set(type, collection);
      return collection;
    };

    const add = (type: CatalogGraphResourceType, resource: CatalogResource | undefined) => {
      if (!resource || resource.hidden === true) return false;

      const graphResource = toGraphResource(type, resource);
      const key = resourceKey(graphResource);
      if (resources.has(key)) return false;

      resources.set(key, graphResource);
      return true;
    };

    const read = async (type: CatalogGraphResourceType, pointer: ResourcePointer) => {
      const collection = await loadCollection(type);

      if (!pointer.version || pointer.version === 'latest') {
        return collection.latest.find((resource) => resource.id === pointer.id);
      }

      const exactMatch = collection.all.find((resource) => resource.id === pointer.id && resource.version === pointer.version);
      if (exactMatch) return exactMatch;

      const range = validRange(pointer.version);
      if (!range) return undefined;

      const candidates = collection.all.filter((resource) => resource.id === pointer.id);
      const version = maxSatisfying(
        candidates.map((resource) => resource.version),
        range
      );
      return candidates.find((resource) => resource.version === version);
    };

    const visitPointer = async (
      type: CatalogGraphResourceType,
      pointer: ResourcePointer,
      visit?: (resource: CatalogResource) => Promise<void>
    ) => {
      const resource = await read(type, pointer);
      if (!resource) return;

      if (visit) await visit(resource);
      else add(type, resource);
    };

    const visitMessagePointer = async (pointer: ResourcePointer) => {
      for (const type of ['event', 'command', 'query'] as const) {
        const message = await read(type, pointer);
        if (!message || !add(type, message)) continue;

        for (const channel of [...(message.channels || []), ...(message.messageChannels || [])]) {
          await visitPointer('channel', channel);
        }
      }
    };

    const visitFlow = async (flow: CatalogResource) => {
      add('flow', flow);
    };

    const visitRoutableResource = async (type: 'service' | 'agent', resource: CatalogResource) => {
      if (!add(type, resource)) return;

      for (const pointer of [...(resource.sends || []), ...(resource.receives || [])]) {
        await visitMessagePointer(pointer);
      }
      for (const pointer of resource.entities || []) await visitPointer('entity', pointer);
      for (const pointer of resource.flows || []) await visitPointer('flow', pointer, visitFlow);
      for (const pointer of [...(resource.writesTo || []), ...(resource.readsFrom || [])]) {
        await visitPointer('container', pointer);
      }
    };

    const visitDataProduct = async (dataProduct: CatalogResource) => {
      if (!add('data-product', dataProduct)) return;

      for (const pointer of [...(dataProduct.inputs || []), ...(dataProduct.outputs || [])]) {
        for (const type of ['event', 'command', 'query', 'channel', 'container', 'service'] as const) {
          const resource = await read(type, pointer);
          if (!resource) continue;

          if (type === 'service') await visitRoutableResource(type, resource);
          else if (type === 'event' || type === 'command' || type === 'query') await visitMessagePointer(pointer);
          else add(type, resource);
        }
      }
    };

    const visitSystem = async (system: CatalogResource) => {
      if (!add('system', system)) return;

      for (const pointer of system.services || []) {
        await visitPointer('service', pointer, (resource) => visitRoutableResource('service', resource));
      }
      for (const pointer of system.flows || []) await visitPointer('flow', pointer, visitFlow);
      for (const pointer of system.entities || []) await visitPointer('entity', pointer);
      for (const pointer of system.containers || []) await visitPointer('container', pointer);
    };

    const visitDomain = async (domain: CatalogResource) => {
      if (!add('domain', domain)) return;

      for (const pointer of domain.domains || []) await visitPointer('domain', pointer, visitDomain);
      for (const pointer of domain.systems || []) await visitPointer('system', pointer, visitSystem);
      for (const pointer of domain.services || []) {
        await visitPointer('service', pointer, (resource) => visitRoutableResource('service', resource));
      }
      for (const pointer of domain.agents || []) {
        await visitPointer('agent', pointer, (resource) => visitRoutableResource('agent', resource));
      }
      for (const pointer of domain.entities || []) await visitPointer('entity', pointer);
      for (const pointer of domain.flows || []) await visitPointer('flow', pointer, visitFlow);
      for (const pointer of [...(domain.dataProducts || []), ...(domain['data-products'] || [])]) {
        await visitPointer('data-product', pointer, visitDataProduct);
      }
      for (const pointer of [...(domain.sends || []), ...(domain.receives || [])]) {
        await visitMessagePointer(pointer);
      }
    };

    const rootResource = await read(root.type, root);
    if (!rootResource || rootResource.hidden === true) return undefined;

    if (root.type === 'domain') await visitDomain(rootResource);
    else await visitSystem(rootResource);

    const adrs = (await loadCollection('adr')).all;
    for (const adr of adrs) {
      const appliesToScopedResource = (adr.appliesTo || []).some((pointer) =>
        Array.from(resources.values()).some((resource) => pointerMatchesResource(pointer, resource))
      );
      if (appliesToScopedResource) add('adr', adr);
    }

    const resolvedRoot = toGraphResource(root.type, rootResource);
    const resolvedRootKey = resourceKey(resolvedRoot);
    const typeOrder = new Map(RESOURCE_TYPE_ORDER.map((type, index) => [type, index]));
    const relatedResources = Array.from(resources.values())
      .filter((resource) => resourceKey(resource) !== resolvedRootKey)
      .sort((left, right) => {
        const typeComparison = (typeOrder.get(left.type) || 0) - (typeOrder.get(right.type) || 0);
        if (typeComparison !== 0) return typeComparison;
        const idComparison = left.id.localeCompare(right.id);
        return idComparison !== 0 ? idComparison : left.version.localeCompare(right.version);
      });

    return {
      root: resolvedRoot,
      resources: [resolvedRoot, ...relatedResources],
    };
  };
