import { randomUUID } from 'node:crypto';
import type { CatalogSnapshot } from '@eventcatalog/sdk';
import type { GovernanceResult } from './types';
import { resolveEnvVars, isProducerTrigger, getChangeVerb } from './rules';

export type MessageTypeMap = Map<string, string>;
export type ServiceOwnersMap = Map<string, string[]>;

export type GovernanceActionOptions = {
  messageTypes?: MessageTypeMap;
  status?: string;
  serviceOwners?: ServiceOwnersMap;
};

export const buildMessageTypeMap = (snapshot: CatalogSnapshot): MessageTypeMap => {
  const map: MessageTypeMap = new Map();
  for (const event of snapshot.resources.messages.events) {
    map.set(event.id as string, 'event');
  }
  for (const command of snapshot.resources.messages.commands) {
    map.set(command.id as string, 'command');
  }
  for (const query of snapshot.resources.messages.queries) {
    map.set(query.id as string, 'query');
  }
  return map;
};

export const buildServiceOwnersMap = (snapshot: CatalogSnapshot): ServiceOwnersMap => {
  const map: ServiceOwnersMap = new Map();
  for (const service of snapshot.resources.services) {
    if (service.owners && Array.isArray(service.owners) && service.owners.length > 0) {
      map.set(service.id as string, service.owners as string[]);
    }
  }
  return map;
};

export const executeGovernanceActions = async (
  results: GovernanceResult[],
  opts: GovernanceActionOptions = {}
): Promise<string[]> => {
  const { messageTypes, status, serviceOwners } = opts;
  const webhookCalls: Array<{ urlTemplate: string; request: Promise<Response> }> = [];
  const now = new Date().toISOString();

  for (const result of results) {
    for (const action of result.rule.actions) {
      if (action.type !== 'webhook') continue;

      const url = resolveEnvVars(action.url);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (action.headers) {
        for (const [key, value] of Object.entries(action.headers)) {
          headers[key] = resolveEnvVars(value);
        }
      }

      for (const change of result.matchedChanges) {
        const verb = getChangeVerb(result.trigger, change.changeType);
        const messageType = messageTypes?.get(change.resourceId) || 'message';
        const serviceRole = isProducerTrigger(result.trigger) ? 'producer' : 'consumer';

        const payload = {
          specversion: '1.0',
          type: `eventcatalog.governance.${result.trigger}`,
          source: 'eventcatalog/governance',
          id: randomUUID(),
          time: now,
          datacontenttype: 'application/json',
          data: {
            schemaVersion: 1,
            ...(status && { status }),
            summary: `${change.serviceId} is ${verb} the ${messageType} ${change.resourceId}`,
            [serviceRole]: {
              id: change.serviceId,
              version: change.serviceVersion,
              ...(serviceOwners?.get(change.serviceId) && { owners: serviceOwners.get(change.serviceId) }),
            },
            message: {
              id: change.resourceId,
              version: change.resourceVersion,
              type: messageType,
            },
          },
        };

        webhookCalls.push({
          urlTemplate: action.url,
          request: fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) }),
        });
      }
    }
  }

  const settled = await Promise.allSettled(webhookCalls.map((c) => c.request));

  return settled.map((result, i) => {
    const url = webhookCalls[i].urlTemplate;
    if (result.status === 'fulfilled') {
      const res = result.value;
      if (!res.ok) {
        return `  Webhook failed: ${url} ✗ (HTTP ${res.status})`;
      }
      return `  Webhook sent: ${url} ✓`;
    }
    return `  Webhook failed: ${url} ✗ (${result.reason instanceof Error ? result.reason.message : String(result.reason)})`;
  });
};
