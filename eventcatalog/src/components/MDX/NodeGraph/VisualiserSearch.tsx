import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Node } from '@xyflow/react';

// Define interfaces for different node data structures
interface MessageData {
  name: string;
  version?: string;
}

interface ServiceData {
  name: string;
  version?: string;
}

interface DomainData {
  name: string;
  version?: string;
}

interface EntityData {
  name: string;
  version?: string;
}

interface NodeDataContent extends Record<string, unknown> {
  message?: {
    data: MessageData;
  };
  service?: {
    data: ServiceData;
  };
  domain?: {
    data: DomainData;
  };
  entity?: {
    data: EntityData;
  };
  name?: string;
  version?: string;
}

// Extend the Node type with our custom data structure
type CustomNode = Node<NodeDataContent>;

interface VisualiserSearchProps {
  nodes: CustomNode[];
  onNodeSelect: (node: CustomNode) => void;
  onClear: () => void;
  onPaneClick?: () => void;
}

export interface VisualiserSearchRef {
  hideSuggestions: () => void;
}

const VisualiserSearch = forwardRef<VisualiserSearchRef, VisualiserSearchProps>(
  ({ nodes, onNodeSelect, onClear, onPaneClick }, ref) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredSuggestions, setFilteredSuggestions] = useState<CustomNode[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const hideSuggestions = useCallback(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        hideSuggestions,
      }),
      [hideSuggestions]
    );

    const getNodeDisplayName = useCallback((node: CustomNode) => {
      const name =
        node.data?.message?.data?.name ||
        node.data?.service?.data?.name ||
        node.data?.domain?.data?.name ||
        node.data?.entity?.data?.name ||
        node.data?.name ||
        node.id;
      const version =
        node.data?.message?.data?.version ||
        node.data?.service?.data?.version ||
        node.data?.domain?.data?.version ||
        node.data?.entity?.data?.version ||
        node.data?.version;
      return version ? `${name} (v${version})` : name;
    }, []);

    const getNodeTypeColorClass = useCallback((nodeType: string) => {
      const colorClasses: { [key: string]: string } = {
        events: 'bg-orange-600 text-white',
        services: 'bg-pink-600 text-white',
        flows: 'bg-teal-600 text-white',
        commands: 'bg-blue-600 text-white',
        queries: 'bg-green-600 text-white',
        channels: 'bg-gray-600 text-white',
        domains: 'bg-yellow-500 text-white',
        externalSystem: 'bg-pink-600 text-white',
        actor: 'bg-yellow-500 text-white',
        step: 'bg-gray-700 text-white',
        user: 'bg-yellow-500 text-white',
        custom: 'bg-gray-500 text-white',
      };
      return colorClasses[nodeType] || 'bg-gray-100 text-gray-700';
    }, []);

    const handleSearchChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value;
        setSearchQuery(query);

        if (query.length > 0) {
          const filtered = nodes.filter((node) => {
            const nodeName = getNodeDisplayName(node);
            return nodeName.toLowerCase().includes(query.toLowerCase());
          });
          setFilteredSuggestions(filtered);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(-1);
        } else {
          setFilteredSuggestions(nodes);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(-1);
        }
      },
      [nodes, getNodeDisplayName]
    );

    const handleSearchFocus = useCallback(() => {
      if (searchQuery.length === 0) {
        setFilteredSuggestions(nodes);
      }
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    }, [nodes, searchQuery]);

    const handleSuggestionClick = useCallback(
      (node: CustomNode) => {
        setSearchQuery(getNodeDisplayName(node));
        setShowSuggestions(false);
        onNodeSelect(node);
      },
      [onNodeSelect, getNodeDisplayName]
    );

    const handleSearchKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || filteredSuggestions.length === 0) return;

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            setSelectedSuggestionIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
            break;
          case 'ArrowUp':
            event.preventDefault();
            setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
            break;
          case 'Enter':
            event.preventDefault();
            if (selectedSuggestionIndex >= 0) {
              handleSuggestionClick(filteredSuggestions[selectedSuggestionIndex]);
            }
            break;
          case 'Escape':
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
            break;
        }
      },
      [showSuggestions, filteredSuggestions, selectedSuggestionIndex, handleSuggestionClick]
    );

    const clearSearch = useCallback(() => {
      setSearchQuery('');
      setShowSuggestions(false);
      setFilteredSuggestions([]);
      setSelectedSuggestionIndex(-1);
      onClear();
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [onClear]);

    // Close suggestions when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as any)) {
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <div ref={containerRef} className="w-full max-w-md mx-auto relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={handleSearchFocus}
            className="w-full px-4 py-2 pr-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {filteredSuggestions.map((node, index) => {
              const nodeName = getNodeDisplayName(node);
              const nodeType = node.type || 'unknown';
              return (
                <div
                  key={node.id}
                  onClick={() => handleSuggestionClick(node)}
                  className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100 ${
                    index === selectedSuggestionIndex ? 'bg-purple-50' : ''
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{nodeName}</span>
                  <span className={`text-xs capitalize px-2 py-1 rounded ${getNodeTypeColorClass(nodeType)}`}>{nodeType}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

VisualiserSearch.displayName = 'VisualiserSearch';

export default VisualiserSearch;
