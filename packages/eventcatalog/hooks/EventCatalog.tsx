import React, { useContext, ReactNode } from 'react';
import type { EventCataLogConfig, User } from '@eventcatalogtest/types';
import path from 'path';
import defaultConfig from '../eventcatalog.config';

export const Context = React.createContext<EventCataLogConfig | null>(defaultConfig);

export function EventCatalogContextProvider({ children }: { children: ReactNode }): JSX.Element {
  return <Context.Provider value={defaultConfig}>{children}</Context.Provider>;
}

export const useConfig = () => useContext<EventCataLogConfig>(Context);

export const useUser = () => {
  const config = useConfig();

  const getUserById = (id): User => {
    const users = config.users || [];
    return users.find((user) => user.id === id);
  };

  return {
    getUserById,
  };
};

export const useUrl = () => {
  const config = useConfig();

  const getEditUrl = (url: string) => path.join(config.editUrl, url);

  return {
    getEditUrl,
  };
};
