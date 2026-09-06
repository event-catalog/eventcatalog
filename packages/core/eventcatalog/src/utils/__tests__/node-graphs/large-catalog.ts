/**
 * Builds a large synthetic catalog for node-graph performance benchmarks.
 *
 * Commerce domain owns `domainServiceCount` services. The remaining services
 * sit outside the domain so producer/consumer scans still walk the full catalog.
 * Each service sends and receives a sliding window of events, creating a dense
 * producer/consumer mesh similar to a busy event-driven architecture.
 */
export interface LargeCatalogOptions {
  catalogServiceCount?: number;
  domainServiceCount?: number;
  eventCount?: number;
  messagesPerDirection?: number;
}

export interface LargeCatalog {
  domains: any[];
  services: any[];
  events: any[];
  commands: any[];
  queries: any[];
  agents: any[];
  channels: any[];
  containers: any[];
  'data-products': any[];
}

const DEFAULTS = {
  catalogServiceCount: 200,
  domainServiceCount: 80,
  eventCount: 400,
  messagesPerDirection: 10,
};

export const createLargeCatalog = (options: LargeCatalogOptions = {}): LargeCatalog => {
  const catalogServiceCount = options.catalogServiceCount ?? DEFAULTS.catalogServiceCount;
  const domainServiceCount = options.domainServiceCount ?? DEFAULTS.domainServiceCount;
  const eventCount = options.eventCount ?? DEFAULTS.eventCount;
  const messagesPerDirection = options.messagesPerDirection ?? DEFAULTS.messagesPerDirection;

  const events = Array.from({ length: eventCount }, (_, i) => {
    const id = `Event${i}`;
    return {
      id: `events/${id}/index.mdx`,
      slug: `events/${id}`,
      collection: 'events',
      data: {
        id,
        name: id,
        version: '1.0.0',
      },
    };
  });

  const services = Array.from({ length: catalogServiceCount }, (_, i) => {
    const id = `Service${i}`;
    const sends = Array.from({ length: messagesPerDirection }, (_, j) => ({
      id: `Event${(i + j) % eventCount}`,
      version: '1.0.0',
    }));
    const receives = Array.from({ length: messagesPerDirection }, (_, j) => ({
      id: `Event${(i + 50 + j) % eventCount}`,
      version: '1.0.0',
    }));

    return {
      id: `services/${id}/index.mdx`,
      slug: `services/${id}`,
      collection: 'services',
      data: {
        id,
        name: id,
        version: '1.0.0',
        sends,
        receives,
      },
    };
  });

  const domains = [
    {
      id: 'domains/Commerce/index.mdx',
      slug: 'domains/Commerce',
      collection: 'domains',
      filePath: 'domains/Commerce/index.mdx',
      data: {
        id: 'Commerce',
        name: 'Commerce',
        version: '1.0.0',
        services: services.slice(0, domainServiceCount).map((service) => ({
          id: service.data.id,
          version: service.data.version,
        })),
      },
    },
  ];

  return {
    domains,
    services,
    events,
    commands: [],
    queries: [],
    agents: [],
    channels: [],
    containers: [],
    'data-products': [],
  };
};

export const installLargeCatalogMock = (catalog: LargeCatalog, getCollection: (key: string) => Promise<any[]>) => {
  return ((key: string) => {
    switch (key) {
      case 'domains':
        return Promise.resolve(catalog.domains);
      case 'services':
        return Promise.resolve(catalog.services);
      case 'events':
        return Promise.resolve(catalog.events);
      case 'commands':
        return Promise.resolve(catalog.commands);
      case 'queries':
        return Promise.resolve(catalog.queries);
      case 'agents':
        return Promise.resolve(catalog.agents);
      case 'channels':
        return Promise.resolve(catalog.channels);
      case 'containers':
        return Promise.resolve(catalog.containers);
      case 'data-products':
        return Promise.resolve(catalog['data-products']);
      default:
        return Promise.resolve([]);
    }
  }) as typeof getCollection;
};
