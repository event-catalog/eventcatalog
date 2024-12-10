import React, { useState, useEffect, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import './styles.css';
import { getIconForCollection as getIconForCollectionOriginal } from '@utils/collections/icons';

const STORAGE_KEY = 'EventCatalog:catalogSidebarCollapsedGroups';

interface CatalogResourcesSideBarProps {
  resources: any;
  currentPath: string;
}

const CatalogResourcesSideBar: React.FC<CatalogResourcesSideBarProps> = ({ resources, currentPath }) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const [data, setData] = useState(resources);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setIsInitialized(true);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const decodedCurrentPath = decodeURIComponent(currentPath);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedGroups));
    }
  }, [collapsedGroups]);

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

  const getIconForCollection = useMemo(() => getIconForCollectionOriginal, []);

  if (!isInitialized) return null;

  return (
    <nav className="space-y-6 text-black ">
      <div className="space-y-2">
        <div className="mb-4 px-1">
          <input
            type="text"
            placeholder="Filter catalog..."
            className="w-full font-light px-3 py-1 text-sm text-gray-600 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            onChange={debouncedHandleSearch}
          />
        </div>

        {Object.keys(filteredData).length === 0 ? (
          <div className="px-2 text-gray-400 dark:text-gray-200 text-sm">No results found</div>
        ) : (
          Object.keys(filteredData).map((key) => {
            const collection = filteredData[key];
            if (collection[0] && collection[0].visible === false) return null;
            const isCollapsed = collapsedGroups[key];

            return (
              <ul className="w-full space-y-1.5 pb-2 pl-1 text-black" key={key}>
                <li
                  className="font capitalize cursor-pointer flex items-center ml-1 text-[14px]"
                  onClick={() => toggleGroupCollapse(key)}
                >
                  <span className="">{`${key} (${collection.length})`}</span>
                  <span className="ml-2 block">
                    {isCollapsed ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronUpIcon className="w-3 h-3" />}
                  </span>
                </li>
                {!isCollapsed &&
                  collection.map((item: any) => {
                    const Icon = getIconForCollection(item.collection);
                    return (
                      <li
                        className={`w-full has-tooltip text-md xl:text-sm space-y-2 scroll-m-20 rounded-md text-black hover:bg-gradient-to-l hover:from-purple-500 hover:to-purple-700 hover:text-white    ${decodedCurrentPath.includes(item.href) ? ' bg-gradient-to-l from-purple-500 to-purple-700  font-normal text-white ' : 'font-thin'}`}
                        id={item.href}
                        key={item.href}
                      >
                        <a className={`flex px-1 justify-start items-center w-full rounded-md  `} href={`${item.href}`}>
                          <Icon className="w-3 mr-2" />
                          <span className="block truncate  !whitespace-normal">{item.label}</span>
                          {/* {item.label.length > 2 && (
                            <span className="tooltip rounded relative shadow-lg p-1 font-normal text-xs bg-white  text-black ml-[30px] mt-12">
                              {item.label}
                            </span>
                          )} */}
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
