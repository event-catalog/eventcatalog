export interface Owner {
  id: string;
}

export interface User {
  id: string | number;
  name: string;
  role: string;
  summary?: string;
  avatarUrl?: string;
}

export interface Schema {
  snippet: string;
  language: string;
  extension?: string;
}

export interface Event {
  name: string;
  version: string;
  draft?: boolean;
  summary?: string;
  producers?: string[] | [];
  consumers?: string[] | [];
  historicVersions?: string[];
  owners?: Owner[] | string[] | [];
  examples?: any;
  schema?: any;
}

export interface Repository {
  url?: string;
  language?: string | string[];
}

export interface Tag {
  label: string;
  url?: string;
}

export interface Service {
  id: string;
  name: string;
  summary: string;
  repository?: Repository;
  draft?: boolean;
  publishes?: Event[] | [];
  subscribes?: Event[] | [];
  owners?: Owner[] | string[] | [];
  tags?: Tag[];
}

export type PluginOpts = { id?: string } & Record<string, unknown>;

export type PluginConfig = [string, PluginOpts];

export interface EventCataLogConfig {
  title: string;
  tagline?: string;
  url: string;
  baseUrl: string;
  editUrl?: string;
  organizationName: string;
  logo?: { alt: string; src: string };
  users?: User[];
  generators?: PluginConfig[] | [] | any;
}

export type LoadContext = {
  eventCatalogConfig: EventCataLogConfig;
};
