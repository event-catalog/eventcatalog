export interface MessageItem {
  href: string;
  label: string;
  service: string;
  id: string;
  direction: 'sends' | 'receives';
  type: 'command' | 'query' | 'event';
  data: {
    name: string;
  };
}

export interface ServiceItem {
  href: string;
  label: string;
  name: string;
  id: string;
  version: string;
  sends: MessageItem[];
  receives: MessageItem[];
  specifications?: {
    asyncapiPath: string;
    openapiPath: string;
  };
}

interface DomainItem {
  href: string;
  label: string;
  id: string;
  name: string;
  services: any[];
}

interface FlowItem {
  href: string;
  label: string;
}

interface Resources {
  domains?: DomainItem[];
  services?: ServiceItem[];
  flows?: FlowItem[];
  messagesNotInService?: MessageItem[];
  commands?: MessageItem[];
  queries?: MessageItem[];
  events?: MessageItem[];
}

export interface ListViewSideBarProps {
  resources: Resources;
  currentPath: string;
}
