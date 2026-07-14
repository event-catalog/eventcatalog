import { getCollection, type CollectionEntry } from 'astro:content';
import { getMessagesWithTriggerPaths, type MessageReceiver } from '@utils/collections/message-triggers';
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import type { CollectionMessageTypes } from '@types';

const MESSAGE_TYPES: CollectionMessageTypes[] = ['events', 'commands', 'queries'];

const loadTriggerPathResources = async () => {
  const { pageDataLoader } = await import('@utils/page-loaders/page-data-loader');
  const [messageCollections, services, agents, domains] = await Promise.all([
    Promise.all(MESSAGE_TYPES.map((type) => pageDataLoader[type]())),
    getCollection('services'),
    getCollection('agents'),
    getCollection('domains'),
  ]);

  return {
    allMessages: messageCollections.flat() as CollectionEntry<CollectionMessageTypes>[],
    receivers: [...services, ...agents, ...domains] as MessageReceiver[],
  };
};

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) return [];

    const { allMessages, receivers } = await loadTriggerPathResources();
    const messagesWithTriggerPaths = getMessagesWithTriggerPaths(receivers, allMessages);

    return messagesWithTriggerPaths.map((item) => ({
      params: {
        type: item.collection,
        id: item.data.id,
        version: item.data.version,
      },
      props: {
        type: item.collection,
        ...item,
      },
    }));
  }

  protected static async fetchData(params: any) {
    const { type, id, version } = params;
    if (!type || !id || !version || !MESSAGE_TYPES.includes(type)) return null;

    const { allMessages, receivers } = await loadTriggerPathResources();
    const item = allMessages.find((entry) => entry.collection === type && entry.data.id === id && entry.data.version === version);
    if (!item) return null;

    const hasTriggerPaths = getMessagesWithTriggerPaths(receivers, allMessages).includes(item);
    return hasTriggerPaths ? { type, ...item } : null;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Message trigger paths not found',
    });
  }
}
