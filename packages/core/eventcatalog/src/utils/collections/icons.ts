import {
  ServerIcon,
  RectangleGroupIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  QueueListIcon,
  UserGroupIcon,
  UserIcon,
  ArrowsRightLeftIcon,
  VariableIcon,
  MapIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { BookText, Box, DatabaseIcon } from 'lucide-react';
import { getColorForCollection } from '@utils/collection-colors';

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
    case 'channels':
      return ArrowsRightLeftIcon;
    case 'channels-parameter':
      return VariableIcon;
    case 'ubiquitousLanguages':
      return BookText;
    case 'bounded-context-map':
      return MapIcon;
    case 'entities':
      return Box;
    case 'containers':
      return DatabaseIcon;
    case 'data-products':
      return CubeIcon;
    default:
      return ServerIcon;
  }
};

export const getColorAndIconForCollection = (collection: string) => {
  const icon = getIconForCollection(collection);
  return { color: getColorForCollection(collection), Icon: icon };
};
