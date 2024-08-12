import { columns as MessageTableColumns } from './MessageTableColumns';
import { columns as ServiceTableColumns } from './ServiceTableColumns';
import { columns as DomainTableColumns } from './DomainTableColumns';
import { columns as FlowTableColumns } from './FlowTableColumns';

export const getColumnsByCollection = (collection: string): any => {
  switch (collection) {
    case 'events':
    case 'commands':
      return MessageTableColumns();
    case 'services':
      return ServiceTableColumns();
    case 'domains':
      return DomainTableColumns();
    case 'flows':
      return FlowTableColumns();
    default:
      return [];
  }
};
