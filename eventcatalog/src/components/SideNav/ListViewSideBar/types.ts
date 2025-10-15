export interface MessageItem {
  href: string;
  label: string;
  service: string;
  id: string;
  direction: 'sends' | 'receives';
  type: 'command' | 'query' | 'event';
  collection: string;
  data: {
    name: string;
  };
}

export interface EntityItem {
  href: string;
  label: string;
  id: string;
  name: string;
}

export interface ServiceItem {
  href: string;
  label: string;
  name: string;
  id: string;
  version: string;
  sidebar?: {
    badge?: string;
    color?: string;
    backgroundColor?: string;
  };
  draft: boolean | { title?: string; message: string };
  sends: MessageItem[];
  receives: MessageItem[];
  entities: EntityItem[];
  writesTo: MessageItem[];
  readsFrom: MessageItem[];
  specifications?: {
    type: string;
    path: string;
    name?: string;
    filename?: string;
    filenameWithoutExtension?: string;
  }[];
}

export interface DomainItem {
  href: string;
  label: string;
  id: string;
  name: string;
  services: any[];
  domains: any[];
  entities: EntityItem[];
}

export interface FlowItem {
  href: string;
  label: string;
}

export interface DesignItem {
  href: string;
  label: string;
  id: string;
  name: string;
}

export interface Resources {
  'context-map'?: Array<{
    href: string;
    label: string;
    id: string;
    name: string;
  }>;
  domains?: DomainItem[];
  services?: ServiceItem[];
  flows?: FlowItem[];
  designs?: DesignItem[];
  messagesNotInService?: MessageItem[];
  commands?: MessageItem[];
  queries?: MessageItem[];
  events?: MessageItem[];
  containers?: MessageItem[];
}

export interface ListViewSideBarProps {
  resources: Resources;
  currentPath: string;
  showOrphanedMessages: boolean;
}
