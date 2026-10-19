// Helpers shared by the fitness functions in this catalog. Files that don't end in .fitness.ts are never run,
// so fitness functions can import them like any other module.
import type { ReadOnlyCatalog } from '@eventcatalog/fitness';

/** The ids of the services in a domain: its own services, its systems' services, and those of its subdomains. */
export const getServiceIdsInDomain = async (catalog: ReadOnlyCatalog, domainId: string): Promise<Set<string>> => {
  const domain = await catalog.getDomain(domainId);
  const ids = new Set<string>((domain?.services ?? []).map((service) => service.id));

  for (const pointer of domain?.systems ?? []) {
    const system = await catalog.getSystem(pointer.id, pointer.version);
    for (const service of system?.services ?? []) ids.add(service.id);
  }

  for (const subdomain of domain?.domains ?? []) {
    for (const id of await getServiceIdsInDomain(catalog, subdomain.id)) ids.add(id);
  }

  return ids;
};

/** The ids of the data stores (containers) that belong to a domain's systems. */
export const getDataStoreIdsInDomain = async (catalog: ReadOnlyCatalog, domainId: string): Promise<Set<string>> => {
  const domain = await catalog.getDomain(domainId);
  const ids = new Set<string>();

  for (const pointer of domain?.systems ?? []) {
    const system = await catalog.getSystem(pointer.id, pointer.version);
    for (const container of system?.containers ?? []) ids.add(container.id);
  }

  return ids;
};

/**
 * Which services each service depends on. A service depends on another when it receives a message the other one sends.
 * Returns a map of service id -> ids of the services it depends on.
 */
export const getServiceDependencies = async (catalog: ReadOnlyCatalog): Promise<Map<string, Set<string>>> => {
  const services = (await catalog.getServices({ latestOnly: true })) ?? [];

  const producersOf = new Map<string, Set<string>>();
  for (const service of services) {
    for (const message of service.sends ?? []) {
      if (!producersOf.has(message.id)) producersOf.set(message.id, new Set());
      producersOf.get(message.id)!.add(service.id);
    }
  }

  const dependencies = new Map<string, Set<string>>();
  for (const service of services) {
    const dependsOn = new Set<string>();
    for (const message of service.receives ?? []) {
      for (const producer of producersOf.get(message.id) ?? []) {
        if (producer !== service.id) dependsOn.add(producer);
      }
    }
    dependencies.set(service.id, dependsOn);
  }

  return dependencies;
};
