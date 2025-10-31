import { BoltIcon, ChatBubbleLeftIcon, MagnifyingGlassIcon, EnvelopeIcon, ServerIcon } from '@heroicons/react/24/outline';
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
    default:
      return { color: 'gray', Icon: EnvelopeIcon };
  }
};

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  totalResults?: number;
  totalItems?: number;
}

export interface TypeFilterProps {
  selectedTypes: CollectionMessageTypes[];
  onTypeChange: (types: CollectionMessageTypes[]) => void;
  filteredCount?: number;
  totalCount?: number;
}
