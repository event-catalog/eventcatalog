import type { SystemResourceCollection } from '@components/Tables/SystemResources/SystemResourcesTable';

export type ResourceOwnerCollection = 'systems' | 'domains';

export interface ResourceGroup {
  collection: SystemResourceCollection;
  items: any[];
}

const getDomainMessages = (data: any) => {
  const seen = new Map<string, any>();

  for (const message of [...(data.sends || []), ...(data.receives || [])]) {
    if (!message?.data?.id || !message?.collection) continue;
    seen.set(`${message.collection}:${message.data.id}:${message.data.version}`, message);
  }

  return Array.from(seen.values());
};

export const getResourceGroups = (data: any, ownerCollection: ResourceOwnerCollection): ResourceGroup[] => {
  const domainMessages = ownerCollection === 'domains' ? getDomainMessages(data) : [];
  const domainOnlyGroups: ResourceGroup[] =
    ownerCollection === 'domains'
      ? [
          { collection: 'domains', items: data.domains || [] },
          { collection: 'systems', items: data.systems || [] },
          { collection: 'agents', items: data.agents || [] },
          { collection: 'data-products', items: data['data-products'] || [] },
        ]
      : [];

  return [
    ...domainOnlyGroups,
    { collection: 'services', items: data.services || [] },
    { collection: 'flows', items: data.flows || [] },
    { collection: 'entities', items: data.entities || [] },
    { collection: 'containers', items: data.containers || [] },
    { collection: 'events', items: domainMessages.filter((message) => message.collection === 'events') },
    { collection: 'commands', items: domainMessages.filter((message) => message.collection === 'commands') },
    { collection: 'queries', items: domainMessages.filter((message) => message.collection === 'queries') },
  ];
};

export const hasResources = (owner: any, ownerCollection: ResourceOwnerCollection): boolean =>
  getResourceGroups(owner?.data ?? {}, ownerCollection).some(({ items }) => items.length > 0);
