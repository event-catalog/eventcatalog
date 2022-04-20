import React, { useContext, ReactNode } from 'react';
import type { EventCatalogConfig, User } from '@eventcatalog/types';
import path from 'path';
import defaultConfig from '../eventcatalog.config';

export const Context = React.createContext<EventCatalogConfig | null>(defaultConfig);

export function EventCatalogContextProvider({ children }: { children: ReactNode }): JSX.Element {
  return <Context.Provider value={defaultConfig}>{children}</Context.Provider>;
}

export const useConfig = () => useContext<EventCatalogConfig>(Context);

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
  const getEditUrl = (url: string) => {
    const editBaseUrl = new URL(config.editUrl);

    editBaseUrl.pathname = path.join(editBaseUrl.pathname, url);

    return editBaseUrl.toString();
  };

  return {
    getEditUrl,
    hasEditUrl: !!config.editUrl,
  };
};
