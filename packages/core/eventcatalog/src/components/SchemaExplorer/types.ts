import type { CollectionMessageTypes } from '@types';
import type { MessageExample } from '@utils/collections/examples';
import type { MessageUsageGraph } from '@utils/schema-usage-graph';
export type { MessageExample };

/** A resource related to a message: something that produces or consumes it, or a flow that includes it. */
export type SchemaRelationshipCollection = 'services' | 'agents' | 'data-products' | 'flows';

export interface SchemaRelationship {
  id: string;
  version: string;
  /** Which kind of resource produces or consumes the message. Defaults to a service when unknown. */
  collection?: SchemaRelationshipCollection;
  name?: string;
  summary?: string;
}

export type Producer = SchemaRelationship;
export type Consumer = SchemaRelationship;

export interface FlowUsage extends SchemaRelationship {
  /** The flow's diagram, as rendered by the visualiser. */
  graph?: MessageUsageGraph;
}

/** A channel the message is published to. */
export interface MessageChannel {
  id: string;
  version: string;
  name?: string;
}

export interface Owner {
  id: string;
  name: string;
  type: 'users' | 'teams';
  href: string;
}

/** Where a remote schema was resolved from. Absent for schema files stored in the catalog. */
export interface SchemaSourceInfo {
  provider: string;
  /** Browsable link to the schema, when the source provides one. */
  url?: string;
  repository?: string;
  path?: string;
  ref?: string;
  commit?: string;
  /** ISO 8601 timestamp of when the schema was first created in the source. */
  createdAt?: string;
  /** ISO 8601 timestamp of when the schema was last updated in the source. */
  updatedAt?: string;
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
    /** Flows with a step that sends or receives this message. */
    flows?: FlowUsage[];
    /** Channels the message is published to. */
    channels?: MessageChannel[];
    producerName?: string;
    owners?: Owner[];
  };
  schemaContent?: string;
  /** Internal URL for loading this version's content without embedding it in the page. */
  contentUrl?: string;
  schemaExtension?: string;
  /** The schema reference used by the message, for example `source://contracts/events/OrderPlaced.schema.json`. */
  schemaRef?: string;
  /** Display name of the schema entry itself, as declared on the message or reported by the source. */
  schemaName?: string;
  source?: SchemaSourceInfo;
  specType?: string;
  specName?: string;
  specFilenameWithoutExtension?: string;
  // For data contracts
  contractType?: string;
  dataProductId?: string;
  dataProductVersion?: string;
  // Examples
  examples?: MessageExample[];
  /** Producer → message → consumer graph for the Usage tab, as rendered by the visualiser. */
  graph?: MessageUsageGraph;
}

export interface SchemaDetails {
  schemaContent: string;
  examples: MessageExample[];
  graph?: MessageUsageGraph;
  data?: Pick<SchemaItem['data'], 'producers' | 'consumers' | 'flows' | 'channels'>;
}

export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  diffHtml: string;
  fromContent: string;
  toContent: string;
}
