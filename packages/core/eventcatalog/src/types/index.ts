export type CollectionTypes =
  | 'agents'
  | 'adrs'
  | 'commands'
  | 'events'
  | 'queries'
  | 'domains'
  | 'services'
  | 'flows'
  | 'channels'
  | 'entities'
  | 'containers'
  | 'diagrams'
  | 'data-products';
export type CollectionMessageTypes = 'commands' | 'events' | 'queries';
export type CollectionUserTypes = 'users' | 'teams';
export type PageTypes =
  | 'agents'
  | 'adrs'
  | 'events'
  | 'commands'
  | 'queries'
  | 'services'
  | 'domains'
  | 'channels'
  | 'flows'
  | 'entities'
  | 'containers'
  | 'diagrams'
  | 'data-products';

export type TableConfiguration = {
  columns: {
    [key: string]: {
      label?: string;
      visible?: boolean;
    };
  };
};
