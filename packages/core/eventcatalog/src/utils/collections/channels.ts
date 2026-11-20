import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import {
  getItemsFromCollectionByIdAndSemverOrLatest,
  createVersionedMap,
  findInMap,
  getVersionedMap,
  satisfies,
  uniqueResources,
} from './util';
import type { CollectionMessageTypes } from '@types';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Channel = CollectionEntry<'channels'>;

interface Props {
  getAllVersions?: boolean;
}

type ChannelSummary = { id: string; version: string; name: string };

/** What getChannels works out about each channel's dead letters */
type DeadLetterDetails = {
  /** The channels that send their dead letters to this one (their latest versions) */
  deadLetterFor: ChannelSummary[];
  /** Other channels send their dead letters here */
  isDeadLetterChannel: boolean;
  /** The channel its `deadLetterChannel` points to, when it's in the catalog */
  deadLetterChannelResolved?: ChannelSummary;
};
export type ChannelWithDetails = Channel & { data: DeadLetterDetails };

// cache for build time
let memoryCache: Record<string, ChannelWithDetails[]> = {};

export const getChannels = async ({ getAllVersions = true }: Props = {}): Promise<ChannelWithDetails[]> => {
  // console.time('✅ New getChannels');
  const cacheKey = getAllVersions ? 'allVersions' : 'currentVersions';

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    // console.timeEnd('✅ New getChannels');
    return memoryCache[cacheKey];
  }

  // 1. Fetch collections in parallel
  const [allChannels, allEvents, allCommands, allQueries] = await Promise.all([
    getCollection('channels'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
  ]);

  const allMessages = [...allEvents, ...allCommands, ...allQueries];

  // 2. Build optimized maps
  const channelMap = createVersionedMap(allChannels);

  // 3. Build Message Index by Channel ID (Reverse Index)
  // Map<ChannelID, Array<{ message: Message, requiredVersion: string | undefined }>>
  const messagesByChannelId = new Map<
    string,
    Array<{ message: CollectionEntry<CollectionMessageTypes>; requiredVersion?: string }>
  >();

  for (const message of allMessages) {
    if (message.data.channels) {
      for (const channelRef of message.data.channels) {
        if (!messagesByChannelId.has(channelRef.id)) {
          messagesByChannelId.set(channelRef.id, []);
        }
        messagesByChannelId.get(channelRef.id)!.push({
          message,
          requiredVersion: channelRef.version,
        });
      }
    }
  }

  // 4. Which channels are dead letter channels, and for which channels. Only a channel's latest version says where
  // its dead letters go: a pointer an older version had doesn't keep another channel a dead letter channel.
  const deadLetterSources = new Map<string, Channel[]>();
  for (const source of allChannels) {
    if (channelMap.get(source.data.id)?.[0] !== source) continue;
    const deadLetterChannel = getDeadLetterChannel(source, allChannels);
    if (!deadLetterChannel) continue;
    const key = channelKey(deadLetterChannel);
    deadLetterSources.set(key, [...(deadLetterSources.get(key) ?? []), source]);
  }

  // 5. Filter channels
  const targetChannels = allChannels.filter((channel) => {
    if (!getAllVersions && channel.filePath?.includes('versioned')) return false;
    return true;
  });

  // 6. Enrich channels
  const processedChannels = await Promise.all(
    targetChannels.map(async (channel) => {
      // Version info
      const channelVersions = channelMap.get(channel.data.id) || [];
      const latestVersion = channelVersions[0]?.data.version || channel.data.version;
      const versions = channelVersions.map((c) => c.data.version);

      // Find messages for this channel version
      const candidateMessages = messagesByChannelId.get(channel.data.id) || [];

      const messagesForChannel = candidateMessages
        .filter(({ requiredVersion }) => {
          if (requiredVersion === 'latest' || requiredVersion === undefined) {
            return channel.data.version === latestVersion;
          }
          return satisfies(channel.data.version, requiredVersion);
        })
        .map(({ message }) => message);

      const messages = messagesForChannel.map((message) => {
        return {
          id: message.data.id,
          name: message.data.name,
          version: message.data.version,
          collection: message.collection,
        };
      });

      const deadLetterFor = (deadLetterSources.get(channelKey(channel)) ?? []).map(summarise);
      const deadLetterChannel = getDeadLetterChannel(channel, allChannels);

      return {
        ...channel,
        data: {
          ...channel.data,
          versions,
          latestVersion,
          messages,
          deadLetterFor,
          isDeadLetterChannel: deadLetterFor.length > 0,
          ...(deadLetterChannel && { deadLetterChannelResolved: summarise(deadLetterChannel) }),
        },
      };
    })
  );

  // order them by the name of the channel
  processedChannels.sort((a, b) => {
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedChannels;
  // console.timeEnd('✅ New getChannels');

  return processedChannels;
};

const channelKey = (channel: Channel) => `${channel.data.id}:${channel.data.version}`;
const summarise = (channel: Channel): ChannelSummary => ({
  id: channel.data.id,
  version: channel.data.version,
  name: channel.data.name,
});

/**
 * The channel a channel sends the messages it can't deliver to (its `deadLetterChannel`, e.g. an SQS redrive
 * policy or a RabbitMQ dead letter exchange), when it's in the catalog. No version means its latest version.
 */
export const getDeadLetterChannel = (channel: Channel, channels: Channel[]): Channel | undefined => {
  const pointer = channel.data.deadLetterChannel;
  if (!pointer) return undefined;
  const deadLetterChannel = findInMap(getVersionedMap(channels), pointer.id, pointer.version);
  // A channel can't be its own dead letter channel
  return deadLetterChannel && channelKey(deadLetterChannel) !== channelKey(channel) ? deadLetterChannel : undefined;
};

// Could be recursive, we need to keep going until we find a loop or until we reach the target channel
export const isChannelsConnected = (
  sourceChannel: CollectionEntry<'channels'> | undefined,
  targetChannel: CollectionEntry<'channels'> | undefined,
  channels: CollectionEntry<'channels'>[],
  visited: Set<string> = new Set()
) => {
  if (!sourceChannel?.data || !targetChannel?.data) {
    return false;
  }

  // Create a unique key for this channel (id + version to handle multiple versions)
  const channelKey = `${sourceChannel.data.id}:${sourceChannel.data.version}`;

  // Base case: we've reached the target channel
  if (sourceChannel.data.id === targetChannel.data.id) {
    return true;
  }

  // Prevent infinite loops by tracking visited channels
  if (visited.has(channelKey)) {
    return false;
  }

  // Mark this channel as visited
  visited.add(channelKey);

  const routes = sourceChannel.data.routes ?? [];
  for (const route of routes) {
    const routeChannel = getItemsFromCollectionByIdAndSemverOrLatest(
      channels,
      route.id,
      route.version
    )[0] as CollectionEntry<'channels'>;

    if (routeChannel) {
      // Pass the visited set to the recursive call
      if (isChannelsConnected(routeChannel, targetChannel, channels, visited)) {
        return true;
      }
    }
  }
  return false;
};

// Go from the source to the target channel and return the channel chain
export const getChannelChain = (
  sourceChannel: CollectionEntry<'channels'> | undefined,
  targetChannel: CollectionEntry<'channels'> | undefined,
  channels: CollectionEntry<'channels'>[]
): CollectionEntry<'channels'>[] => {
  if (!sourceChannel?.data || !targetChannel?.data) {
    return [];
  }

  // Base case: we've reached the target channel
  if (sourceChannel.data.id === targetChannel.data.id && sourceChannel.data.version === targetChannel.data.version) {
    return [sourceChannel];
  }

  const routes = sourceChannel.data.routes ?? [];

  if (routes.length > 0 && isChannelsConnected(sourceChannel, targetChannel, channels)) {
    // Need to check every route and see if any of them are connected to the target channel
    for (const route of routes) {
      const routeChannel = getItemsFromCollectionByIdAndSemverOrLatest(
        channels,
        route.id,
        route.version
      )[0] as CollectionEntry<'channels'>;
      if (routeChannel) {
        if (isChannelsConnected(routeChannel, targetChannel, channels)) {
          return [sourceChannel, ...getChannelChain(routeChannel, targetChannel, channels)];
        }
      }
    }
  }
  return [];
};

/**
 * What a channel connects: the services and agents that send to it (`sends[].to`) or receive
 * from it (`receives[].from`), and the messages that travel through it, from those pointers or
 * from messages that list the channel (`data.messages` from getChannels). Pass raw entries:
 * hydration resolves sends/receives to messages and drops the channel pointers. Pointers
 * without a version mean the latest channel or message.
 */
export const getChannelConnections = (
  channel: Channel,
  catalog: {
    endpoints: Array<CollectionEntry<'services'> | CollectionEntry<'agents'>>;
    channels: Channel[];
    messages: CollectionEntry<CollectionMessageTypes>[];
  }
) => {
  const channelMap = getVersionedMap(catalog.channels);
  const messageMap = getVersionedMap(catalog.messages);
  const isThisChannel = (pointer: { id: string; version?: string }) => {
    const match = findInMap(channelMap, pointer.id, pointer.version);
    return match?.data.id === channel.data.id && match?.data.version === channel.data.version;
  };

  const producers: Array<CollectionEntry<'services'> | CollectionEntry<'agents'>> = [];
  const consumers: Array<CollectionEntry<'services'> | CollectionEntry<'agents'>> = [];
  const messages: CollectionEntry<CollectionMessageTypes>[] = [];
  const addMessage = (pointer: { id: string; version?: string }) => {
    const message = findInMap(messageMap, pointer.id, pointer.version);
    if (message) messages.push(message);
  };

  for (const endpoint of catalog.endpoints) {
    for (const send of (endpoint.data.sends || []) as any[]) {
      if (!(send.to || []).some(isThisChannel)) continue;
      producers.push(endpoint);
      addMessage(send);
    }
    for (const receive of (endpoint.data.receives || []) as any[]) {
      if (!(receive.from || []).some(isThisChannel)) continue;
      consumers.push(endpoint);
      addMessage(receive);
    }
  }

  for (const message of (channel.data as any).messages || []) addMessage(message);

  return { producers: uniqueResources(producers), consumers: uniqueResources(consumers), messages: uniqueResources(messages) };
};
