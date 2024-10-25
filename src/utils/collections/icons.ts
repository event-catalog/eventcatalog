import {
  ServerIcon,
  RectangleGroupIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  QueueListIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export const getIconForCollection = (collection: string) => {
  switch (collection) {
    case 'domains':
      return RectangleGroupIcon;
    case 'services':
      return ServerIcon;
    case 'events':
      return BoltIcon;
    case 'commands':
      return ChatBubbleLeftIcon;
    case 'queries':
      return MagnifyingGlassIcon;
    case 'flows':
      return QueueListIcon;
    case 'teams':
      return UserGroupIcon;
    case 'users':
      return UserIcon;
    default:
      return ServerIcon;
  }
};
