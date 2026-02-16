import type { Event, Command, Query, Service, Domain, Team, User, Channel } from '../types';
import { messageToDSL } from './message';
import { serviceToDSL } from './service';
import { domainToDSL } from './domain';
import { teamToDSL, userToDSL } from './owner';
import { channelToDSL } from './channel';
import { resolveMessageType } from './utils';
import type { MessageType } from './utils';

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
  getDomain: (id: string, version?: string) => Promise<Domain | undefined>;
  getChannel: (id: string, version?: string) => Promise<Channel | undefined>;
  getTeam: (id: string) => Promise<Team | undefined>;
  getUser: (id: string) => Promise<User | undefined>;
}

function getMessage(resolvers: ResourceResolvers, catalogDir: string) {
  return async (id: string, version?: string) => {
    const msgType = resolveMessageType(catalogDir, id);
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

async function hydrateChannels(resource: Service | Domain, resolvers: ResourceResolvers, seen: Set<string>, parts: string[]) {
  const allMessages = [...((resource as Service).sends || []), ...((resource as Service).receives || [])];
  for (const msg of allMessages) {
    const channels = 'to' in msg ? (msg as any).to : 'from' in msg ? (msg as any).from : undefined;
    if (!channels) continue;
    for (const ch of channels) {
      const key = `channel:${ch.id}@${ch.version || 'latest'}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const channel = await resolvers.getChannel(ch.id, ch.version);
      if (channel) {
        parts.push(channelToDSL(channel));
      }
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

export const toDSL =
  (catalogDir: string, resolvers: ResourceResolvers) =>
  async (resource: AnyResource | AnyResource[], options: ToDSLOptions): Promise<string> => {
    const resources = Array.isArray(resource) ? resource : [resource];
    const seen = new Set<string>();
    const parts: string[] = [];

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
              { catalogDir, hydrate: options.hydrate, _seen: seen },
              getMessage(resolvers, catalogDir)
            )
          );
          break;
        case 'domain':
          if (options.hydrate) {
            await hydrateOwners(res.owners, resolvers, seen, parts);
          }
          parts.push(
            await domainToDSL(
              res as Domain,
              { catalogDir, hydrate: options.hydrate, _seen: seen },
              {
                getService: resolvers.getService,
                getDomain: resolvers.getDomain,
                getMessage: getMessage(resolvers, catalogDir),
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
