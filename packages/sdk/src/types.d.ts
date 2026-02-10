// Base type for all resources (domains, services and messages)
export interface BaseSchema {
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

export type SendsPointer = {
  id: string;
  version?: string;
  to?: ChannelPointer[];
};

export type ReceivesPointer = {
  id: string;
  version?: string;
  from?: ChannelPointer[];
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
  channels?: DetailPanelProperty;
  versions?: DetailPanelProperty;
  repository?: DetailPanelProperty;
}

export interface Event extends BaseSchema {
  channels?: ChannelPointer[];
  detailsPanel?: MessageDetailsPanelProperty;
}
export interface Command extends BaseSchema {
  channels?: ChannelPointer[];
  detailsPanel?: MessageDetailsPanelProperty;
}
export interface Query extends BaseSchema {
  channels?: ChannelPointer[];
  detailsPanel?: MessageDetailsPanelProperty;
}
export interface Channel extends BaseSchema {
  address?: string;
  protocols?: string[];
  routes?: ChannelPointer[];
  detailsPanel?: {
    producers?: DetailPanelProperty;
    consumers?: DetailPanelProperty;
    messages?: DetailPanelProperty;
    protocols?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
  };
  // parameters?: Record<string, Parameter>;
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
  };
}

export interface Domain extends BaseSchema {
  services?: ResourcePointer[];
  domains?: ResourcePointer[];
  entities?: ResourcePointer[];
  dataProducts?: ResourcePointer[];
  sends?: SendsPointer[];
  receives?: ReceivesPointer[];
  detailsPanel?: {
    parentDomains?: DetailPanelProperty;
    subdomains?: DetailPanelProperty;
    services?: DetailPanelProperty;
    entities?: DetailPanelProperty;
    messages?: DetailPanelProperty;
    ubiquitousLanguage?: DetailPanelProperty;
    repository?: DetailPanelProperty;
    versions?: DetailPanelProperty;
    owners?: DetailPanelProperty;
    changelog?: DetailPanelProperty;
  };
}

export interface Team {
  id: string;
  name: string;
  summary?: string;
  email?: string;
  hidden?: boolean;
  slackDirectMessageUrl?: string;
  members?: User[];
  ownedCommands?: Command[];
  ownedServices?: Service[];
  ownedEvents?: Event[];
  markdown: string;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  role?: string;
  hidden?: boolean;
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
  };
}

enum DataClassification {
  Public = 'public',
  Internal = 'internal',
  Confidential = 'confidential',
  Regulated = 'regulated',
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
    services?: ExportedResource<Service>[];
    messages?: {
      events?: ExportedResource<Event>[];
      queries?: ExportedResource<Query>[];
      commands?: ExportedResource<Command>[];
    };
    teams?: ExportedResource<Team>[];
    users?: ExportedResource<User>[];
    channels?: ExportedResource<Channel>[];
    customDocs?: ExportedResource<CustomDoc>[];
  };
};
