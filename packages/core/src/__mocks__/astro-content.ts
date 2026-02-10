// Mock implementation of astro:content module for testing
// This provides default implementations that can be overridden by vi.mock() in individual tests

export const getCollection = async (key: string, filter?: (entry: any) => boolean) => {
  // Default empty implementation - tests should override this with vi.mock()
  return [];
};

export type ContentCollectionKey =
  | 'events'
  | 'services'
  | 'commands'
  | 'queries'
  | 'domains'
  | 'channels'
  | 'flows'
  | 'messages'
  | 'entities'
  | 'schemas';

export type CollectionEntry<T extends ContentCollectionKey> = {
  id: string;
  slug: string;
  body: string;
  collection: T;
  data: any;
  filePath?: string;
  render?: () => Promise<any>;
};
