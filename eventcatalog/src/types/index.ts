export type CollectionTypes =
  | 'commands'
  | 'events'
  | 'queries'
  | 'domains'
  | 'services'
  | 'flows'
  | 'channels'
  | 'entities'
  | 'containers';
export type CollectionMessageTypes = 'commands' | 'events' | 'queries';
export type CollectionUserTypes = 'users';
export type PageTypes =
  | 'events'
  | 'commands'
  | 'queries'
  | 'services'
  | 'domains'
  | 'channels'
  | 'flows'
  | 'entities'
  | 'containers';

export type TableConfiguration = {
  columns: {
    [key: string]: {
      label?: string;
      visible?: boolean;
    };
  };
};
