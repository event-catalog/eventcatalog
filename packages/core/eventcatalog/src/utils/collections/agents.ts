import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';
import { createVersionedMap, findInMap, versionMatches } from '@utils/collections/util';
import { getChannels } from './channels';

export type Agent = CollectionEntry<'agents'>;

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

interface Props {
  getAllVersions?: boolean;
  returnBody?: boolean;
}

let memoryCache: Record<string, Agent[]> = {};

export const getAgents = async ({ getAllVersions = true, returnBody = false }: Props = {}): Promise<Agent[]> => {
  const cacheKey = `${getAllVersions ? 'allVersions' : 'currentVersions'}-${returnBody ? 'withBody' : 'noBody'}`;

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    return memoryCache[cacheKey];
  }

  const [allAgents, allEvents, allCommands, allQueries, allContainers, allFlows] = await Promise.all([
    getCollection('agents'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('containers'),
    getCollection('flows'),
  ]);

  const allMessages = [...allEvents, ...allCommands, ...allQueries];
  const agentMap = createVersionedMap(allAgents);
  const messageMap = createVersionedMap(allMessages);
  const containerMap = createVersionedMap(allContainers);
  const flowMap = createVersionedMap(allFlows);

  const targetAgents = allAgents.filter((agent) => {
    if (agent.data.hidden === true) return false;
    if (!getAllVersions && agent.filePath?.includes('versioned')) return false;
    return true;
  });

  const processedAgents = await Promise.all(
    targetAgents.map(async (agent) => {
      const agentVersions = agentMap.get(agent.data.id) || [];
      const latestVersion = agentVersions[0]?.data.version || agent.data.version;
      const versions = agentVersions.map((a) => a.data.version);

      const sends = (agent.data.sends || [])
        .map((m) => findInMap(messageMap, m.id, m.version))
        .filter((e): e is CollectionEntry<CollectionMessageTypes> => !!e);

      const receives = (agent.data.receives || [])
        .map((m) => findInMap(messageMap, m.id, m.version))
        .filter((e): e is CollectionEntry<CollectionMessageTypes> => !!e);

      const mappedWritesTo = (agent.data.writesTo || [])
        .map((c) => findInMap(containerMap, c.id, c.version))
        .filter((e): e is CollectionEntry<'containers'> => !!e);

      const mappedReadsFrom = (agent.data.readsFrom || [])
        .map((c) => findInMap(containerMap, c.id, c.version))
        .filter((e): e is CollectionEntry<'containers'> => !!e);

      const mappedFlows = (agent.data.flows || [])
        .map((f) => findInMap(flowMap, f.id, f.version))
        .filter((f): f is CollectionEntry<'flows'> => !!f);

      return {
        ...agent,
        data: {
          ...agent.data,
          writesTo: mappedWritesTo as any,
          readsFrom: mappedReadsFrom as any,
          flows: mappedFlows as any,
          receives: receives as any,
          sends: sends as any,
          versions,
          latestVersion,
        },
        nodes: {
          receives: receives as any,
          sends: sends as any,
        },
        body: returnBody ? agent.body : undefined,
      };
    })
  );

  processedAgents.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedAgents;

  return processedAgents;
};

export const getProducersOfMessage = (agents: Agent[], message: CollectionEntry<'events' | 'commands' | 'queries'>) => {
  return agents.filter((agent) => {
    return agent.data.sends?.some((send) => {
      const idMatch = send.id === message.data.id;
      if (!send.version) return idMatch;
      if (send.version === 'latest') return idMatch;
      return idMatch && versionMatches(message.data.version, send.version);
    });
  });
};

export const getConsumersOfMessage = (agents: Agent[], message: CollectionEntry<'events' | 'commands' | 'queries'>) => {
  return agents.filter((agent) => {
    return agent.data.receives?.some((receive) => {
      const idMatch = receive.id === message.data.id;
      if (!receive.version) return idMatch;
      if (receive.version === 'latest') return idMatch;
      return idMatch && versionMatches(message.data.version, receive.version);
    });
  });
};

export const getChannelsForAgent = async (agentId: string, version?: string): Promise<CollectionEntry<'channels'>[]> => {
  const allAgents = await getCollection('agents');
  const allChannels = await getChannels({ getAllVersions: true });

  const agentMap = createVersionedMap(allAgents);
  const agent = findInMap(agentMap, agentId, version);
  if (!agent) return [];

  const sends = agent.data.sends ?? [];
  const receives = agent.data.receives ?? [];

  const channelPointers: Array<{ id: string; version?: string }> = [];

  for (const send of sends) {
    for (const channel of send.to ?? []) {
      channelPointers.push({ id: channel.id, version: channel.version });
    }
  }

  for (const receive of receives) {
    for (const channel of receive.from ?? []) {
      channelPointers.push({ id: channel.id, version: channel.version });
    }
  }

  const channelMap = createVersionedMap(allChannels);
  const seen = new Set<string>();
  const channels: CollectionEntry<'channels'>[] = [];

  for (const pointer of channelPointers) {
    const key = `${pointer.id}-${pointer.version ?? 'latest'}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const match = findInMap(channelMap, pointer.id, pointer.version);
    if (match) channels.push(match as CollectionEntry<'channels'>);
  }

  return channels;
};
