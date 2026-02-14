// Exporting getCommands and getEvents directly
import { getCommands } from '@utils/collections/commands';
import { getEvents } from '@utils/collections/events';
import { getQueries } from './queries';
import type { CollectionEntry } from 'astro:content';
import { satisfies } from './util';
export { getCommands } from '@utils/collections/commands';
export { getEvents } from '@utils/collections/events';

interface Props {
  getAllVersions?: boolean;
  hydrateServices?: boolean;
}

interface HydrateProducersAndConsumersProps {
  message: {
    data: {
      id: string;
      version: string;
      latestVersion?: string;
    };
  };
  services: CollectionEntry<'services'>[];
  dataProducts: CollectionEntry<'data-products'>[];
  hydrate?: boolean;
}

/**
 * Hydrates producers and consumers for a message (event, command, or query).
 * Finds services and data products that produce or consume the given message.
 */
export const hydrateProducersAndConsumers = ({
  message,
  services = [],
  dataProducts = [],
  hydrate = true,
}: HydrateProducersAndConsumersProps) => {
  const { id: messageId, version: messageVersion, latestVersion = messageVersion } = message.data;

  const matchesVersion = (pointerVersion: string | undefined) => {
    if (pointerVersion === 'latest' || pointerVersion === undefined) {
      return messageVersion === latestVersion;
    }
    return satisfies(messageVersion, pointerVersion);
  };

  const toResult = <T extends CollectionEntry<'services'> | CollectionEntry<'data-products'>>(resource: T) => {
    if (!hydrate) return { id: resource.data.id, version: resource.data.version };
    return resource;
  };

  // Services that send this message (producers)
  const serviceProducers = services
    .filter((s) => s.data.sends?.some((p) => p.id === messageId && matchesVersion(p.version)))
    .map(toResult);

  // Services that receive this message (consumers)
  const serviceConsumers = services
    .filter((s) => s.data.receives?.some((p) => p.id === messageId && matchesVersion(p.version)))
    .map(toResult);

  // Data products that output this message (producers)
  const dataProductProducers = dataProducts
    .filter((dp) => dp.data.outputs?.some((p) => p.id === messageId && matchesVersion(p.version)))
    .map(toResult);

  // Data products that input this message (consumers)
  const dataProductConsumers = dataProducts
    .filter((dp) => dp.data.inputs?.some((p) => p.id === messageId && matchesVersion(p.version)))
    .map(toResult);

  return {
    producers: [...serviceProducers, ...dataProductProducers],
    consumers: [...serviceConsumers, ...dataProductConsumers],
  };
};

// --- Reverse Index for O(1) producer/consumer lookups ---

interface IndexEntry {
  resource: CollectionEntry<'services'> | CollectionEntry<'data-products'>;
  pointerVersion?: string;
}

export interface ProducerConsumerIndex {
  producers: Map<string, IndexEntry[]>;
  consumers: Map<string, IndexEntry[]>;
}

/**
 * Builds a reverse index from message ID → services/data-products that send/receive it.
 * Call once before the enrichment loop, then use lookupProducersAndConsumers per message.
 */
export const buildProducerConsumerIndex = (
  services: CollectionEntry<'services'>[],
  dataProducts: CollectionEntry<'data-products'>[]
): ProducerConsumerIndex => {
  const producers = new Map<string, IndexEntry[]>();
  const consumers = new Map<string, IndexEntry[]>();

  const addEntry = (map: Map<string, IndexEntry[]>, messageId: string, entry: IndexEntry) => {
    let list = map.get(messageId);
    if (!list) {
      list = [];
      map.set(messageId, list);
    }
    list.push(entry);
  };

  for (const service of services || []) {
    if (service.data.sends) {
      for (const p of service.data.sends) {
        addEntry(producers, p.id, { resource: service, pointerVersion: p.version });
      }
    }
    if (service.data.receives) {
      for (const p of service.data.receives) {
        addEntry(consumers, p.id, { resource: service, pointerVersion: p.version });
      }
    }
  }

  for (const dp of dataProducts || []) {
    if (dp.data.outputs) {
      for (const p of dp.data.outputs) {
        addEntry(producers, p.id, { resource: dp, pointerVersion: p.version });
      }
    }
    if (dp.data.inputs) {
      for (const p of dp.data.inputs) {
        addEntry(consumers, p.id, { resource: dp, pointerVersion: p.version });
      }
    }
  }

  return { producers, consumers };
};

interface LookupProps {
  message: {
    data: {
      id: string;
      version: string;
      latestVersion?: string;
    };
  };
  index: ProducerConsumerIndex;
  hydrate?: boolean;
}

/**
 * Looks up producers and consumers for a message using the pre-built reverse index.
 * Only runs version matching on the candidate set instead of all services.
 */
export const lookupProducersAndConsumers = ({ message, index, hydrate = true }: LookupProps) => {
  const { id: messageId, version: messageVersion, latestVersion = messageVersion } = message.data;

  const matchesVersion = (pointerVersion: string | undefined) => {
    if (pointerVersion === 'latest' || pointerVersion === undefined) {
      return messageVersion === latestVersion;
    }
    return satisfies(messageVersion, pointerVersion);
  };

  const toResult = <T extends CollectionEntry<'services'> | CollectionEntry<'data-products'>>(resource: T) => {
    if (!hydrate) return { id: resource.data.id, version: resource.data.version };
    return resource;
  };

  const candidateProducers = index.producers.get(messageId) || [];
  const candidateConsumers = index.consumers.get(messageId) || [];

  const producers = candidateProducers.filter((e) => matchesVersion(e.pointerVersion)).map((e) => toResult(e.resource));

  const consumers = candidateConsumers.filter((e) => matchesVersion(e.pointerVersion)).map((e) => toResult(e.resource));

  return { producers, consumers };
};

type Messages = {
  commands: CollectionEntry<'commands'>[];
  events: CollectionEntry<'events'>[];
  queries: CollectionEntry<'queries'>[];
};

export const pluralizeMessageType = (message: CollectionEntry<'events' | 'commands' | 'queries'>) => {
  const typeMap: Record<string, string> = {
    events: 'event',
    commands: 'command',
    queries: 'query',
  };
  return typeMap[message.collection] || 'message';
};

// Main function that uses the imported functions
export const getMessages = async ({ getAllVersions = true, hydrateServices = true }: Props = {}): Promise<Messages> => {
  const [commands, events, queries] = await Promise.all([
    getCommands({ getAllVersions, hydrateServices }),
    getEvents({ getAllVersions, hydrateServices }),
    getQueries({ getAllVersions, hydrateServices }),
  ]);

  return {
    commands,
    events,
    queries,
  };
};

export const isCollectionAMessage = (collection: string): boolean => {
  return ['events', 'commands', 'queries'].includes(collection);
};
