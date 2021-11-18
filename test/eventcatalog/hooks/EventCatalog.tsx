import React, { useContext, ReactNode } from 'react';
import config from '../eventcatalog.config';

export const Context = React.createContext<any>(config);

export function EventCatalogContextProvider({ children }: { children: ReactNode }): JSX.Element {
  return <Context.Provider value={config}>{children}</Context.Provider>;
}

export const useConfig = () => {
  return useContext<any>(Context);
};

export const useUser = () => {
  const config = useConfig();

  const getUserById = (id) => {
    const users = config.users || [];
    return users.find(user => user.id === id);
  }

  return {
    getUserById
  }

}