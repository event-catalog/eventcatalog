import { collectionToResourceMap, resourceKey, uniqueResources } from '@utils/collections/util';

// What the Resources pages show: which resources each owner (domain, system, service, flow,
// channel or message) lists, how each relates to the owner, and the links for each row.
// Loading owners and their related resources lives in ./resource-owners.

/** The kinds of resource a Resources page can list. */
export type ResourceCollection =
  | 'domains'
  | 'systems'
  | 'agents'
  | 'services'
  | 'flows'
  | 'entities'
  | 'data-products'
  | 'containers'
  | 'events'
  | 'commands'
  | 'queries'
  | 'channels'
  | 'adrs';

/** How a resource relates to the page's owner: which way a message flows, how a data store is used, or how it belongs to the owner. */
export type ResourceRelationship =
  | 'receives'
  | 'sends'
  | 'sends-and-receives'
  | 'reads'
  | 'writes'
  | 'reads-and-writes'
  | 'contains'
  | 'owns'
  | 'appears-in'
  | 'governed-by'
  | 'includes'
  | 'transports'
  | 'produces-messages'
  | 'receives-messages'
  | 'produces-and-receives-messages'
  | 'produces'
  | 'consumes'
  | 'produces-and-consumes'
  | 'triggers'
  | 'triggered-by'
  | 'triggers-and-triggered-by';

/** Any catalog entry a Resources page reads: a collection entry, possibly hydrated with extra fields. */
export type ResourceEntry = {
  collection: string;
  data: { id: string; version: string; name?: string; summary?: string; [key: string]: any };
  [key: string]: any;
};

export type ResourceOwnerCollection = 'systems' | 'domains' | 'services' | 'flows' | 'channels' | MessageOwnerCollection;
type MessageOwnerCollection = 'events' | 'commands' | 'queries';
const isMessageOwner = (collection: ResourceOwnerCollection): collection is MessageOwnerCollection =>
  collection === 'events' || collection === 'commands' || collection === 'queries';

/** Resources that point at the owner, rather than being listed in the owner's own frontmatter. */
export interface RelatedResources {
  /** Decision records whose `appliesTo` includes the owner. */
  adrs?: ResourceEntry[];
  /** Flows with a step that points at the owner (services only). */
  stepFlows?: ResourceEntry[];
  /** The resources a flow's steps point at (flows only). */
  stepResources?: ResourceEntry[];
  /** Services and agents that send to the channel, those that receive from it, and the messages on it (channels only). */
  channelProducers?: ResourceEntry[];
  channelConsumers?: ResourceEntry[];
  channelMessages?: ResourceEntry[];
  /** The channels, flows and messages a message connects to (messages only; its producers and consumers are on `data`). */
  messageChannels?: ResourceEntry[];
  messageFlows?: ResourceEntry[];
  messageTriggers?: ResourceEntry[];
  messageTriggeredBy?: ResourceEntry[];
}

/** A resource owner as the Resources page receives it: the collection entry with its related resources attached. */
export type ResourceOwner = ResourceEntry & RelatedResources;

export interface ResourceGroup {
  collection: ResourceCollection;
  items: ResourceEntry[];
}

const getMessages = (data: any) =>
  uniqueResources([...(data.sends || []), ...(data.receives || [])].filter((message) => message?.collection));

const messageGroups = (messages: any[]): ResourceGroup[] => [
  { collection: 'events', items: messages.filter((message) => message.collection === 'events') },
  { collection: 'commands', items: messages.filter((message) => message.collection === 'commands') },
  { collection: 'queries', items: messages.filter((message) => message.collection === 'queries') },
];

// The collections a flow step can point at, in the order the page groups them.
const FLOW_STEP_COLLECTIONS: ResourceCollection[] = [
  'services',
  'agents',
  'flows',
  'containers',
  'data-products',
  'events',
  'commands',
  'queries',
];

export const getResourceGroups = (
  data: any,
  ownerCollection: ResourceOwnerCollection,
  related: RelatedResources = {}
): ResourceGroup[] => {
  const adrGroup: ResourceGroup = { collection: 'adrs', items: related.adrs || [] };

  // A message's resources are what produces or consumes it, the channels it travels on, the
  // flows it appears in, and the messages it triggers or is triggered by.
  if (isMessageOwner(ownerCollection)) {
    const endpoints = uniqueResources([...(data.producers || []), ...(data.consumers || [])]);
    const endpointGroup = (collection: ResourceCollection): ResourceGroup => ({
      collection,
      items: endpoints.filter((endpoint) => endpoint.collection === collection),
    });
    return [
      endpointGroup('services'),
      endpointGroup('agents'),
      endpointGroup('data-products'),
      { collection: 'channels', items: related.messageChannels || [] },
      { collection: 'flows', items: related.messageFlows || [] },
      ...messageGroups(uniqueResources([...(related.messageTriggers || []), ...(related.messageTriggeredBy || [])])),
      adrGroup,
    ];
  }

  // A channel's resources are the services and agents that send to or receive from it, and the messages on it.
  if (ownerCollection === 'channels') {
    const endpoints = uniqueResources([...(related.channelProducers || []), ...(related.channelConsumers || [])]);
    return [
      { collection: 'services', items: endpoints.filter((endpoint) => endpoint.collection === 'services') },
      { collection: 'agents', items: endpoints.filter((endpoint) => endpoint.collection === 'agents') },
      ...messageGroups(related.channelMessages || []),
      adrGroup,
    ];
  }

  // A flow's resources are what its steps point at.
  if (ownerCollection === 'flows') {
    const stepResources = related.stepResources || [];
    return [
      ...FLOW_STEP_COLLECTIONS.map((collection) => ({
        collection,
        items: stepResources.filter((resource) => resource.collection === collection),
      })),
      adrGroup,
    ];
  }

  // A service's resources are what it uses: the messages it sends and receives, its
  // entities, the data stores it reads from or writes to, and the flows it appears in.
  if (ownerCollection === 'services') {
    return [
      { collection: 'flows', items: uniqueResources([...(data.flows || []), ...(related.stepFlows || [])]) },
      { collection: 'entities', items: data.entities || [] },
      { collection: 'containers', items: uniqueResources([...(data.writesTo || []), ...(data.readsFrom || [])]) },
      ...messageGroups(getMessages(data)),
      adrGroup,
    ];
  }

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
    ...messageGroups(ownerCollection === 'domains' ? getMessages(data) : []),
    adrGroup,
  ];
};

// The page loader attaches the RelatedResources fields to the owner (see _index.data.ts).
export const hasResources = (owner: any, ownerCollection: ResourceOwnerCollection): boolean =>
  getResourceGroups(owner?.data ?? {}, ownerCollection, owner ?? {}).some(({ items }) => items.length > 0);

const includesResource = (resources: any[] | undefined, item: any) =>
  (resources || []).some((resource) => resource?.data && resourceKey(resource) === resourceKey(item));

/**
 * How a resource relates to the page's owner: which way a message flows, how a data store
 * is used, or whether the owner contains, owns or appears in it.
 */
export const getResourceRelationship = (
  data: any,
  ownerCollection: ResourceOwnerCollection,
  collection: ResourceCollection,
  item: any,
  related: RelatedResources = {}
): ResourceRelationship | undefined => {
  if (collection === 'adrs') return 'governed-by';
  if (ownerCollection === 'flows') return 'includes';
  if (isMessageOwner(ownerCollection)) {
    if (collection === 'channels') return 'transports';
    if (collection === 'flows') return 'appears-in';
    if (collection === 'events' || collection === 'commands' || collection === 'queries') {
      const triggers = includesResource(related.messageTriggers, item);
      const triggeredBy = includesResource(related.messageTriggeredBy, item);
      if (triggers && triggeredBy) return 'triggers-and-triggered-by';
      if (triggers) return 'triggers';
      if (triggeredBy) return 'triggered-by';
      return undefined;
    }
    const produces = includesResource(data.producers, item);
    const consumes = includesResource(data.consumers, item);
    if (produces && consumes) return 'produces-and-consumes';
    if (produces) return 'produces';
    if (consumes) return 'consumes';
    return undefined;
  }
  // A channel transports messages; services and agents produce messages onto it or receive them from it.
  if (ownerCollection === 'channels') {
    if (collection !== 'services' && collection !== 'agents') return 'transports';
    const produces = includesResource(related.channelProducers, item);
    const receives = includesResource(related.channelConsumers, item);
    if (produces && receives) return 'produces-and-receives-messages';
    if (produces) return 'produces-messages';
    if (receives) return 'receives-messages';
    return undefined;
  }
  if (collection === 'events' || collection === 'commands' || collection === 'queries') {
    const sends = includesResource(data.sends, item);
    const receives = includesResource(data.receives, item);
    if (sends && receives) return 'sends-and-receives';
    if (sends) return 'sends';
    if (receives) return 'receives';
    return undefined;
  }
  if (collection === 'entities') return 'owns';
  if (ownerCollection === 'services') {
    if (collection === 'flows') return 'appears-in';
    if (collection === 'containers') {
      const writes = includesResource(data.writesTo, item);
      const reads = includesResource(data.readsFrom, item);
      if (writes && reads) return 'reads-and-writes';
      if (writes) return 'writes';
      if (reads) return 'reads';
    }
    return undefined;
  }
  // Everything else on a domain or system page is part of it.
  return 'contains';
};

/**
 * The schema page for a resource, matching the sidebar's Schema link: messages with an entry
 * in the schemas collection (keyed `collection:id:version`), and data products with an output
 * contract. Undefined for everything else.
 */
export const getSchemaPath = (collection: ResourceCollection, item: any, schemaKeys: Set<string>) => {
  const { id, version } = item.data;
  if (collection === 'events' || collection === 'commands' || collection === 'queries') {
    return schemaKeys.has(`${collection}:${id}:${version}`) ? `/schemas/${collection}/${id}/${version}` : undefined;
  }
  if (collection === 'data-products') {
    const contract = (item.data.outputs || []).find((output: any) => output.contract)?.contract;
    return contract ? `/schemas/data-products/${id}/${version}?contract=${encodeURIComponent(contract.path)}` : undefined;
  }
  return undefined;
};

export const getDocsPath = (collection: ResourceCollection, item: any) =>
  `/docs/${collection}/${item.data.id}/${item.data.version}`;

// Collections the visualiser has a page for (domains and systems through their own routes).
// Entities and decision records have none.
const VISUALISER_COLLECTIONS = new Set<ResourceCollection>([
  'domains',
  'systems',
  'agents',
  'services',
  'flows',
  'containers',
  'channels',
  'data-products',
  'events',
  'commands',
  'queries',
]);

/** The resource's visualiser page, unless the visualiser is off, has no page for it, or the resource opts out. */
export const getVisualiserPath = (collection: ResourceCollection, item: any, visualiserEnabled: boolean) => {
  if (!visualiserEnabled || !VISUALISER_COLLECTIONS.has(collection) || item.data.visualiser === false) return undefined;
  return `/visualiser/${collection}/${item.data.id}/${item.data.version}`;
};

/** Same key and badge as the favorite button on the resource's docs page. */
export const getFavorite = (collection: ResourceCollection, item: any) => {
  const resourceType = collectionToResourceMap[collection];
  return {
    nodeKey: `${resourceType}:${item.data.id}:${item.data.version}`,
    badge: resourceType.charAt(0).toUpperCase() + resourceType.slice(1),
  };
};
