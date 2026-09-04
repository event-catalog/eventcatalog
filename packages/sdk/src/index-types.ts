import type {
  AdrPointer,
  AdrResourcePointer,
  AdrStatus,
  BaseSchema,
  Channel,
  ChannelPointer,
  Container,
  DataProductOutputPointer,
  ResourcePointer,
  SchemaPointer,
  SendsPointer,
  ReceivesPointer,
  Specification,
  SystemActorRelationship,
  SystemRelationshipPointer,
  Team,
} from './types';

export type IndexResourceType =
  | 'adr'
  | 'agent'
  | 'channel'
  | 'command'
  | 'container'
  | 'data-product'
  | 'diagram'
  | 'domain'
  | 'entity'
  | 'event'
  | 'flow'
  | 'query'
  | 'service'
  | 'system'
  | 'team'
  | 'user';

export type IndexSchema = Omit<SchemaPointer, 'file'> & {
  hash?: string;
  /** Raw schema file text. Only present when the index was built with `includeSchemaContent`. */
  content?: string;
};

export type IndexSpecification = Specification & {
  hash?: string;
};

export type IndexSidecar = {
  path: string;
  hash?: string;
};

export type IndexAsset = {
  path: string;
  hash?: string;
};

export type IndexReference = ResourcePointer & {
  kind: 'agent' | 'container' | 'data-product' | 'flow' | 'message' | 'service';
};

export type IndexResource = {
  type: IndexResourceType;
  id: string;
  version?: string;
  name: string;
  contentPath: string;
  contentHash?: string;
  draft?: BaseSchema['draft'];
  deprecated?: BaseSchema['deprecated'];
  owners?: string[];
  diagrams?: ResourcePointer[];
  schemas?: IndexSchema[];
  specifications?: IndexSpecification[];
  sidecars?: IndexSidecar[];
  container_type?: Container['container_type'];
  references?: IndexReference[];
  sends?: SendsPointer[];
  receives?: ReceivesPointer[];
  channels?: ChannelPointer[];
  address?: Channel['address'];
  protocols?: Channel['protocols'];
  deliveryGuarantee?: Channel['deliveryGuarantee'];
  routes?: Channel['routes'];
  parameters?: Channel['parameters'];
  services?: ResourcePointer[];
  agents?: ResourcePointer[];
  domains?: ResourcePointer[];
  systems?: ResourcePointer[];
  entities?: ResourcePointer[];
  dataProducts?: ResourcePointer[];
  flows?: ResourcePointer[];
  writesTo?: ResourcePointer[];
  readsFrom?: ResourcePointer[];
  containers?: ResourcePointer[];
  relationships?: SystemRelationshipPointer[];
  actors?: SystemActorRelationship[];
  inputs?: ResourcePointer[];
  outputs?: DataProductOutputPointer[];
  status?: AdrStatus;
  appliesTo?: AdrResourcePointer[];
  supersedes?: AdrPointer[];
  supersededBy?: AdrPointer[];
  amends?: AdrPointer[];
  amendedBy?: AdrPointer[];
  related?: AdrPointer[];
  members?: Team['members'];
};

export type Index = {
  indexVersion: 1;
  source: string;
  commit: string;
  resources: IndexResource[];
  assets?: IndexAsset[];
};

export type ResolvedGraph = {
  entities: ResolvedEntity[];
  assets: ResolvedAsset[];
  edges: ResolvedEdge[];
  conflicts: Conflict[];
  warnings: ResolutionWarning[];
  externals: External[];
};

export type ResolvedEntity = IndexResource & {
  resolvedFrom: {
    source: string;
    commit: string;
  };
  contributors?: string[];
};

export type ResolvedAsset = IndexAsset & {
  resolvedFrom: {
    source: string;
    commit: string;
  };
  contributors?: string[];
};

export type ResolutionWarning = {
  kind: 'asset-collision';
  path: string;
  sources: string[];
  winner: string;
};

export type EdgeDirection =
  | 'sends'
  | 'receives'
  | 'writesTo'
  | 'readsFrom'
  | 'contains'
  | 'references'
  | 'appliesTo'
  | 'relatesTo';

export type ResolvedEdge = {
  from: string;
  fromVersion: string | null;
  fromResolvedFrom: {
    source: string;
    commit: string;
  };
  to: string;
  direction: EdgeDirection;
  via?: string;
  label?: string;
  pointer: string | null;
  resolved: string | null;
  resolvedFrom?: {
    source: string;
    commit: string;
  };
  status: 'resolved' | 'unresolved' | 'external';
};

export type ConflictKind = 'duplicate-source' | 'type-collision' | 'facet-disagreement' | 'pointer-type-mismatch';

export type Conflict = {
  kind: ConflictKind;
  id: string;
  sources: string[];
  detail?: string;
};

export type External = {
  id: string;
  version?: string;
  referencedBy: string[];
  didYouMean?: string[];
};
