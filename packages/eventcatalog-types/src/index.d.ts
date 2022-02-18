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
  domain?: string;
  producers?: string[] | [];
  consumers?: string[] | [];
  historicVersions?: string[];
  owners?: Owner[] | string[] | [];
  examples?: any;
  schema?: any;
  externalLinks?: Tag[];
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
  name: string;
  summary: string;
  repository?: Repository;
  draft?: boolean;
  domain?: string;
  publishes?: Event[] | [];
  subscribes?: Event[] | [];
  owners?: Owner[] | string[] | [];
  tags?: Tag[];
  externalLinks?: Tag[];
}

export type PluginOpts = { id?: string } & Record<string, unknown>;

export type PluginConfig = [string, PluginOpts];

export interface Link {
  label: string;
  href: string;
}

export interface OpenGraphConfig {
  ogTitle?: string;
  ogUrl?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface EventCataLogConfig {
  title: string;
  tagline?: string;
  editUrl?: string;
  organizationName: string;
  logo?: { alt: string; src: string };
  users?: User[];
  generators?: PluginConfig[] | [] | any;
  footerLinks?: Link[];
  homepageLink?: string;
  openGraph?: OpenGraphConfig;
}

export type LoadContext = {
  eventCatalogConfig: EventCataLogConfig;
};
