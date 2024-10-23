import React, { useState, useEffect, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const CatalogResourcesSideBar = ({ resources, currentPath }: any) => {
  const [data, setData] = useState(resources);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({});

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const debouncedHandleSearch = useMemo(() => debounce(handleSearch, 300), []);

  useEffect(() => {
    return () => {
      debouncedHandleSearch.cancel();
    };
  }, [debouncedHandleSearch]);

  const toggleGroupCollapse = (group: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    const lowercasedQuery = searchQuery.toLowerCase();
    const filterCollection = (collection: any[]) =>
      collection.filter((item) => item.label.toLowerCase().includes(lowercasedQuery));

    return Object.keys(data).reduce((acc, key) => {
      const filteredCollection = filterCollection(data[key]);
      if (filteredCollection.length > 0) {
        acc[key] = filteredCollection;
      }
      return acc;
    }, {} as any);
  }, [searchQuery, data]);

  return (
    <nav className="mt-0 -mx-3 space-y-6">
      <div className="space-y-2">
        <div className="mb-4 px-1">
          <input
            type="text"
            placeholder="Filter documentation"
            className="w-full font-light px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            onChange={debouncedHandleSearch}
          />
        </div>

        {Object.keys(filteredData).length === 0 ? (
          <div className="px-2 text-gray-400 text-sm">No results found</div>
        ) : (
          Object.keys(filteredData).map((key) => {
            const collection = filteredData[key];
            if (collection[0] && collection[0].visible === false) return null;
            const isCollapsed = collapsedGroups[key];
            return (
              <ul className="w-full space-y-1.5 pb-2 pl-1" key={key}>
                <li className="font capitalize cursor-pointer flex items-center ml-1" onClick={() => toggleGroupCollapse(key)}>
                  <span className="text-purple-500">{`${key} (${collection.length})`}</span>
                  <span className="ml-2 block">
                    {isCollapsed ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronUpIcon className="w-3 h-3" />}
                  </span>
                </li>
                {!isCollapsed &&
                  collection.map((item: any) => {
                    return (
                      <li className="px-2 w-full text-md xl:text-sm space-y-2 scroll-m-20" id={item.href} key={item.href}>
                        <a
                          className={`flex justify-between items-center w-full px-2 rounded-md font-normal ${currentPath.includes(item.href) ? 'bg-primary/15 font-thin ' : 'font-thin'}`}
                          href={`${item.href}`}
                        >
                          <span className="block truncate  !whitespace-normal">{item.label}</span>
                        </a>
                      </li>
                    );
                  })}
              </ul>
            );
          })
        )}
      </div>
    </nav>
  );
};

export default CatalogResourcesSideBar;
