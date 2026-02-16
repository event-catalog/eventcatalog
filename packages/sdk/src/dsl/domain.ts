import type { Domain, Service, Event, Command, Query, Channel, Team, User } from '../types';
import { serializeBaseFields, serializeMessagePointers, resolveMessageType, buildMessageTypeIndex } from './utils';
import type { MessageTypeIndex } from './utils';
import { serviceToDSL } from './service';
import { messageToDSL } from './message';
import { channelToDSL } from './channel';
import { teamToDSL, userToDSL } from './owner';

interface DomainToDSLOptions {
  catalogDir: string;
  hydrate?: boolean;
  _seen?: Set<string>;
  _msgIndex?: MessageTypeIndex;
}

export interface DomainResolvers {
  getService?: (id: string, version?: string) => Promise<Service | undefined>;
  getDomain?: (id: string, version?: string) => Promise<Domain | undefined>;
  getMessage?: (id: string, version?: string) => Promise<Event | Command | Query | undefined>;
  getChannel?: (id: string, version?: string) => Promise<Channel | undefined>;
  getTeam?: (id: string) => Promise<Team | undefined>;
  getUser?: (id: string) => Promise<User | undefined>;
}

async function hydrateOwners(owners: string[] | undefined, resolvers: DomainResolvers, seen: Set<string>, parts: string[]) {
  if (!owners || !resolvers.getTeam || !resolvers.getUser) return;
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

async function hydrateChannelsFromMessages(
  messages: {
    id: string;
    version?: string;
    to?: { id: string; version?: string }[];
    from?: { id: string; version?: string }[];
  }[],
  resolvers: DomainResolvers,
  seen: Set<string>,
  parts: string[]
) {
  if (!resolvers.getChannel) return;
  for (const msg of messages) {
    const channels = (msg as any).to || (msg as any).from;
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

async function buildDomainBody(
  resource: Domain,
  options: DomainToDSLOptions,
  resolvers: DomainResolvers | undefined,
  keyword: 'domain' | 'subdomain'
): Promise<{ topLevelParts: string[]; block: string }> {
  const { catalogDir, hydrate = false, _seen = new Set<string>() } = options;
  const msgIndex = options._msgIndex || buildMessageTypeIndex(catalogDir);
  const topLevelParts: string[] = [];

  if (hydrate && resolvers) {
    // Hydrate services (and their owners, channels, messages)
    if (resource.services && resource.services.length > 0 && resolvers.getService) {
      for (const svcRef of resource.services) {
        const svcKey = `service:${svcRef.id}@${svcRef.version || 'latest'}`;
        if (_seen.has(svcKey)) continue;
        _seen.add(svcKey);

        const svc = await resolvers.getService(svcRef.id, svcRef.version);
        if (svc) {
          // Hydrate service owners
          await hydrateOwners(svc.owners, resolvers, _seen, topLevelParts);
          // Hydrate service channels
          const svcMessages = [...(svc.sends || []), ...(svc.receives || [])];
          await hydrateChannelsFromMessages(svcMessages, resolvers, _seen, topLevelParts);
          // Hydrate service (includes message hydration)
          const svcDsl = await serviceToDSL(svc, { catalogDir, hydrate: true, _seen, _msgIndex: msgIndex }, resolvers.getMessage);
          topLevelParts.push(svcDsl);
        }
      }
    }

    // Hydrate domain-level channels
    const domainMessages = [...(resource.sends || []), ...(resource.receives || [])];
    await hydrateChannelsFromMessages(domainMessages, resolvers, _seen, topLevelParts);

    // Hydrate domain-level messages
    if (resolvers.getMessage) {
      for (const msg of domainMessages) {
        const key = `${msg.id}@${msg.version || 'latest'}`;
        if (_seen.has(key)) continue;
        _seen.add(key);

        const msgType = resolveMessageType(msgIndex, msg.id);
        if (!msgType) continue;

        const msgResource = await resolvers.getMessage(msg.id, msg.version);
        if (msgResource) {
          topLevelParts.push(messageToDSL(msgResource, msgType));
        }
      }
    }
  }

  const lines: string[] = [];
  const baseFields = serializeBaseFields(resource);
  if (baseFields) lines.push(baseFields);

  // Service references
  if (resource.services && resource.services.length > 0) {
    for (const svc of resource.services) {
      let ref = svc.id;
      if (svc.version) ref += `@${svc.version}`;
      lines.push(`  service ${ref}`);
    }
  }

  if (resource.sends && resource.sends.length > 0) {
    const sendsStr = serializeMessagePointers(resource.sends, 'sends', msgIndex);
    if (sendsStr) lines.push(sendsStr);
  }

  if (resource.receives && resource.receives.length > 0) {
    const recvStr = serializeMessagePointers(resource.receives, 'receives', msgIndex);
    if (recvStr) lines.push(recvStr);
  }

  // Subdomain blocks (inline)
  if (resource.domains && resource.domains.length > 0) {
    if (hydrate && resolvers?.getDomain) {
      for (const subRef of resource.domains) {
        const subKey = `domain:${subRef.id}@${subRef.version || 'latest'}`;
        if (_seen.has(subKey)) continue;
        _seen.add(subKey);

        const subDomain = await resolvers.getDomain(subRef.id, subRef.version);
        if (subDomain) {
          // Hydrate subdomain owners at top level
          await hydrateOwners(subDomain.owners, resolvers, _seen, topLevelParts);
          // Recursively build subdomain
          const sub = await buildDomainBody(
            subDomain,
            { catalogDir, hydrate, _seen, _msgIndex: msgIndex },
            resolvers,
            'subdomain'
          );
          topLevelParts.push(...sub.topLevelParts);
          // Indent the subdomain block to nest inside the parent
          const indented = sub.block
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n');
          lines.push(indented);
        }
      }
    } else {
      // Non-hydrated: just output references
      for (const sub of resource.domains) {
        let ref = sub.id;
        if (sub.version) ref += `@${sub.version}`;
        lines.push(`  subdomain ${ref}`);
      }
    }
  }

  const body = lines.join('\n');
  const block = `${keyword} ${resource.id} {\n${body}\n}`;

  return { topLevelParts, block };
}

export async function domainToDSL(resource: Domain, options: DomainToDSLOptions, resolvers?: DomainResolvers): Promise<string> {
  const { catalogDir, hydrate = false, _seen = new Set<string>() } = options;
  const msgIndex = options._msgIndex || buildMessageTypeIndex(catalogDir);

  const result = await buildDomainBody(resource, { catalogDir, hydrate, _seen, _msgIndex: msgIndex }, resolvers, 'domain');
  const parts = [...result.topLevelParts, result.block];

  return parts.join('\n\n');
}
