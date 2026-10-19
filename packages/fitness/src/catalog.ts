import createSDK from '@eventcatalog/sdk';

type SDK = ReturnType<typeof createSDK>;

/** The SDK methods fitness functions can call: the ones that read the catalog, never ones that write to it. */
export const READ_ONLY_METHODS = [
  // Messages
  'getEvent',
  'getEvents',
  'eventHasVersion',
  'getExamplesFromEvent',
  'getCommand',
  'getCommands',
  'commandHasVersion',
  'getExamplesFromCommand',
  'getQuery',
  'getQueries',
  'queryHasVersion',
  'getExamplesFromQuery',
  'getMessageBySchemaPath',
  'getProducersAndConsumersForMessage',
  'getConsumersOfSchema',
  'getProducersOfSchema',
  'getSchemaForMessage',
  // Architecture
  'getDomain',
  'getDomains',
  'domainHasVersion',
  'getUbiquitousLanguageFromDomain',
  'getSystem',
  'getSystems',
  'systemHasVersion',
  'getService',
  'getServices',
  'serviceHasVersion',
  'getSpecificationFilesForService',
  'getAgent',
  'getAgents',
  'agentHasVersion',
  'getChannel',
  'getChannels',
  'channelHasVersion',
  'getFlow',
  'getFlows',
  'flowHasVersion',
  'getEntity',
  'getEntities',
  'entityHasVersion',
  'getDataStore',
  'getDataStores',
  'dataStoreHasVersion',
  'getDataProduct',
  'getDataProducts',
  'dataProductHasVersion',
  'getDiagram',
  'getDiagrams',
  'diagramHasVersion',
  'getAdr',
  'getAdrs',
  'adrHasVersion',
  // People and docs
  'getTeam',
  'getTeams',
  'getUser',
  'getUsers',
  'getOwnersForResource',
  'getCustomDoc',
  'getCustomDocs',
  'getChangelog',
  // Relationships and queries
  'getGraph',
  'getResourcesByProperty',
  'getResourcePath',
  'getResourceFolderName',
  'getEventCatalogConfigurationFile',
] as const satisfies readonly (keyof SDK)[];

export type ReadOnlyCatalog = Readonly<Pick<SDK, (typeof READ_ONLY_METHODS)[number]>>;

// The SDK caches what it reads, so callers get their own copy: changing a resource can't change what the next call returns.
// The catalog's config can hold functions, which structuredClone can't copy: it is copied object by object instead,
// keeping the functions as they are.
const copyWithFunctions = (value: unknown, copies: WeakMap<object, unknown>): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (copies.has(value)) return copies.get(value);

  if (Array.isArray(value)) {
    const array: unknown[] = [];
    copies.set(value, array);
    for (const item of value) array.push(copyWithFunctions(item, copies));
    return array;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === null) {
    const object: Record<string, unknown> = Object.create(prototype);
    copies.set(value, object);
    for (const [key, item] of Object.entries(value)) object[key] = copyWithFunctions(item, copies);
    return object;
  }

  // Anything else (dates, maps, class instances): a copy where possible
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
};

const copy = <T>(value: T): T => {
  if (value === undefined || value === null) return value;
  try {
    return structuredClone(value);
  } catch {
    return copyWithFunctions(value, new WeakMap()) as T;
  }
};

/** Read-only access to the catalog in `catalogDir`, through the EventCatalog SDK. */
export const createReadOnlyCatalog = (catalogDir: string): ReadOnlyCatalog => {
  const sdk = createSDK(catalogDir) as Record<string, (...args: unknown[]) => unknown>;
  const catalog: Record<string, unknown> = {};

  for (const method of READ_ONLY_METHODS) {
    catalog[method] = (...args: unknown[]) => {
      const result = sdk[method](...args);
      return result instanceof Promise ? result.then(copy) : copy(result);
    };
  }

  return Object.freeze(catalog) as unknown as ReadOnlyCatalog;
};
