import type { Service, Event, Command, Query } from '../types';
import { serializeBaseFields, serializeMessagePointers, resolveMessageType } from './utils';
import { messageToDSL } from './message';

interface ServiceToDSLOptions {
  catalogDir: string;
  hydrate?: boolean;
  _seen?: Set<string>;
}

export async function serviceToDSL(
  resource: Service,
  options: ServiceToDSLOptions,
  getMessageFn?: (id: string, version?: string) => Promise<Event | Command | Query | undefined>
): Promise<string> {
  const { catalogDir, hydrate = false, _seen = new Set<string>() } = options;
  const parts: string[] = [];

  if (hydrate && getMessageFn) {
    const allMessages = [...(resource.sends || []), ...(resource.receives || [])];
    for (const msg of allMessages) {
      const key = `${msg.id}@${msg.version || 'latest'}`;
      if (_seen.has(key)) continue;
      _seen.add(key);

      const msgType = resolveMessageType(catalogDir, msg.id);
      if (!msgType) continue;

      const msgResource = await getMessageFn(msg.id, msg.version);
      if (msgResource) {
        parts.push(messageToDSL(msgResource, msgType));
      }
    }
  }

  const lines: string[] = [];
  const baseFields = serializeBaseFields(resource);
  if (baseFields) lines.push(baseFields);

  if (resource.sends && resource.sends.length > 0) {
    const sendsStr = serializeMessagePointers(resource.sends, 'sends', catalogDir);
    if (sendsStr) lines.push(sendsStr);
  }

  if (resource.receives && resource.receives.length > 0) {
    const recvStr = serializeMessagePointers(resource.receives, 'receives', catalogDir);
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
