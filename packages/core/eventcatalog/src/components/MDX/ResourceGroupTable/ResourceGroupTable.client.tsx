import { getColorAndIconForCollection } from '@utils/collections/icons';
import { buildUrl } from '@utils/url-builder';
import { useState, useMemo, useCallback, memo } from 'react';

type Resource = {
  id: string;
  name: string;
  version: string;
  collection: string;
  type: string;
  summary?: string;
  description?: string;
  owners?: any[];
  tags?: string[];
};

type ResourceGroupTableProps = {
  resources: Resource[];
  limit?: number;
  showTags?: boolean;
  showOwners?: boolean;
  title: string;
  subtitle?: string;
  description: string;
};

type ResourceType = 'service' | 'event' | 'query' | 'command' | 'domain' | 'flow' | 'channel' | 'user' | 'team' | null;

const ResourceRow = memo(
  ({ resource, showTags, showOwners }: { resource: Resource; showTags?: boolean; showOwners?: boolean }) => {
    const { color, Icon } = getColorAndIconForCollection(resource.collection);
    const url = buildUrl(`/docs/${resource.collection}/${resource.id}/${resource.version}`);
    let type = resource.collection.slice(0, -1);
    type = type === 'querie' ? 'query' : type;

    const tags = resource.tags || [];
    const owners = resource.owners || [];

    return (
      <tr className="group hover:bg-gray-100">
        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 relative">
          <a href={url} className="absolute inset-0 z-10" aria-label={`View details for ${resource.name}`} />
          <div className="flex items-center gap-2 relative">
            <Icon className={`h-5 w-5 text-${color}-500`} />
            <span className="group-hover:text-blue-600 break-all">{resource.name}</span>
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 relative">
          <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
          <span>v{resource.version}</span>
        </td>
        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 relative">
          <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
          <span>{type}</span>
        </td>
        <td className="px-3 py-4 text-sm text-gray-500 relative">
          <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
          <span className="line-clamp-2 break-words">{resource.summary || resource.description || '-'}</span>
        </td>
        {showTags && (
          <td className="px-3 py-4 text-sm text-gray-500 relative">
            <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
            <div className="flex flex-wrap gap-1">
              {tags.length > 0
                ? tags.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                    >
                      {tag}
                    </span>
                  ))
                : '-'}
            </div>
          </td>
        )}
        {showOwners && (
          <td className="px-3 py-4 text-sm text-gray-500 relative">
            <a href={url} className="absolute inset-0 z-10" aria-hidden="true" />
            <div className="flex flex-wrap gap-1">
              {owners.length > 0
                ? owners.map((owner, index) => (
                    <span
                      key={`${owner.id || owner.name}-${index}`}
                      className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                    >
                      {owner.name || owner.id}
                    </span>
                  ))
                : '-'}
            </div>
          </td>
        )}
      </tr>
    );
  }
);

const FilterButton = memo(
  ({
    type,
    label,
    typeFilter,
    setTypeFilter,
    setCurrentPage,
    count,
  }: {
    type: ResourceType;
    label: string;
    typeFilter: ResourceType;
    setTypeFilter: (type: ResourceType) => void;
    setCurrentPage: (page: number) => void;
    count: number;
  }) => (
    <button
      onClick={() => {
        setTypeFilter(typeFilter === type ? null : type);
        setCurrentPage(1);
      }}
      className={`px-3 py-1 rounded-md text-sm font-medium ${
        typeFilter === type
          ? 'bg-black text-white border border-gray-200 hover:bg-gray-900'
          : 'bg-white text-black border border-gray-200 hover:bg-gray-100'
      }`}
    >
      {label} ({count})
    </button>
  )
);

const ResourceGroupTable = (props: ResourceGroupTableProps) => {
  const { resources = [], limit, showTags = false, showOwners = false, title, subtitle = 'Resources', description } = props;
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<ResourceType>(null);
  const itemsPerPage = limit || 10;

  const filterResources = useCallback((resources: Resource[], searchTerm: string, typeFilter: ResourceType) => {
    let filtered = resources;

    if (typeFilter) {
      filtered = filtered.filter((resource) => {
        const collectionType = resource.collection.slice(0, -1);
        const normalizedType = collectionType === 'querie' ? 'query' : collectionType;
        return normalizedType === typeFilter;
      });
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((resource) => {
        const collectionType = resource.collection.slice(0, -1);
        const normalizedType = collectionType === 'querie' ? 'query' : collectionType;

        return (
          resource.name.toLowerCase().includes(lowerSearchTerm) ||
          resource.summary?.toLowerCase().includes(lowerSearchTerm) ||
          resource.description?.toLowerCase().includes(lowerSearchTerm) ||
          normalizedType.toLowerCase().includes(lowerSearchTerm) ||
          resource.tags?.some((tag) => tag.toLowerCase().includes(lowerSearchTerm)) ||
          false
        );
      });
    }

    return filtered;
  }, []);

  const filteredResources = useMemo(
    () => filterResources(resources, searchTerm, typeFilter),
    [resources, searchTerm, typeFilter, filterResources]
  );

  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResources = useMemo(
    () => filteredResources.slice(startIndex, startIndex + itemsPerPage),
    [filteredResources, startIndex, itemsPerPage]
  );

  // Get unique resource types and their counts
  const resourceTypeCounts = useMemo(() => {
    const counts = new Map<ResourceType, number>();
    resources.forEach((resource) => {
      const collectionType = resource.collection.slice(0, -1);
      const normalizedType = (collectionType === 'querie' ? 'query' : collectionType) as ResourceType;
      counts.set(normalizedType, (counts.get(normalizedType) || 0) + 1);
    });
    return counts;
  }, [resources]);

  const availableTypes = useMemo(
    () =>
      Array.from(
        new Set(
          resources.map((resource) => {
            const collectionType = resource.collection.slice(0, -1);
            return collectionType === 'querie' ? 'query' : collectionType;
          })
        )
      ) as ResourceType[],
    [resources]
  );

  const filterButtons = useMemo(
    () =>
      availableTypes
        .filter((type): type is NonNullable<ResourceType> => type !== null)
        .map((type) => ({
          type,
          // Format the label to be capitalized and pluralized if needed
          label: type.charAt(0).toUpperCase() + type.slice(1) + (type.endsWith('s') ? '' : 's'),
          count: resourceTypeCounts.get(type) || 0,
        })),
    [availableTypes, resourceTypeCounts]
  );

  return (
    <div className="mx-auto not-prose py-4 space-y-4 my-4">
      {title && <h2 className="text-2xl font-semibold">{title}</h2>}
      <div className="flow-root bg-white border-gray-200 border p-4 pb-2 rounded-lg text-gray-900">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {subtitle} ({searchTerm || typeFilter ? `${filteredResources.length}/${resources.length}` : resources.length})
          </h2>
          <span className="text-sm text-gray-700">{description}</span>

          {/* Type filter buttons - only shown if there are filter options */}
          {filterButtons.length > 0 && (
            <div className="flex gap-2 pb-2 flex-wrap">
              {filterButtons.map((button) => (
                <FilterButton
                  key={button.type}
                  type={button.type}
                  label={button.label}
                  count={button.count}
                  typeFilter={typeFilter}
                  setTypeFilter={setTypeFilter}
                  setCurrentPage={setCurrentPage}
                />
              ))}
            </div>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              placeholder="Search by name, type, description, or tags..."
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1); // Reset to first page when clearing search
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="max-w-full overflow-hidden">
              <table className="min-w-full table-fixed divide-y divide-gray-300 rounded-sm bg-white">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className={`${showTags || showOwners ? 'w-1/5' : 'w-1/4'} py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6`}
                    >
                      Name
                    </th>
                    <th scope="col" className="w-[100px] px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Version
                    </th>
                    <th scope="col" className="w-[100px] py-3.5 pl-3.5 pr-3 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th
                      scope="col"
                      className={`${showTags && showOwners ? 'w-1/4' : showTags || showOwners ? 'w-1/3' : 'w-1/2'} px-3 py-3.5 text-left text-sm font-semibold text-gray-900`}
                    >
                      Description
                    </th>
                    {showTags && (
                      <th scope="col" className="w-1/6 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Tags
                      </th>
                    )}
                    {showOwners && (
                      <th scope="col" className="w-1/6 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Owners
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedResources.length > 0 ? (
                    paginatedResources.map((resource) => (
                      <ResourceRow
                        key={`${resource.collection}-${resource.id}-${resource.version}`}
                        resource={resource}
                        showTags={showTags}
                        showOwners={showOwners}
                      />
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={showTags && showOwners ? 6 : showTags || showOwners ? 5 : 4}
                        className="text-center py-4 text-sm text-gray-500"
                      >
                        No resources found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 -mt-2">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredResources.length)}</span> of{' '}
                  <span className="font-medium">{filteredResources.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${currentPage === 1 ? 'text-gray-300' : 'text-gray-400 hover:bg-gray-50'} ring-1 ring-inset ring-gray-300`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-400 hover:bg-gray-50'} ring-1 ring-inset ring-gray-300`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceGroupTable;
