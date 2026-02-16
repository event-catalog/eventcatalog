import { globSync } from 'glob';

interface BaseResource {
  id: string;
  name: string;
  version: string;
  summary?: string;
  owners?: string[];
  badges?: { content: string; backgroundColor: string; textColor: string }[];
  deprecated?: boolean | { date?: string; message?: string };
  draft?: boolean | { title?: string; message?: string };
}

export type MessageTypeIndex = Map<string, MessageType>;

interface ChannelPointer {
  id: string;
  version?: string;
  parameters?: Record<string, string>;
}

interface SendsPointer {
  id: string;
  version?: string;
  to?: ChannelPointer[];
}

interface ReceivesPointer {
  id: string;
  version?: string;
  from?: ChannelPointer[];
}

export type MessageType = 'event' | 'command' | 'query';

export function serializeBaseFields(resource: BaseResource, indent: string = '  '): string {
  const lines: string[] = [];

  if (resource.version) {
    lines.push(`${indent}version ${resource.version}`);
  }

  if (resource.name) {
    lines.push(`${indent}name "${resource.name}"`);
  }

  if (resource.summary) {
    lines.push(`${indent}summary "${resource.summary.trim()}"`);
  }

  if (resource.owners && resource.owners.length > 0) {
    for (const owner of resource.owners) {
      lines.push(`${indent}owner ${owner}`);
    }
  }

  if (resource.deprecated === true) {
    lines.push(`${indent}deprecated true`);
  }

  if (resource.draft === true) {
    lines.push(`${indent}draft true`);
  }

  return lines.join('\n');
}

export function buildMessageTypeIndex(catalogDir: string): MessageTypeIndex {
  const index: MessageTypeIndex = new Map();
  const types = ['events', 'commands', 'queries'] as const;
  const typeMap = { events: 'event', commands: 'command', queries: 'query' } as const;

  for (const type of types) {
    const matches = globSync(`**/${type}/*/index.{md,mdx}`, { cwd: catalogDir });
    for (const match of matches) {
      const parts = match.replace(/\\/g, '/').split('/');
      const typeIdx = parts.lastIndexOf(type);
      if (typeIdx !== -1 && typeIdx + 1 < parts.length) {
        const id = parts[typeIdx + 1];
        if (!index.has(id)) index.set(id, typeMap[type]);
      }
    }
  }

  return index;
}

export function resolveMessageType(catalogDirOrIndex: string | MessageTypeIndex, id: string): MessageType | undefined {
  if (typeof catalogDirOrIndex !== 'string') {
    return catalogDirOrIndex.get(id);
  }
  // Fallback for backwards compatibility
  if (globSync(`**/events/${id}/index.{md,mdx}`, { cwd: catalogDirOrIndex }).length > 0) return 'event';
  if (globSync(`**/commands/${id}/index.{md,mdx}`, { cwd: catalogDirOrIndex }).length > 0) return 'command';
  if (globSync(`**/queries/${id}/index.{md,mdx}`, { cwd: catalogDirOrIndex }).length > 0) return 'query';
  return undefined;
}

function serializeChannelRef(channel: ChannelPointer): string {
  let ref = channel.id;
  if (channel.version) ref += `@${channel.version}`;
  return ref;
}

export function serializeMessagePointers(
  items: (SendsPointer | ReceivesPointer)[],
  direction: 'sends' | 'receives',
  catalogDirOrIndex: string | MessageTypeIndex,
  indent: string = '  '
): string {
  const lines: string[] = [];

  for (const item of items) {
    const msgType = resolveMessageType(catalogDirOrIndex, item.id);
    if (!msgType) continue;

    let ref = `${item.id}`;
    if (item.version) ref += `@${item.version}`;

    const channels = direction === 'sends' ? (item as SendsPointer).to : (item as ReceivesPointer).from;

    const channelKeyword = direction === 'sends' ? 'to' : 'from';

    if (channels && channels.length === 1) {
      lines.push(`${indent}${direction} ${msgType} ${ref} ${channelKeyword} ${serializeChannelRef(channels[0])}`);
    } else if (channels && channels.length > 1) {
      const channelRefs = channels.map(serializeChannelRef).join(', ');
      lines.push(`${indent}${direction} ${msgType} ${ref} ${channelKeyword} ${channelRefs}`);
    } else {
      lines.push(`${indent}${direction} ${msgType} ${ref}`);
    }
  }

  return lines.join('\n');
}
