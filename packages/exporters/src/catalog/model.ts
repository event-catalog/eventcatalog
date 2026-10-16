/**
 * The document model the HTML reference renders from. Built once from the catalog by `load.ts`,
 * with every relationship (producers, consumers, channels, owners) resolved up front so the
 * renderer only has to walk plain data.
 */

export type MessageType = 'event' | 'command' | 'query';

export type SectionKind =
  | 'domain'
  | 'system'
  | 'service'
  | 'agent'
  | MessageType
  | 'channel'
  | 'container'
  | 'flow'
  | 'entity'
  | 'team'
  | 'user';

export interface Ref {
  kind: SectionKind;
  id: string;
  name: string;
  /** Anchor of the section this reference links to, or undefined when the resource has no section. */
  anchor?: string;
}

export interface Attribute {
  name: string;
  type: string;
  format?: string;
  required: boolean;
  description?: string;
  /** A schema title that adds to the description. */
  title?: string;
  enum?: string[];
  /** The enum values as TypeScript literals (`1`, `true`, `"A"`), when they are not all strings. */
  enumLiterals?: string[];
  example?: string;
  default?: string;
  deprecated?: boolean;
  /** Validation rules and other facts shown under the description, e.g. "Max length 64" or "Field number 3". */
  constraints?: { label: string; value?: string }[];
  children?: Attribute[];
  /** oneOf / anyOf alternatives, each with its own attributes. */
  variants?: AttributeVariant[];
  variantType?: 'oneOf' | 'anyOf';
}

export interface AttributeVariant {
  title: string;
  description?: string;
  children: Attribute[];
}

export interface ParsedSchema {
  /** 'json-schema' | 'avro' | 'protobuf' | file extension for anything else */
  format: string;
  fileName: string;
  /** The schema as written in the catalog, pretty-printed when it is JSON. */
  raw: string;
  /** What the schema says about itself: a JSON Schema description, an Avro doc or a protobuf message comment. */
  description?: string;
  attributes: Attribute[];
  /** Root-level oneOf / anyOf alternatives. */
  variants?: AttributeVariant[];
  variantType?: 'oneOf' | 'anyOf';
  example?: unknown;
  typescript?: string;
}

export interface Owner extends Ref {
  kind: 'team' | 'user';
}

export interface Badge {
  content: string;
}

export interface BaseResource {
  id: string;
  name: string;
  version: string;
  summary?: string;
  markdown: string;
  anchor: string;
  owners: Owner[];
  badges: Badge[];
  /** Custom properties: the resource's `x-…` frontmatter fields, as written. */
  properties: Record<string, unknown>;
  deprecated?: string | true;
  draft?: boolean;
}

export interface MessageLink {
  message: Ref & { kind: MessageType };
  channels: ChannelRef[];
  /** Set when the pointer names an older version than the one in the reference. */
  pinnedVersion?: string;
}

export interface ChannelRef extends Ref {
  kind: 'channel';
  address?: string;
}

/** An OpenAPI, AsyncAPI or GraphQL file attached to a service or domain, with its raw contents. */
export interface SpecificationModel {
  type: string;
  name: string;
  fileName: string;
  /** Undefined when the file could not be read. */
  content?: string;
}

export interface DomainModel extends BaseResource {
  kind: 'domain';
  parent?: Ref;
  subdomains: Ref[];
  systems: Ref[];
  services: Ref[];
  /** Messages the domain itself declares (its own sends/receives), not those of its services. */
  sends: (Ref & { kind: MessageType })[];
  receives: (Ref & { kind: MessageType })[];
  entities: Ref[];
  flows: Ref[];
  specifications: SpecificationModel[];
  ubiquitousLanguage: { name: string; summary?: string }[];
}

export interface SystemModel extends BaseResource {
  kind: 'system';
  scope?: 'internal' | 'external';
  domain?: Ref;
  services: Ref[];
  flows: Ref[];
  entities: Ref[];
  dataStores: Ref[];
  /** Other systems this one talks to. */
  relationships: { ref: Ref; label?: string }[];
  /** People and external parties that use the system. */
  actors: { name: string; label?: string; direction?: string }[];
}

export interface ServiceModel extends BaseResource {
  kind: 'service' | 'agent';
  domain?: Ref;
  system?: Ref;
  sends: MessageLink[];
  receives: MessageLink[];
  upstream: Ref[];
  downstream: Ref[];
  writesTo: Ref[];
  readsFrom: Ref[];
  specifications: SpecificationModel[];
  repository?: { language?: string; url?: string };
}

export interface MessageModel extends BaseResource {
  kind: MessageType;
  domain?: Ref;
  producers: Ref[];
  consumers: Ref[];
  channels: ChannelRef[];
  operation?: { method?: string; path?: string; statusCodes?: string[] };
  schema?: ParsedSchema;
  examples: { fileName: string; content: string }[];
}

export interface ChannelModel extends BaseResource {
  kind: 'channel';
  address?: string;
  protocols: string[];
  deliveryGuarantee?: string;
  parameters: { name: string; description?: string; enum?: string[]; default?: string }[];
  messages: (Ref & { kind: MessageType })[];
  /** Channels this one routes messages on to (its `routes`), and the channels that route to it. */
  routesTo: ChannelRef[];
  routedFrom: ChannelRef[];
}

/** A data store (a container in the SDK): database, cache, object store, warehouse and so on. */
export interface DataStoreModel extends BaseResource {
  kind: 'container';
  containerType?: string;
  technology?: string;
  authoritative?: boolean;
  accessMode?: string;
  classification?: string;
  residency?: string;
  retention?: string;
  purpose?: string;
  system?: Ref;
  writers: Ref[];
  readers: Ref[];
}

export interface FlowStepModel {
  title: string;
  summary?: string;
  ref?: Ref;
  actor?: string;
  next: { title: string; label?: string }[];
}

export interface FlowModel extends BaseResource {
  kind: 'flow';
  steps: FlowStepModel[];
}

export interface EntityModel extends BaseResource {
  kind: 'entity';
  aggregateRoot: boolean;
  domain?: Ref;
  attributes: Attribute[];
}

export interface TeamModel {
  kind: 'team' | 'user';
  id: string;
  name: string;
  anchor: string;
  summary?: string;
  role?: string;
  email?: string;
  slack?: string;
  members: Ref[];
  teams: Ref[];
  owns: Ref[];
}

export interface CatalogModel {
  title: string;
  organization?: string;
  tagline?: string;
  homepage?: string;
  /** Data URI (or remote URL) of the catalog's own logo. Unset means the EventCatalog logo is used. */
  logo?: { src: string; alt: string };
  generatedAt: Date;
  domains: DomainModel[];
  systems: SystemModel[];
  services: ServiceModel[];
  messages: MessageModel[];
  channels: ChannelModel[];
  dataStores: DataStoreModel[];
  flows: FlowModel[];
  entities: EntityModel[];
  teams: TeamModel[];
  users: TeamModel[];
}
