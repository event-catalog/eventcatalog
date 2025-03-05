import { useState, useMemo, useEffect } from 'react';
import { EnvelopeIcon, MagnifyingGlassIcon, ChevronRightIcon, ServerIcon, BoltIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';
import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';

const getCollectionStyles = (collection: CollectionMessageTypes) => {
    switch (collection) {
        case 'events':
            return { color: 'orange', Icon: BoltIcon };
        case 'commands':
            return { color: 'blue', Icon: ChatBubbleLeftIcon };
        case 'queries':
            return { color: 'green', Icon: MagnifyingGlassIcon };
        default:
            return { color: 'gray', Icon: EnvelopeIcon };
    }
};

interface MessageGridProps {
    messages: CollectionEntry<CollectionMessageTypes>[];
}

interface GroupedMessages {
    all?: CollectionEntry<CollectionMessageTypes>[];
    sends?: CollectionEntry<CollectionMessageTypes>[];
    receives?: CollectionEntry<CollectionMessageTypes>[];
}

export default function MessageGrid({ messages }: MessageGridProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [urlParams, setUrlParams] = useState<{ serviceId?: string; serviceName?: string; domainId?: string; domainName?: string } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTypes, setSelectedTypes] = useState<CollectionMessageTypes[]>([]);
    const ITEMS_PER_PAGE = 15;

    // Effect to sync URL params with state
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const serviceId = params.get('serviceId') || undefined;
        const serviceName = params.get('serviceName') ? decodeURIComponent(params.get('serviceName')!) : undefined;
        const domainId = params.get('domainId') || undefined;
        const domainName = params.get('domainName') || undefined;
        setUrlParams({
            serviceId,
            serviceName,
            domainId,
            domainName
        });
    }, []);

    const filteredAndSortedMessages = useMemo(() => {
        if (urlParams === null) return [];

        let result = [...messages];

        // Filter by message type
        if (selectedTypes.length > 0) {
            result = result.filter(message => selectedTypes.includes(message.collection));
        }

        // Filter by service ID or name if present
        if (urlParams.serviceId) {
            result = result.filter(message => {
                return message.data.producers?.some((producer: any) => producer.data.id === urlParams.serviceId && !producer.id.includes('/versioned/')) ||
                    message.data.consumers?.some((consumer: any) => consumer.data.id === urlParams.serviceId && !consumer.id.includes('/versioned/'))
            });
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(message =>
                message.data.name?.toLowerCase().includes(query) ||
                message.data.summary?.toLowerCase().includes(query) ||
                message.data.producers?.some((producer: any) => producer.data.id?.toLowerCase().includes(query)) ||
                message.data.consumers?.some((consumer: any) => consumer.data.id?.toLowerCase().includes(query))
            );
        }

        // Sort by name by default
        result.sort((a, b) => a.data.name.localeCompare(b.data.name));

        return result;
    }, [messages, searchQuery, urlParams, selectedTypes]);

    // Add pagination calculation
    const paginatedMessages = useMemo(() => {
        if (urlParams?.serviceId || urlParams?.domainId) {
            return filteredAndSortedMessages;
        }

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedMessages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAndSortedMessages, currentPage, urlParams]);

    const totalPages = useMemo(() => {
        if (urlParams?.serviceId || urlParams?.domainId) return 1;
        return Math.ceil(filteredAndSortedMessages.length / ITEMS_PER_PAGE);
    }, [filteredAndSortedMessages.length, urlParams]);

    // Reset pagination when search query or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedTypes]);

    // Group messages by sends/receives when a service is selected
    const groupedMessages = useMemo<GroupedMessages>(() => {
        if (!urlParams?.serviceId) return { all: filteredAndSortedMessages };

        const serviceIdentifier = urlParams.serviceId;
        const sends = filteredAndSortedMessages.filter(message =>
            message.data.producers?.some((producer: any) => producer.data.id === serviceIdentifier)
        );
        const receives = filteredAndSortedMessages.filter(message =>
            message.data.consumers?.some((consumer: any) => consumer.data.id === serviceIdentifier)
        );

        return { sends, receives };
    }, [filteredAndSortedMessages, urlParams]);

    const renderTypeFilters = () => {
        const types: CollectionMessageTypes[] = ['events', 'commands', 'queries'];

        return (
            <div className="flex items-center gap-2">
                {types.map(type => {
                    const { color, Icon } = getCollectionStyles(type);
                    const isSelected = selectedTypes.includes(type);
                    return (
                        <button
                            key={type}
                            onClick={() => {
                                setSelectedTypes(prev =>
                                    prev.includes(type)
                                        ? prev.filter(t => t !== type)
                                        : [...prev, type]
                                );
                            }}
                            className={`
                                inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                                transition-colors duration-200
                                ${isSelected
                                    ? `bg-${color}-100 text-${color}-700 ring-2 ring-${color}-500`
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }
                            `}
                        >
                            <Icon className={`h-4 w-4 ${isSelected ? `text-${color}-500` : 'text-gray-400'}`} />
                            <span className="capitalize">{type}</span>
                            {isSelected && (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-${color}-50 text-${color}-700 rounded-full`}>
                                    {filteredAndSortedMessages.filter(m => m.collection === type).length}
                                </span>
                            )}
                        </button>
                    );
                })}
                {selectedTypes.length > 0 && (
                    <button
                        onClick={() => setSelectedTypes([])}
                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                    >
                        Clear filters
                    </button>
                )}
            </div>
        );
    };

    const renderMessageGrid = (messages: CollectionEntry<CollectionMessageTypes>[]) => (
        <div className={`grid ${urlParams?.serviceName ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'} gap-6`}>
            {messages.map((message) => {
                const { color, Icon } = getCollectionStyles(message.collection);
                const hasProducers = message.data.producers && message.data.producers.length > 0;
                const hasConsumers = message.data.consumers && message.data.consumers.length > 0;
                return (
                    <a
                        key={message.data.name}
                        href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
                        className={`group bg-white border hover:bg-${color}-100  rounded-lg shadow-sm  hover:shadow-lg transition-all duration-200 overflow-hidden border-${color}-500 `}
                    >
                        <div className="p-4 flex-1">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className={`h-5 w-5 text-${color}-500`} />
                                    <h3 className={`text-md font-semibold text-gray-900 truncate group-hover:text-${color}-500 transition-colors duration-200`}>
                                        {message.data.name} (v{message.data.version})
                                    </h3>
                                </div>
                            </div>

                            {message.data.summary && (
                                <p className="text-gray-600 text-xs line-clamp-2 mb-4">
                                    {message.data.summary}
                                </p>
                            )}

                            {/* Only show stats in non-service view */}
                            {!urlParams?.serviceName && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center mb-1">
                                                <ServerIcon className={`h-5 w-5 text-pink-500`} />
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{message.data.producers?.length ?? 0}</div>
                                            <div className="text-xs text-gray-500">Producers</div>
                                        </div>
                                        <div className="text-center border-l border-gray-200">
                                            <div className="flex items-center justify-center mb-1">
                                                <ServerIcon className={`h-5 w-5 text-pink-500`} />
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{message.data.consumers?.length ?? 0}</div>
                                            <div className="text-xs text-gray-500">Consumers</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </a>
                );
            })}
        </div>
    );

    const renderPaginationControls = () => {
        if (totalPages <= 1 || urlParams?.serviceName || urlParams?.domainId) return null;

        return (
            <div className="flex items-center justify-between border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                    <button
                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div className="pr-4">
                        <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
                            <span className="font-medium">
                                {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedMessages.length)}
                            </span> of{' '}
                            <span className="font-medium">{filteredAndSortedMessages.length}</span> results
                        </p>
                    </div>
                    <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                                <span className="sr-only">First</span>
                                <ChevronDoubleLeftIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
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
                                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                                <span className="sr-only">Next</span>
                                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
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
    };

    return (
        <div>
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center space-x-2 text-sm text-gray-500">
                <a href={buildUrl('/architecture/domains')} className="hover:text-gray-700 hover:underline flex items-center gap-2">
                    <RectangleGroupIcon className="h-4 w-4" />
                    Domains
                </a>
                <ChevronRightIcon className="h-4 w-4" />
                <a href={buildUrl('/architecture/services')} className="hover:text-gray-700 hover:underline flex items-center gap-2">
                    <ServerIcon className="h-4 w-4" />
                    Services
                </a>
                <ChevronRightIcon className="h-4 w-4" />
                <a href={buildUrl('/architecture/messages')} className="hover:text-gray-700 hover:underline flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4" />
                    Messages
                </a>
                {urlParams?.domainId && (
                    <>
                        <ChevronRightIcon className="h-4 w-4" />
                        <a
                            href={buildUrlWithParams(`/architecture/services`, {
                                domainName: urlParams.domainName,
                                domainId: urlParams.domainId,
                                serviceName: urlParams.serviceName,
                                serviceId: urlParams.serviceId
                            })}
                            className="hover:text-gray-700 hover:underline"
                        >
                            {urlParams.domainId}
                        </a>
                    </>
                )}
                {urlParams?.serviceName && (
                    <>
                        <ChevronRightIcon className="h-4 w-4" />
                        <span className="text-gray-900">{urlParams.serviceName}</span>
                    </>
                )}
            </nav>

            {/* Title Section */}
            <div className="relative border-b border-gray-200 mb-4 pb-4">
                <div className="md:flex md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 max-w-lg">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                                {urlParams?.domainName ? `Messages in ${urlParams.serviceName}` : 'All Messages'}
                            </h1>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                            {urlParams?.domainName
                                ? `Browse messages in the ${urlParams.serviceName} service`
                                : 'Browse and discover messages in your event-driven architecture'}
                        </p>
                    </div>

                    <div className="mt-6 md:mt-0 md:ml-4 flex-shrink-0 w-full md:w-96">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search messages by name, summary, or services..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                            />
                            {searchQuery && (
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        <span className="sr-only">Clear search</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                        {searchQuery && (
                            <div className="mt-2 text-sm text-gray-500 flex items-center justify-between">
                                <span>
                                    Found <span className="font-medium text-gray-900">{filteredAndSortedMessages.length}</span> of <span className="font-medium text-gray-900">{messages.length}</span>
                                </span>
                                <span className="text-gray-400 text-xs">
                                    ESC to clear
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-8">
                {/* Results count and top pagination */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {renderTypeFilters()}
                    {renderPaginationControls()}
                </div>
            </div>

            {filteredAndSortedMessages.length > 0 && (
                <div className={`rounded-xl overflow-hidden ${urlParams?.domainId ? 'bg-yellow-50 p-8 border-2 border-yellow-300' : ''}`}>
                    {urlParams?.domainName && (
                        <>
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <RectangleGroupIcon className="h-5 w-5 text-yellow-500" />
                                    <a href={buildUrlWithParams(`/architecture/services`, {
                                        domainName: urlParams.domainName,
                                        domainId: urlParams.domainId,
                                    })} className="text-2xl font-semibold text-gray-900 hover:underline">{urlParams.domainName}</a>
                                </div>
                                <div className="flex gap-2">
                                    <a
                                        href={buildUrl(`/visualiser/domains/${urlParams.domainId}`)}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md transition-colors duration-200"
                                    >
                                        View in visualizer
                                    </a>
                                    <a
                                        href={buildUrl(`/docs/domains/${urlParams.domainId}`)}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-black border border-gray-300 bg-white  rounded-md transition-colors duration-200"
                                    >
                                        Read documentation
                                    </a>
                                </div>
                            </div>
                        </>
                    )}

                    <div className={`rounded-xl overflow-hidden ${urlParams?.serviceName ? 'bg-pink-50 p-8 border-2 border-dashed border-pink-300' : ''}`}>
                        {urlParams?.serviceName ? (
                            <>
                                {/* <div className="h-2 bg-pink-500 -mx-8 -mt-8 mb-8"></div> */}
                                {/* Service Title */}
                                <div className="flex items-center gap-2 mb-8">
                                    <ServerIcon className="h-6 w-6 text-pink-500" />
                                    <h2 className="text-2xl font-semibold text-gray-900">{urlParams.serviceName}</h2>
                                    <div className="flex gap-2 ml-auto">
                                        <a
                                            href={buildUrl(`/visualiser/services/${urlParams.serviceId}`)}
                                            className="inline-flex items-center px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md transition-colors duration-200 hover:bg-gray-50"
                                        >
                                            View in visualizer
                                        </a>
                                        <a
                                            href={buildUrl(`/docs/services/${urlParams.serviceId}`)}
                                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-black border border-gray-300 bg-white rounded-md transition-colors duration-200 hover:bg-gray-50"
                                        >
                                            Read documentation
                                        </a>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-8 relative">
                                    {/* Receives Section */}
                                    <div className="bg-blue-50 bg-opacity-50 border border-blue-300 border-dashed rounded-lg p-4">
                                        <div className="mb-6">
                                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                                <ServerIcon className="h-5 w-5 text-blue-500" />
                                                Receives messages ({groupedMessages.receives?.length || 0})
                                            </h2>
                                        </div>
                                        {groupedMessages.receives && groupedMessages.receives.length > 0 ? (
                                            renderMessageGrid(groupedMessages.receives)
                                        ) : (
                                            <div className="text-center py-12">
                                                <p className="text-gray-500">No messages received</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Arrow from Receives to Service */}
                                    <div className="absolute left-[30%] top-1/2 -translate-y-1/2 flex items-center justify-center w-16">
                                        <div className="w-full h-[3px] bg-blue-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
                                        <div className="absolute right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-blue-200 transform rotate-45 translate-x-1 translate-y-[-1px] shadow-[1px_-1px_0_1px_rgba(0,0,0,0.1)]"></div>
                                    </div>

                                    {/* Service Information */}
                                    <div className="bg-white border-2 border-pink-100 rounded-lg p-3 flex items-center justify-center min-h-[80px]">
                                        <div className="flex flex-col items-center gap-2">
                                            <ServerIcon className="h-10 w-10 text-pink-500" />
                                            <p className="text-lg font-medium text-gray-900">{urlParams.serviceName}</p>
                                        </div>
                                    </div>

                                    {/* Arrow from Service to Sends */}
                                    <div className="absolute right-[30%] top-1/2 -translate-y-1/2 flex items-center justify-center w-16">
                                        <div className="w-full h-[3px] bg-green-200 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"></div>
                                        <div className="absolute right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-green-200 transform rotate-45 translate-x-1 translate-y-[-1px] shadow-[1px_-1px_0_1px_rgba(0,0,0,0.1)]"></div>
                                    </div>

                                    {/* Sends Section */}
                                    <div className="bg-green-50  border border-green-300 border-dashed rounded-lg p-4">
                                        <div className="mb-6">
                                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                                <ServerIcon className="h-5 w-5 text-emerald-500" />
                                                Sends messages ({groupedMessages.sends?.length || 0})
                                            </h2>
                                        </div>
                                        {groupedMessages.sends && groupedMessages.sends.length > 0 ? (
                                            renderMessageGrid(groupedMessages.sends)
                                        ) : (
                                            <div className="text-center py-12">
                                                <p className="text-gray-500">No messages sent</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {renderMessageGrid(paginatedMessages)}
                                <div className="mt-8 border-t border-gray-200">
                                    {renderPaginationControls()}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {filteredAndSortedMessages.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No messages found matching your criteria</p>
                </div>
            )}
        </div>
    );
}
