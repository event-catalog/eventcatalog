import type { Event, Command, Query, Service, Domain, Team, User, Channel } from '../types';
import { messageToDSL } from './message';
import { serviceToDSL } from './service';
import { domainToDSL } from './domain';
import { teamToDSL, userToDSL } from './owner';
import { channelToDSL } from './channel';
import { buildMessageTypeIndex, resolveMessageType, msgVersionMatches } from './utils';
import type { MessageType, MessageTypeIndex } from './utils';

type ResourceType = 'event' | 'command' | 'query' | 'service' | 'domain';

export interface ToDSLOptions {
  type: ResourceType;
  hydrate?: boolean;
}

type AnyResource = Event | Command | Query | Service | Domain;

export interface ResourceResolvers {
  getEvent: (id: string, version?: string) => Promise<Event | undefined>;
  getCommand: (id: string, version?: string) => Promise<Command | undefined>;
  getQuery: (id: string, version?: string) => Promise<Query | undefined>;
  getService: (id: string, version?: string) => Promise<Service | undefined>;
  getServices: (options?: { latestOnly?: boolean }) => Promise<Service[]>;
  getDomain: (id: string, version?: string) => Promise<Domain | undefined>;
  getChannel: (id: string, version?: string) => Promise<Channel | undefined>;
  getChannels: (options?: { latestOnly?: boolean }) => Promise<Channel[]>;
  getTeam: (id: string) => Promise<Team | undefined>;
  getUser: (id: string) => Promise<User | undefined>;
}

function getMessage(resolvers: ResourceResolvers, msgIndex: MessageTypeIndex) {
  return async (id: string, version?: string) => {
    const msgType = resolveMessageType(msgIndex, id);
    if (!msgType) return undefined;
    switch (msgType) {
      case 'event':
        return resolvers.getEvent(id, version);
      case 'command':
        return resolvers.getCommand(id, version);
      case 'query':
        return resolvers.getQuery(id, version);
    }
  };
}

async function hydrateChannel(
  channelId: string,
  channelVersion: string | undefined,
  resolvers: ResourceResolvers,
  seen: Set<string>,
  parts: string[]
) {
  const key = `channel:${channelId}@${channelVersion || 'latest'}`;
  if (seen.has(key)) return;
  seen.add(key);

  const channel = await resolvers.getChannel(channelId, channelVersion);
  if (!channel) return;

  // Hydrate any channels this channel routes to (downstream)
  if (channel.routes && channel.routes.length > 0) {
    for (const route of channel.routes) {
      await hydrateChannel(route.id, route.version, resolvers, seen, parts);
    }
  }

  // Hydrate any channels that route TO this channel (upstream)
  const allChannels = (await resolvers.getChannels({ latestOnly: false })) || [];
  const targetVersion = channelVersion || channel.version;
  for (const upstream of allChannels) {
    if (!upstream.routes) continue;
    const routesToThis = upstream.routes.some((route) => {
      if (route.id !== channelId) return false;
      if (!route.version) {
        // Unversioned routes point to latest, so only match when hydrating latest.
        return !channelVersion;
      }
      return msgVersionMatches(route.version, targetVersion);
    });
    if (routesToThis) {
      await hydrateChannel(upstream.id, upstream.version, resolvers, seen, parts);
    }
  }

  parts.push(channelToDSL(channel));
}

async function hydrateChannels(resource: Service | Domain, resolvers: ResourceResolvers, seen: Set<string>, parts: string[]) {
  const allMessages = [...((resource as Service).sends || []), ...((resource as Service).receives || [])];
  for (const msg of allMessages) {
    const channels = 'to' in msg ? (msg as any).to : 'from' in msg ? (msg as any).from : undefined;
    if (!channels) continue;
    for (const ch of channels) {
      await hydrateChannel(ch.id, ch.version, resolvers, seen, parts);
    }
  }
}

async function hydrateOwners(owners: string[] | undefined, resolvers: ResourceResolvers, seen: Set<string>, parts: string[]) {
  if (!owners) return;
  for (const ownerId of owners) {
    const key = `owner:${ownerId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const team = await resolvers.getTeam(ownerId);
    if (team) {
      parts.push(teamToDSL(team));
      continue;
    }

    const user = await resolvers.getUser(ownerId);
    if (user) {
      parts.push(userToDSL(user));
    }
  }
}

async function hydrateMessageServices(
  messageId: string,
  messageVersion: string | undefined,
  resolvers: ResourceResolvers,
  seen: Set<string>,
  parts: string[],
  catalogDir: string,
  msgIndex: MessageTypeIndex
) {
  const services = (await resolvers.getServices({ latestOnly: false })) || [];
  for (const service of services) {
    const key = `service:${service.id}@${service.version || 'latest'}`;
    if (seen.has(key)) continue;

    const referencesMessage = [...(service.sends || []), ...(service.receives || [])].some(
      (msg) => msg.id === messageId && msgVersionMatches(msg.version, messageVersion)
    );

    if (referencesMessage) {
      seen.add(key);
      const matchMsg = (msg: { id: string; version?: string }) =>
        msg.id === messageId && msgVersionMatches(msg.version, messageVersion);
      const resolvePointerVersion = <T extends { id: string; version?: string }>(msg: T): T => {
        if (msg.id === messageId && msg.version && msg.version !== messageVersion && messageVersion) {
          return { ...msg, version: messageVersion };
        }
        return msg;
      };
      const filtered: Service = {
        ...service,
        sends: service.sends?.filter(matchMsg).map(resolvePointerVersion),
        receives: service.receives?.filter(matchMsg).map(resolvePointerVersion),
      };
      await hydrateChannels(filtered, resolvers, seen, parts);
      parts.push(await serviceToDSL(filtered, { catalogDir, hydrate: false, _seen: new Set(seen), _msgIndex: msgIndex }));
    }
  }
}

async function hydrateRelatedServices(
  messages: { id: string; version?: string }[],
  direction: 'sends' | 'receives',
  resolvers: ResourceResolvers,
  seen: Set<string>,
  parts: string[],
  catalogDir: string,
  msgIndex: MessageTypeIndex
) {
  if (!messages.length) return;

  const referencesHydratedMessage = (msg: { id: string; version?: string }) =>
    messages.some((input) => msg.id === input.id && msgVersionMatches(msg.version, input.version));

  const services = (await resolvers.getServices({ latestOnly: false })) || [];
  for (const service of services) {
    const key = `service:${service.id}@${service.version || 'latest'}`;
    if (seen.has(key)) continue;

    if (direction === 'sends') {
      const matchedPointers = (service.sends || []).filter(referencesHydratedMessage);
      if (matchedPointers.length > 0) {
        seen.add(key);
        const filtered: Service = {
          ...service,
          sends: matchedPointers,
          receives: undefined,
        };
        await hydrateChannels(filtered, resolvers, seen, parts);
        parts.push(await serviceToDSL(filtered, { catalogDir, hydrate: false, _seen: new Set(seen), _msgIndex: msgIndex }));
      }
    } else {
      const matchedPointers = (service.receives || []).filter(referencesHydratedMessage);
      if (matchedPointers.length > 0) {
        seen.add(key);
        const filtered: Service = {
          ...service,
          sends: undefined,
          receives: matchedPointers,
        };
        await hydrateChannels(filtered, resolvers, seen, parts);
        parts.push(await serviceToDSL(filtered, { catalogDir, hydrate: false, _seen: new Set(seen), _msgIndex: msgIndex }));
      }
    }
  }
}

export const toDSL =
  (catalogDir: string, resolvers: ResourceResolvers) =>
  async (resource: AnyResource | AnyResource[], options: ToDSLOptions): Promise<string> => {
    const resources = Array.isArray(resource) ? resource : [resource];
    const seen = new Set<string>();
    const parts: string[] = [];
    const msgIndex = buildMessageTypeIndex(catalogDir);

    for (const res of resources) {
      const key = `${options.type}:${res.id}@${res.version || 'latest'}`;
      if (seen.has(key)) continue;
      seen.add(key);

      switch (options.type) {
        case 'event':
        case 'command':
        case 'query':
          if (options.hydrate) {
            await hydrateOwners(res.owners, resolvers, seen, parts);
            await hydrateMessageServices(res.id, res.version, resolvers, seen, parts, catalogDir, msgIndex);
          }
          parts.push(messageToDSL(res as Event | Command | Query, options.type as MessageType));
          break;
        case 'service':
          if (options.hydrate) {
            await hydrateOwners(res.owners, resolvers, seen, parts);
            await hydrateChannels(res as Service, resolvers, seen, parts);
          }
          parts.push(
            await serviceToDSL(
              res as Service,
              { catalogDir, hydrate: options.hydrate, _seen: seen, _msgIndex: msgIndex },
              getMessage(resolvers, msgIndex)
            )
          );
          if (options.hydrate) {
            const svc = res as Service;
            // For messages this service sends: find services that receive them (downstream consumers)
            await hydrateRelatedServices(svc.sends || [], 'receives', resolvers, seen, parts, catalogDir, msgIndex);
            // For messages this service receives: find services that send them (upstream producers)
            await hydrateRelatedServices(svc.receives || [], 'sends', resolvers, seen, parts, catalogDir, msgIndex);
          }
          break;
        case 'domain':
          if (options.hydrate) {
            await hydrateOwners(res.owners, resolvers, seen, parts);
          }
          parts.push(
            await domainToDSL(
              res as Domain,
              { catalogDir, hydrate: options.hydrate, _seen: seen, _msgIndex: msgIndex },
              {
                getService: resolvers.getService,
                getDomain: resolvers.getDomain,
                getMessage: getMessage(resolvers, msgIndex),
                getChannel: resolvers.getChannel,
                getTeam: resolvers.getTeam,
                getUser: resolvers.getUser,
              }
            )
          );
          break;
      }
    }

    return parts.join('\n\n');
  };
