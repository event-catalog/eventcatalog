import {
  BoltIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  ServerIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import type { CollectionMessageTypes, CollectionTypes } from '@types';

export const getCollectionStyles = (collection: CollectionMessageTypes | CollectionTypes) => {
  switch (collection) {
    case 'events':
      return { color: 'orange', Icon: BoltIcon };
    case 'commands':
      return { color: 'blue', Icon: ChatBubbleLeftIcon };
    case 'queries':
      return { color: 'green', Icon: MagnifyingGlassIcon };
    case 'services':
      return { color: 'pink', Icon: ServerIcon };
    case 'data-products':
      return { color: 'purple', Icon: DocumentCheckIcon };
    default:
      return { color: 'gray', Icon: EnvelopeIcon };
  }
};
