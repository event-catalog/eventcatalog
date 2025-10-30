import type { CollectionMessageTypes } from '@types';

export interface Producer {
  id: string;
  version: string;
}

export interface Consumer {
  id: string;
  version: string;
}

export interface SchemaItem {
  collection: CollectionMessageTypes | 'services';
  data: {
    id: string;
    name: string;
    version: string;
    summary?: string;
    schemaPath?: string;
    producers?: Producer[];
    consumers?: Consumer[];
  };
  schemaContent?: string;
  schemaExtension?: string;
  specType?: string;
  specName?: string;
  specFilenameWithoutExtension?: string;
}

export interface VersionDiff {
  newerVersion: string;
  olderVersion: string;
  diffHtml: string;
  newerContent: string;
  olderContent: string;
}
