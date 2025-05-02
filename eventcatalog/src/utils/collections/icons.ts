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
} from '@heroicons/react/24/outline';
import { BookText, Box } from 'lucide-react';

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
    default:
      return ServerIcon;
  }
};

export const getColorAndIconForCollection = (collection: string) => {
  const icon = getIconForCollection(collection);

  switch (collection) {
    case 'events':
      return { color: 'orange', Icon: icon };
    case 'commands':
      return { color: 'blue', Icon: icon };
    case 'queries':
      return { color: 'green', Icon: icon };
    case 'flows':
      return { color: 'teal', Icon: icon };
    case 'teams':
      return { color: 'red', Icon: icon };
    case 'users':
      return { color: 'gray', Icon: icon };
    case 'channels':
      return { color: 'purple', Icon: icon };
    case 'ubiquitousLanguages':
      return { color: 'green', Icon: icon };
    case 'entities':
      return { color: 'purple', Icon: icon };
    case 'domains':
      return { color: 'yellow', Icon: icon };
    case 'services':
      return { color: 'pink', Icon: icon };
    default:
      return { color: 'gray', Icon: icon };
  }
};
