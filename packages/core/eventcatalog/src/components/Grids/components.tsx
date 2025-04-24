import React from 'react';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import type { CollectionMessageTypes } from '@types';
import { getCollectionStyles, type PaginationProps, type SearchBarProps, type TypeFilterProps } from './utils';

export function SearchBar({ searchQuery, onSearchChange, placeholder, totalResults, totalItems }: SearchBarProps) {
  return (
    <div className="w-full md:w-96">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          placeholder={placeholder || 'Search...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
        />
        {searchQuery && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <button onClick={() => onSearchChange('')} className="text-gray-400 hover:text-gray-500 focus:outline-none">
              <span className="sr-only">Clear search</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
      {searchQuery && totalResults !== undefined && totalItems !== undefined && (
        <div className="mt-2 text-sm text-gray-500 flex items-center justify-between">
          <span>
            Found <span className="font-medium text-gray-900">{totalResults}</span> of{' '}
            <span className="font-medium text-gray-900">{totalItems}</span>
          </span>
          <span className="text-gray-400 text-xs">ESC to clear</span>
        </div>
      )}
    </div>
  );
}

export function TypeFilters({ selectedTypes, onTypeChange, filteredCount, totalCount }: TypeFilterProps) {
  const types: CollectionMessageTypes[] = ['events', 'commands', 'queries'];

  return (
    <div className="flex items-center gap-2">
      {types.map((type) => {
        const { color, Icon } = getCollectionStyles(type);
        const isSelected = selectedTypes.includes(type);
        return (
          <button
            key={type}
            onClick={() => {
              onTypeChange(selectedTypes.includes(type) ? selectedTypes.filter((t) => t !== type) : [...selectedTypes, type]);
            }}
            className={`
                            inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                            transition-colors duration-200
                            ${
                              isSelected
                                ? `bg-${color}-100 text-${color}-700 ring-2 ring-${color}-500`
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }
                        `}
          >
            <Icon className={`h-4 w-4 ${isSelected ? `text-${color}-500` : 'text-gray-400'}`} />
            <span className="capitalize">{type}</span>
            {isSelected && filteredCount !== undefined && (
              <span
                className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-${color}-50 text-${color}-700 rounded-full`}
              >
                {filteredCount}
              </span>
            )}
          </button>
        );
      })}
      {selectedTypes.length > 0 && (
        <button onClick={() => onTypeChange([])} className="text-xs text-gray-500 hover:text-gray-700 hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="pr-4">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">First</span>
              <ChevronDoubleLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <span className="sr-only">Last</span>
              <ChevronDoubleRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
