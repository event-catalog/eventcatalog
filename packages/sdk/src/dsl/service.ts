import type { Service, Event, Command, Query } from '../types';
import { serializeBaseFields, serializeMessagePointers, resolveMessageType, buildMessageTypeIndex } from './utils';
import type { MessageTypeIndex } from './utils';
import { messageToDSL } from './message';
import { valid as semverValid } from 'semver';

interface ServiceToDSLOptions {
  catalogDir: string;
  hydrate?: boolean;
  _seen?: Set<string>;
  _msgIndex?: MessageTypeIndex;
}

export async function serviceToDSL(
  resource: Service,
  options: ServiceToDSLOptions,
  getMessageFn?: (id: string, version?: string) => Promise<Event | Command | Query | undefined>
): Promise<string> {
  const { catalogDir, hydrate = false, _seen = new Set<string>() } = options;
  const msgIndex = options._msgIndex || buildMessageTypeIndex(catalogDir);
  const parts: string[] = [];
  const resolvedVersions = new Map<string, string>();

  if (hydrate && getMessageFn) {
    const allMessages = [...(resource.sends || []), ...(resource.receives || [])];
    for (const msg of allMessages) {
      const key = `${msg.id}@${msg.version || 'latest'}`;
      if (_seen.has(key)) continue;
      _seen.add(key);

      const msgType = resolveMessageType(msgIndex, msg.id);
      if (!msgType) continue;

      const msgResource = await getMessageFn(msg.id, msg.version);
      if (msgResource) {
        parts.push(messageToDSL(msgResource, msgType));
        // Track resolved version so semver ranges can be replaced with concrete versions
        if (msg.version && !semverValid(msg.version) && msgResource.version) {
          resolvedVersions.set(`${msg.id}@${msg.version}`, msgResource.version);
        }
      }
    }
  }

  // Replace semver range versions with concrete resolved versions
  const resolvePointers = <T extends { id: string; version?: string }>(pointers: T[]): T[] =>
    pointers.map((p) => {
      if (p.version && !semverValid(p.version)) {
        const resolved = resolvedVersions.get(`${p.id}@${p.version}`);
        if (resolved) return { ...p, version: resolved };
      }
      return p;
    });

  const sends = resource.sends ? resolvePointers(resource.sends) : undefined;
  const receives = resource.receives ? resolvePointers(resource.receives) : undefined;

  const lines: string[] = [];
  const baseFields = serializeBaseFields(resource);
  if (baseFields) lines.push(baseFields);

  if (sends && sends.length > 0) {
    const sendsStr = serializeMessagePointers(sends, 'sends', msgIndex);
    if (sendsStr) lines.push(sendsStr);
  }

  if (receives && receives.length > 0) {
    const recvStr = serializeMessagePointers(receives, 'receives', msgIndex);
    if (recvStr) lines.push(recvStr);
  }

  if (resource.writesTo && resource.writesTo.length > 0) {
    for (const container of resource.writesTo) {
      let ref = container.id;
      if (container.version) ref += `@${container.version}`;
      lines.push(`  writes-to container ${ref}`);
    }
  }

  if (resource.readsFrom && resource.readsFrom.length > 0) {
    for (const container of resource.readsFrom) {
      let ref = container.id;
      if (container.version) ref += `@${container.version}`;
      lines.push(`  reads-from container ${ref}`);
    }
  }

  const body = lines.join('\n');
  parts.push(`service ${resource.id} {\n${body}\n}`);

  return parts.join('\n\n');
}
