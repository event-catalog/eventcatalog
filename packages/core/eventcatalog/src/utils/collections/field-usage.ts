import { getCollection } from 'astro:content';

type PointerWithFields = { id?: string; fields?: string[] };

type ResourceWithMessagePointers = {
  data: {
    sends?: PointerWithFields[];
    receives?: PointerWithFields[];
  };
};

const addFieldUsageFromPointers = (messageIds: Set<string>, pointers: PointerWithFields[] | undefined) => {
  for (const pointer of pointers || []) {
    if (pointer.id && pointer.fields?.length) {
      messageIds.add(pointer.id);
    }
  }
};

/**
 * Message ids that have field-level lineage declared on a send/receive pointer.
 * Uses raw (unhydrated) resources because hydration replaces those pointers and drops `fields`.
 * Matches the sidebar "Field Usage" link gate.
 */
export const collectMessageIdsWithFieldUsage = (
  agents: ResourceWithMessagePointers[],
  services: ResourceWithMessagePointers[],
  domains: ResourceWithMessagePointers[]
): Set<string> => {
  const messageIds = new Set<string>();

  for (const resource of [...agents, ...services, ...domains]) {
    addFieldUsageFromPointers(messageIds, resource.data.sends);
    addFieldUsageFromPointers(messageIds, resource.data.receives);
  }

  return messageIds;
};

export const getMessageIdsWithFieldUsage = async (): Promise<Set<string>> => {
  const [agents, services, domains] = await Promise.all([
    getCollection('agents'),
    getCollection('services'),
    getCollection('domains'),
  ]);

  return collectMessageIdsWithFieldUsage(agents, services, domains);
};
