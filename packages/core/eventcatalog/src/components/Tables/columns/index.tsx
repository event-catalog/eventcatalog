import { columns as MessageTableColumns } from './MessageTableColumns';
import { columns as UserTableColumns } from './UserTableColumns';
import { columns as ServiceTableColumns } from './ServiceTableColumns';
import { columns as DomainTableColumns } from './DomainTableColumns';
import { columns as FlowTableColumns } from './FlowTableColumns';
import { columns as TeamsTableColumns } from './TeamsTableColumns';
import { columns as ContainerTableColumns } from './ContainersTableColumns';
import type { TableConfiguration } from '@types';
export const getColumnsByCollection = (collection: string, tableConfiguration: TableConfiguration): any => {
  switch (collection) {
    case 'events':
    case 'commands':
    case 'queries':
      return MessageTableColumns(tableConfiguration);
    case 'services':
      return ServiceTableColumns(tableConfiguration);
    case 'domains':
      return DomainTableColumns(tableConfiguration);
    case 'flows':
      return FlowTableColumns(tableConfiguration);
    case 'users':
      return UserTableColumns(tableConfiguration);
    case 'teams':
      return TeamsTableColumns(tableConfiguration);
    case 'containers':
      return ContainerTableColumns(tableConfiguration);
    default:
      return [];
  }
};
