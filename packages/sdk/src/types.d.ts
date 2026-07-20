export interface ExtensionProperties {
  [key: `x-${string}`]: unknown;
}

// Base type for all resources (domains, services and messages)
export interface BaseSchema extends ExtensionProperties {
  id: string;
  name: string;
  summary?: string;
  version: string;
  badges?: Badge[];
  sidebar?: {
    badge?: string;
  };
  owners?: string[];
  schemaPath?: string;
  schemas?: SchemaPointer[];
  markdown: string;
  repository?: {
    language?: string;
    url?: string;
  };
  deprecated?:
    | boolean
    | {
        date?: string;
        message?: string;
      };
  styles?: {
    icon?: string;
    node?: {
      color?: string;
      label?: string;
    };
  };
  attachments?:
    | string[]
    | {
        url: string;
        title?: string;
        type?: string;
        description?: string;
        icon?: string;
      }[];
  resourceGroups?: ResourceGroup[];
  diagrams?: ResourcePointer[];
  editUrl?: string;
  draft?: boolean | { title?: string; message?: string };
  // SDK types
  schema?: any;
}

export type ResourcePointer = {
  id: string;
  version?: string;
  type?: string;
};

export type CatalogGraphResourceType =
  | 'domain'
  | 'system'
  | 'service'
  | 'agent'
  | 'event'
  | 'command'
  | 'query'
  | 'flow'
  | 'channel'
  | 'entity'
  | 'container'
  | 'data-product'
  | 'adr';

export type CatalogGraphRoot = {
  type: CatalogGraphResourceType;
  id: string;
  version?: string;
};

export type CatalogGraphOptions = {
  /** Number of relationship levels to traverse. Defaults to the complete reachable graph. */
  depth?: number;
  /** Return one deduplicated resource list instead of nested children. */
  flat?: boolean;
};

export type CatalogGraphResource = {
  type: CatalogGraphResourceType;
  id: string;
  version: string;
};

export type CatalogGraphNode = CatalogGraphResource & {
  children: CatalogGraphNode[];
};

export type NestedCatalogGraph = {
  root: CatalogGraphNode;
};

export type FlatCatalogGraph = {
  root: CatalogGraphResource;
  resources: CatalogGraphResource[];
};

export type CatalogGraph = NestedCatalogGraph | FlatCatalogGraph;

export interface GetCatalogGraph {
  (root: CatalogGraphRoot, options: CatalogGraphOptions & { flat: true }): Promise<FlatCatalogGraph | undefined>;
  (root: CatalogGraphRoot, options?: CatalogGraphOptions & { flat?: false }): Promise<NestedCatalogGraph | undefined>;
  (root: CatalogGraphRoot, options: CatalogGraphOptions): Promise<CatalogGraph | undefined>;
}

export type SystemScope = 'internal' | 'external';

export type SystemRelationshipPointer = {
  id: string;
  version?: string;
  label?: string;
};

export type SystemActorRelationship = {
  id: string;
  name?: string;
  label?: string;
  direction?: 'inbound' | 'outbound';
};

export type SchemaPointer = {
  id?: string;
  ref?: string;
  file?: string;
  path?: string;
  name?: string;
  format?: string;
  environments?: string[];
  default?: boolean;
};

export type SendsPointer = {
  id: string;
  version?: string;
  fields?: string[];
  to?: ChannelPointer[];
  group?: string;
};

export type TriggerPointer = {
  id: string;
  version?: string;
  condition?: string;
};

export type ReceivesPointer = {
  id: string;
  version?: string;
  fields?: string[];
  from?: ChannelPointer[];
  group?: string;
  triggers?: TriggerPointer[];
};

export type MessagePointerInput = {
  id: string;
  version: string;
  fields?: string[];
  group?: string;
  triggers?: TriggerPointer[];
};

export interface ResourceGroup {
  id?: string;
  title?: string;
  items: ResourcePointer[];
  limit?: number;
  sidebar?: boolean;
}

export interface ChannelPointer extends ResourcePointer {
  parameters?: Record<string, string>;
}

export type Operation = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path?: string;
  statusCodes?: string[];
};

export type Message = Event | Command | Query;

enum ResourceType {
  Service = 'service',
  Event = 'event',
  Command = 'command',
}

export interface CustomDoc {
  title: string;
  summary: string;
  slug?: string;
  sidebar?: {
    label: string;
    order: number;
  };
  owners?: string[];
  badges?: Badge[];
  fileName?: string;
  markdown: string;
}

interface MessageDetailsPanelProperty {
  producers?: DetailPanelProperty;
  consumers?: DetailPanelProperty;
  triggers?: DetailPanelProperty;
  triggeredBy?: DetailPanelProperty;
  channels?: DetailPanelProperty;
  versions?: DetailPanelProperty;
  repository?: DetailPanelProperty;
  owners?: DetailPanelProperty;
  changelog?: DetailPanelProperty;
  attachments?: DetailPanelProperty;
}

export interface Event extends BaseSchema {
  channels?: ChannelPointer[];
  operation?: Operation;
  detailsPanel?: MessageDetailsPanelProperty;
}
export interface Command extends BaseSchema {
  channels?: ChannelPointer[];
  operation?: Operation;
  detailsPanel?: MessageDetailsPanelProperty;
}
export interface Query extends BaseSchema {
  channels?: ChannelPointer[];
  operation?: Operation;
  detailsPanel?: MessageDetailsPanelProperty;
}
export interface Channel extends BaseSchema {
  address?: string;
  protocols?: string[];
  deliveryGuarantee?: 'at-most-once' | 'at-least-once' | 'exactly-once';
  routes?: ChannelPointer[];
  detailsPanel?: {
    producers?: DetailPanelProperty;
    consumers?: DetailPanelProperty;
    messages?: DetailPanelProperty;
    protocols?: DetailPanelProperty;
    parameters?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
    attachments?: DetailPanelProperty;
  };
  parameters?: {
    [key: string]: {
      enum?: string[];
      default?: string;
      examples?: string[];
      description?: string;
    };
  };
}

export interface Specifications {
  asyncapiPath?: string;
  openapiPath?: string;
  graphqlPath?: string;
}

export interface Specification {
  type: 'openapi' | 'asyncapi' | 'graphql';
  path: string;
  name?: string;
}

export interface Service extends BaseSchema {
  sends?: SendsPointer[];
  receives?: ReceivesPointer[];
  entities?: ResourcePointer[];
  writesTo?: ResourcePointer[];
  readsFrom?: ResourcePointer[];
  flows?: ResourcePointer[];
  externalSystem?: boolean;
  specifications?: Specifications | Specification[];
  detailsPanel?: {
    domains?: DetailPanelProperty;
    messages?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    specifications?: DetailPanelProperty;
    entities?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
    flows?: DetailPanelProperty;
  };
}

export type AgentTool = {
  name: string;
  type: string;
  icon?: string;
  url?: string;
  description?: string;
};

export type AgentModel = {
  provider?: string;
  name?: string;
  version?: string;
};

export interface Agent extends BaseSchema {
  sends?: SendsPointer[];
  receives?: ReceivesPointer[];
  writesTo?: ResourcePointer[];
  readsFrom?: ResourcePointer[];
  flows?: ResourcePointer[];
  model?: AgentModel;
  tools?: AgentTool[];
  detailsPanel?: {
    domains?: DetailPanelProperty;
    messages?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
    containers?: DetailPanelProperty;
    tools?: DetailPanelProperty;
    model?: DetailPanelProperty;
  };
}

export interface Domain extends BaseSchema {
  services?: ResourcePointer[];
  agents?: ResourcePointer[];
  domains?: ResourcePointer[];
  systems?: ResourcePointer[];
  entities?: ResourcePointer[];
  dataProducts?: ResourcePointer[];
  flows?: ResourcePointer[];
  sends?: SendsPointer[];
  receives?: ReceivesPointer[];
  detailsPanel?: {
    parentDomains?: DetailPanelProperty;
    subdomains?: DetailPanelProperty;
    systems?: DetailPanelProperty;
    services?: DetailPanelProperty;
    agents?: DetailPanelProperty;
    entities?: DetailPanelProperty;
    messages?: DetailPanelProperty;
    ubiquitousLanguage?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
  };
}

export interface System extends BaseSchema {
  scope?: SystemScope;
  services?: ResourcePointer[];
  flows?: ResourcePointer[];
  entities?: ResourcePointer[];
  containers?: ResourcePointer[];
  relationships?: SystemRelationshipPointer[];
  actors?: SystemActorRelationship[];
  detailsPanel?: {
    versions?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
    attachments?: DetailPanelProperty;
    services?: DetailPanelProperty;
    flows?: DetailPanelProperty;
    entities?: DetailPanelProperty;
    containers?: DetailPanelProperty;
    diagrams?: DetailPanelProperty;
  };
}

export interface Team {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  summary?: string;
  email?: string;
  hidden?: boolean;
  source?: {
    provider: string;
    id?: string;
    url?: string;
  };
  readOnly?: boolean;
  slackDirectMessageUrl?: string;
  members?: User[] | string[];
  ownedCommands?: Command[];
  ownedServices?: Service[];
  ownedEvents?: Event[];
  markdown: string;
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  hidden?: boolean;
  source?: {
    provider: string;
    id?: string;
    url?: string;
  };
  readOnly?: boolean;
  email?: string;
  slackDirectMessageUrl?: string;
  ownedServices?: Service[];
  ownedEvents?: Event[];
  ownedCommands?: Command[];
  associatedTeams?: Team[];
  markdown: string;
}

export interface Badge {
  content: string;
  backgroundColor: string;
  textColor: string;
  icon?: string;
  url?: string;
}

export interface Changelog {
  createdAt: Date | string;
  badges?: Badge[];
  markdown: string;
}

export interface UbiquitousLanguage {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  icon?: string;
}

export interface UbiquitousLanguageDictionary {
  dictionary: UbiquitousLanguage[];
}

interface DetailPanelProperty {
  visible: boolean;
}

export interface Entity extends BaseSchema {
  aggregateRoot?: boolean;
  identifier?: string;
  properties?: {
    name: string;
    type: string;
    required?: boolean;
    description?: string;
    references?: string;
    referencesIdentifier?: string;
    relationType?: string;
  }[];
  detailsPanel?: {
    domains?: DetailPanelProperty;
    services?: DetailPanelProperty;
    messages?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
  };
}

export interface Diagram extends BaseSchema {
  detailsPanel?: {
    versions?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
    attachments?: DetailPanelProperty;
  };
}

export type AdrStatus = 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded';

export type AdrPointer = {
  id: string;
  version?: string;
};

export type AdrResourcePointer = AdrPointer & {
  type:
    | 'agent'
    | 'service'
    | 'event'
    | 'command'
    | 'query'
    | 'flow'
    | 'channel'
    | 'domain'
    | 'system'
    | 'user'
    | 'team'
    | 'container'
    | 'entity'
    | 'diagram'
    | 'data-product';
};

export interface Adr extends BaseSchema {
  status: AdrStatus;
  date: Date | string;
  decisionMakers?: string[];
  appliesTo?: AdrResourcePointer[];
  supersedes?: AdrPointer[];
  supersededBy?: AdrPointer[];
  amends?: AdrPointer[];
  amendedBy?: AdrPointer[];
  related?: AdrPointer[];
  detailsPanel?: {
    status?: DetailPanelProperty;
    date?: DetailPanelProperty;
    decisionMakers?: DetailPanelProperty;
    appliesTo?: DetailPanelProperty;
    relationships?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
  };
}

export type DataProductOutputPointer = {
  id: string;
  version?: string;
  contract?: {
    path: string;
    name: string;
    type?: string;
  };
};

export interface DataProduct extends BaseSchema {
  inputs?: ResourcePointer[];
  outputs?: DataProductOutputPointer[];
  detailsPanel?: {
    domains?: DetailPanelProperty;
    inputs?: DetailPanelProperty;
    outputs?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
    flows?: DetailPanelProperty;
  };
}

enum DataClassification {
  Public = 'public',
  Internal = 'internal',
  Confidential = 'confidential',
  Regulated = 'regulated',
}

export interface FlowStep {
  id: string | number;
  type?: 'node' | 'message' | 'agent' | 'user' | 'actor';
  title: string;
  summary?: string;
  message?: ResourcePointer;
  agent?: ResourcePointer;
  service?: ResourcePointer;
  flow?: ResourcePointer;
  container?: ResourcePointer;
  dataProduct?: ResourcePointer;
  actor?: {
    name: string;
    summary?: string;
  };
  custom?: {
    title: string;
    icon?: string;
    type?: string;
    summary?: string;
    url?: string;
    color?: string;
    properties?: Record<string, string | number>;
    height?: number;
    menu?: { label: string; url?: string }[];
  };
  externalSystem?: {
    name: string;
    summary?: string;
    url?: string;
  };
  next_step?: string | number | { id: string | number; label?: string };
  next_steps?: (string | number | { id: string | number; label?: string })[];
}

export interface Flow extends BaseSchema {
  steps: FlowStep[];
  detailsPanel?: {
    owners?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
  };
}

export interface Container extends BaseSchema {
  container_type: 'database' | 'cache' | 'objectStore' | 'searchIndex' | 'dataWarehouse' | 'dataLake' | 'externalSaaS' | 'other';
  technology?: string;
  authoritative?: boolean;
  access_mode?: string;
  classification?: DataClassification;
  residency?: string;
  retention?: string;
  detailsPanel?: {
    versions?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
  };
}

export type EventCatalog = {
  version: string;
  catalogVersion: string;
  createdAt: string;
  resources: {
    domains?: ExportedResource<Domain>[];
    systems?: ExportedResource<System>[];
    services?: ExportedResource<Service>[];
    agents?: ExportedResource<Agent>[];
    messages?: {
      events?: ExportedResource<Event>[];
      queries?: ExportedResource<Query>[];
      commands?: ExportedResource<Command>[];
    };
    teams?: ExportedResource<Team>[];
    users?: ExportedResource<User>[];
    channels?: ExportedResource<Channel>[];
    entities?: ExportedResource<Entity>[];
    containers?: ExportedResource<Container>[];
    flows?: ExportedResource<Flow>[];
    adrs?: ExportedResource<Adr>[];
    customDocs?: ExportedResource<CustomDoc>[];
  };
};
