// pages/docs/[type]/[id]/[version]/contracts/[filename].astro
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { CollectionEntry } from 'astro:content';
import type { CollectionTypes, PageTypes } from '@types';
import type { ConsumerContract } from '@utils/collections/consumer-contracts';

/** The resources that receive messages, so can have a contract with a producer */
const CONSUMER_TYPES = ['services', 'agents', 'domains'] as const;
type ConsumerType = (typeof CONSUMER_TYPES)[number];

const MESSAGE_TYPES = ['events', 'commands', 'queries'] as const;
type MessageType = (typeof MESSAGE_TYPES)[number];

/** A link in a node's right-click menu, as the visualiser's nodes have */
export type ContractMenuItem = { label: string; href: string; download?: string; external?: boolean; separator?: boolean };

export type ContractResource = {
  id: string;
  version: string;
  name: string;
  collection: string;
  /** The resource's right-click menu: the same links its node has in the visualiser */
  contextMenu: ContractMenuItem[];
};

/** A message a contract covers. Without a collection it isn't documented in the catalog. */
export type ContractMessage = {
  id: string;
  version: string;
  name: string;
  collection?: string;
  /** The services and agents that produce the message */
  producers: ContractResource[];
  /** The message's right-click menu: the same links its node has in the visualiser */
  contextMenu: ContractMenuItem[];
};

/** The right-click menu the visualiser gives a resource's node */
export const getContextMenu = async (entry: { collection: string; data: any }): Promise<ContractMenuItem[]> => {
  const { buildContextMenuForAgent, buildContextMenuForMessage, buildContextMenuForResource, buildContextMenuForService } =
    await import('@utils/node-graphs/utils/utils');
  const { id, version, name, specifications, repository, schemaPath } = entry.data;

  if (entry.collection === 'services') return buildContextMenuForService({ id, version, specifications, repository });
  if (entry.collection === 'agents') return buildContextMenuForAgent({ id, version, repository });
  if ((MESSAGE_TYPES as readonly string[]).includes(entry.collection)) {
    return buildContextMenuForMessage({ id, version, name: name || id, collection: entry.collection, schemaPath });
  }
  return buildContextMenuForResource({ collection: entry.collection, id, version });
};

const isConsumerType = (type: string): type is ConsumerType => (CONSUMER_TYPES as readonly string[]).includes(type);

/** Each consumer of a type with its contracts, read from the raw entry (hydration drops `contract`) */
const loadConsumersWithContracts = async (type: ConsumerType) => {
  const { getCollection } = await import('astro:content');
  const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
  const { getConsumerContractsForResource } = await import('@utils/collections/consumer-contracts');

  const [items, rawItems] = await Promise.all([pageDataLoader[type as PageTypes](), getCollection(type)]);

  return items.flatMap((item) => {
    const raw = rawItems.find((r) => r.data.id === item.data.id && r.data.version === item.data.version);
    const contracts = raw ? getConsumerContractsForResource(raw as any) : [];
    return contracts.length > 0 ? [{ item, contracts }] : [];
  });
};

/** The messages a contract covers, with their names and collections when they are documented */
const resolveMessages = async (contract: ConsumerContract): Promise<ContractMessage[]> => {
  const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
  const { getItemsFromCollectionByIdAndSemverOrLatest } = await import('@utils/collections/util');

  const messages = (await Promise.all(MESSAGE_TYPES.map((type) => pageDataLoader[type]()))).flat();

  const resolveMessage = async (pointer: { id: string; version: string }): Promise<ContractMessage> => {
    const match = getItemsFromCollectionByIdAndSemverOrLatest(messages, pointer.id, pointer.version)[0];
    if (!match) return { id: pointer.id, version: pointer.version, name: pointer.id, producers: [], contextMenu: [] };

    const producers = await Promise.all(
      (((match.data as any).producers || []) as any[])
        .filter((producer) => producer?.data && (producer.collection === 'services' || producer.collection === 'agents'))
        .map(async (producer) => ({
          id: producer.data.id,
          version: producer.data.version,
          name: producer.data.name || producer.data.id,
          collection: producer.collection,
          contextMenu: await getContextMenu(producer),
        }))
    );

    return {
      id: match.data.id,
      version: match.data.version,
      name: (match.data as any).name || match.data.id,
      collection: match.collection,
      producers,
      contextMenu: await getContextMenu(match),
    };
  };

  return Promise.all(contract.messages.map(resolveMessage));
};

const isMessageType = (type: string): type is MessageType => (MESSAGE_TYPES as readonly string[]).includes(type);

/** Whether the latest version of a page's resource has a page with the same slug, for the "new version" link */
const hasLatestPage = <T extends { data: { id: string; version: string } }>(
  resources: { resource: T; slugs: string[] }[],
  current: { data: { id: string; latestVersion?: string } },
  slug: string
) =>
  resources.some(
    ({ resource, slugs }) =>
      resource.data.id === current.data.id && resource.data.version === current.data.latestVersion && slugs.includes(slug)
  );

/** A contract's page under its consumer: every message the contract covers */
const toPageProps = async (
  type: ConsumerType,
  contract: ConsumerContract,
  item: CollectionEntry<CollectionTypes>,
  consumers: Awaited<ReturnType<typeof loadConsumersWithContracts>>
) => ({
  type,
  contract,
  contractMessages: await resolveMessages(contract),
  // The latest version of the consumer may have dropped or renamed the contract
  latestVersionHasContract: hasLatestPage(
    consumers.map(({ item: resource, contracts }) => ({ resource, slugs: contracts.map((c) => c.slug) })),
    item as any,
    contract.slug
  ),
  ...item,
});

/** Each message of a type with the contracts its consumers have for it, and the consumers they belong to */
const loadMessagesWithContracts = async (type: MessageType) => {
  const { getCollection } = await import('astro:content');
  const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
  const { getConsumerContractsForMessage } = await import('@utils/collections/consumer-contracts');

  const [messages, ...rawConsumers] = await Promise.all([
    pageDataLoader[type](),
    ...CONSUMER_TYPES.map((consumerType) => getCollection(consumerType)),
  ]);
  const consumers = rawConsumers.flat() as any[];
  // Most consumers have no contracts: only those that do are checked against each message
  const consumersWithContracts = consumers.filter((consumer) =>
    (consumer.data.receives || []).some((pointer: any) => pointer.contract)
  );

  return messages.flatMap((message) => {
    const contracts = getConsumerContractsForMessage(message as any, consumersWithContracts).map((entry) => ({
      ...entry,
      // The consumer's entry: the contract's file is in its folder
      owner: consumersWithContracts.find(
        (consumer) =>
          consumer.collection === entry.consumer.collection &&
          consumer.data.id === entry.consumer.id &&
          consumer.data.version === entry.consumer.version
      ),
    }));
    return contracts.length > 0 ? [{ message, contracts }] : [];
  });
};

/**
 * A contract's page under a message it covers: the same contract and file, with that message only and the
 * consumer it belongs to. The page is the message's, so its sidebar stays and its other consumers' contracts
 * are one click away.
 */
const toMessagePageProps = async (
  type: MessageType,
  message: CollectionEntry<CollectionTypes>,
  entry: Awaited<ReturnType<typeof loadMessagesWithContracts>>[number]['contracts'][number],
  messages: Awaited<ReturnType<typeof loadMessagesWithContracts>>
) => ({
  type,
  contract: entry.contract,
  contractMessages: await resolveMessages({
    ...entry.contract,
    messages: [{ id: message.data.id, version: message.data.version }],
  }),
  contractConsumer: { ...entry.consumer, contextMenu: await getContextMenu(entry.owner) },
  // Where the contract's file is read from
  contractOwner: { filePath: entry.owner.filePath as string | undefined },
  // A consumer pinned to this version of the message has no contract for the latest one
  latestVersionHasContract: hasLatestPage(
    messages.map(({ message: resource, contracts }) => ({ resource, slugs: contracts.map((c) => c.slug) })),
    message as any,
    entry.slug
  ),
  ...message,
});

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const paths = await Promise.all(
      CONSUMER_TYPES.map(async (type) => {
        const consumers = await loadConsumersWithContracts(type);
        return Promise.all(
          consumers.flatMap(({ item, contracts }) =>
            contracts.map(async (contract) => ({
              params: { type, id: item.data.id, version: item.data.version, filename: contract.slug },
              props: await toPageProps(type, contract, item, consumers),
            }))
          )
        );
      })
    );

    const messagePaths = await Promise.all(
      MESSAGE_TYPES.map(async (type) => {
        const messages = await loadMessagesWithContracts(type);
        return Promise.all(
          messages.flatMap(({ message, contracts }) =>
            contracts.map(async (entry) => ({
              params: { type, id: message.data.id, version: message.data.version, filename: entry.slug },
              props: await toMessagePageProps(type, message, entry, messages),
            }))
          )
        );
      })
    );

    return [...paths.flat(), ...messagePaths.flat()];
  }

  protected static async fetchData(params: any) {
    const { type, id, version, filename } = params;

    if (!type || !id || !version || !filename) {
      return null;
    }

    if (isMessageType(type)) {
      const messages = await loadMessagesWithContracts(type);
      const found = messages.find(({ message }) => message.data.id === id && message.data.version === version);
      const entry = found?.contracts.find((c) => c.slug === filename);

      return found && entry ? toMessagePageProps(type, found.message, entry, messages) : null;
    }

    if (!isConsumerType(type)) {
      return null;
    }

    const consumers = await loadConsumersWithContracts(type);
    const consumer = consumers.find(({ item }) => item.data.id === id && item.data.version === version);
    const contract = consumer?.contracts.find((c) => c.slug === filename);

    return consumer && contract ? toPageProps(type, contract, consumer.item, consumers) : null;
  }
}
