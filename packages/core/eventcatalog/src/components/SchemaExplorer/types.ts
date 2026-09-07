import type { CollectionMessageTypes } from '@types';
import type { MessageExample } from '@utils/collections/examples';
export type { MessageExample };

export interface Producer {
  id: string;
  version: string;
}

export interface Consumer {
  id: string;
  version: string;
}

export interface Owner {
  id: string;
  name: string;
  type: 'users' | 'teams';
  href: string;
}

export interface SchemaItem {
  collection: CollectionMessageTypes | 'services' | 'domains' | 'data-products';
  data: {
    id: string;
    name: string;
    version: string;
    summary?: string;
    schemaPath?: string;
    producers?: Producer[];
    consumers?: Consumer[];
    producerName?: string;
    owners?: Owner[];
  };
  schemaContent?: string;
  /** Internal URL for loading this version's content without embedding it in the page. */
  contentUrl?: string;
  schemaExtension?: string;
  specType?: string;
  specName?: string;
  specFilenameWithoutExtension?: string;
  // For data contracts
  contractType?: string;
  dataProductId?: string;
  dataProductVersion?: string;
  // Examples
  examples?: MessageExample[];
}

export interface SchemaDetails {
  schemaContent: string;
  examples: MessageExample[];
  data?: Pick<SchemaItem['data'], 'producers' | 'consumers'>;
}

export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  diffHtml: string;
  fromContent: string;
  toContent: string;
}
