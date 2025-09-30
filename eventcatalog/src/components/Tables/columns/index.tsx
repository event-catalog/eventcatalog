import { columns as MessageTableColumns } from './MessageTableColumns';
import { columns as UserTableColumns } from './UserTableColumns';
import { columns as ServiceTableColumns } from './ServiceTableColumns';
import { columns as DomainTableColumns } from './DomainTableColumns';
import { columns as FlowTableColumns } from './FlowTableColumns';
import { columns as TeamsTableColumns } from './TeamsTableColumns';
import { columns as ContainerTableColumns } from './ContainersTableColumns';
export const getColumnsByCollection = (collection: string): any => {
  switch (collection) {
    case 'events':
    case 'commands':
    case 'queries':
      return MessageTableColumns();
    case 'services':
      return ServiceTableColumns();
    case 'domains':
      return DomainTableColumns();
    case 'flows':
      return FlowTableColumns();
    case 'users':
      return UserTableColumns();
    case 'teams':
      return TeamsTableColumns();
    case 'containers':
      return ContainerTableColumns();
    default:
      return [];
  }
};
