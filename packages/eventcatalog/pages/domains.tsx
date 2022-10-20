import Head from 'next/head';
import { Domain } from '@eventcatalog/types';

import { useState, useCallback, useEffect } from 'react';
import debounce from 'lodash.debounce';
import { SearchIcon } from '@heroicons/react/outline';
import DomainGrid from '@/components/Grids/DomainGrid';
import { useConfig } from '@/hooks/EventCatalog';
import { getAllDomains } from '@/lib/domains';

export interface PageProps {
  domains: Domain[];
}

export default function Page({ domains }: PageProps) {
  const [domainsToRender, setDomainsToRender] = useState(domains);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({ badges: [] });

  const filters = [
    {
      id: 'badges',
      name: `Filter by Badges`,
      options: domains.reduce((p, c) => {
        if (!c.badges) {
          return p;
        }
        c.badges.forEach((badge) => {
          const existing = p.map((b) => b.value);
          if (!existing.includes(badge.content)) {
            p.push({
              value: badge.content,
              label: badge.content,
              checked: false,
            });
          }
        });
        return p;
      }, [] as { value: string; label: string; checked: boolean }[]),
    },
  ];

  const handleFilterSelection = (option, type, event) => {
    console.log(option, type, event);

    if (event.target.checked) {
      const newFilters = selectedFilters[type].concat([option.value]);
      setSelectedFilters({ ...selectedFilters, [type]: newFilters });
    } else {
      const newFilters = selectedFilters[type].filter((value) => value !== option.value);
      setSelectedFilters({ ...selectedFilters, [type]: newFilters });
    }
  };

  const getFilteredDomains = (): any => {
    let filteredDomains = domains;

    if (!selectedFilters.badges && !searchFilter) return domains;

    if (searchFilter) {
      filteredDomains = filteredDomains.filter((service) => service.name.toLowerCase().includes(searchFilter.toLowerCase()));
    }

    if (selectedFilters.badges.length > 0) {
      const { badges: badgeFilters } = selectedFilters;
      // @ts-ignore
      filteredDomains = filteredDomains.filter((event) => {
        if (!event.badges) {
          return false;
        }
        return event.badges.filter((badge) => badgeFilters.includes(badge.content)).length !== 0;
      });
    }

    return filteredDomains;
  };

  useEffect(() => {
    setDomainsToRender(getFilteredDomains());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilters, searchFilter]);

  const debouncedFilter = useCallback(
    debounce((e) => {
      setSearchFilter(e.target.value);
    }, 500),
    [domainsToRender]
  );

  const filtersApplied = !!searchFilter || selectedFilters.badges.length > 0;
  const { title } = useConfig();

  return (
    <>
      <Head>
        <title>{title} - All Domains</title>
      </Head>
      <main className="max-w-7xl mx-auto md:min-h-screen px-4 xl:px-0">
        <div className="relative z-10 flex items-baseline justify-between pt-8 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Domains ({domains.length})</h1>
        </div>

        <section className="pt-6 pb-24">
          <div className="grid grid-cols-4 gap-x-8 gap-y-10">
            {/* Filters */}
            <form className="hidden lg:block">
              <div className="border-b border-gray-200 pb-6">
                <label htmlFor="domain" className="font-bold block text-sm font-medium text-gray-700">
                  Search Domains
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    name="domain"
                    id="domain"
                    onChange={debouncedFilter}
                    className="focus:ring-gray-500 focus:border-gray-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {filters.map((section: any) => {
                if (!section.options.length) return null;
                return (
                  <div key={section.id} className="border-b border-gray-200 py-6">
                    <h3 className="-my-3 flow-root">
                      <div className="py-3 bg-white w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-500">
                        <span className="font-bold font-medium text-gray-900">
                          {section.name} ({section.options.length})
                        </span>
                      </div>
                    </h3>
                    <div className="pt-6">
                      <div className="space-y-4">
                        {section.options.map((option, optionIdx) => (
                          <div key={option.value} className="flex items-center">
                            <input
                              id={`filter-${section.id}-${optionIdx}`}
                              name={`${section.id}[]`}
                              defaultValue={option.value}
                              type="checkbox"
                              onChange={(event) => handleFilterSelection(option, section.id, event)}
                              defaultChecked={option.checked}
                              className="h-4 w-4 border-gray-300 rounded text-gray-600 focus:ring-gray-500"
                            />
                            <label htmlFor={`filter-${section.id}-${optionIdx}`} className="ml-3 text-sm text-gray-600">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </form>

            <div className="col-span-4 lg:col-span-3">
              <div>
                <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                  {filtersApplied
                    ? `Filtered Domains (${domainsToRender.length}/${domains.length})`
                    : `All Domains (${domains.length})`}
                </h2>
                <DomainGrid domains={domainsToRender} />
                {domainsToRender.length === 0 && (
                  <div className="text-gray-400 flex h-96  justify-center items-center">
                    <div>
                      <SearchIcon className="w-6 h-6 inline-block mr-1" />
                      No domains found.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export async function getStaticProps() {
  const allDomains = await getAllDomains();
  const domains = allDomains.map((item) => item.domain);

  return {
    props: {
      domains,
    },
  };
}
