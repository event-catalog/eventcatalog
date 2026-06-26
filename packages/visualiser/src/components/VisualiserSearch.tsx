import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  memo,
} from "react";
import type { Node } from "@xyflow/react";
import {
  Blocks,
  Bot,
  Database,
  Group,
  Layers,
  ListTree,
  MessageSquare,
  Search as SearchIcon,
  Server,
  User,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Define interfaces for different node data structures
interface ResourceData {
  id?: string;
  name?: string;
  version?: string;
}

type MessageData = ResourceData;

type ServiceData = ResourceData;
type AgentData = ResourceData;
type AgentToolData = ResourceData;

type DomainData = ResourceData;

type EntityData = ResourceData;

interface NodeDataContent extends Record<string, unknown> {
  message?: { data?: MessageData } & MessageData;
  service?: { data?: ServiceData } & ServiceData;
  agent?: { data?: AgentData } & AgentData;
  agentTool?: { data?: AgentToolData } & AgentToolData;
  domain?: { data?: DomainData } & DomainData;
  system?: { data?: ResourceData } & ResourceData;
  entity?: { data?: EntityData } & EntityData;
  channel?: { data?: ResourceData } & ResourceData;
  dataProduct?: { data?: ResourceData } & ResourceData;
  data?: ResourceData;
  name?: string;
  version?: string;
  groupName?: string;
  messages?: Array<{
    message?: {
      collection?: string;
      data?: MessageData & { id?: string };
    };
  }>;
}

// Extend the Node type with our custom data structure
type CustomNode = Node<NodeDataContent>;

type SearchSuggestion = {
  key: string;
  node: CustomNode;
  label: string;
  searchText: string;
  type: string;
  resourceKey: string;
  groupName?: string;
  isGroupedMessage?: boolean;
};

type NodeTypeMeta = {
  label: string;
  Icon: LucideIcon;
  iconClass: string;
  badgeClass: string;
};

const formatVersionedName = (name: string, version?: string) => {
  if (version) {
    const nameWithoutVersion = name.replace(
      new RegExp(`-v?${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
      "",
    );
    return `${nameWithoutVersion} (v${version})`;
  }

  const versionMatch = name.match(
    /^(.+)-v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/,
  );
  if (!versionMatch) return name;

  return `${versionMatch[1]} (v${versionMatch[2]})`;
};

const normalizeCollectionType = (type: string) => {
  const aliases: Record<string, string> = {
    event: "events",
    command: "commands",
    query: "queries",
    agent: "agents",
    service: "services",
    domain: "domains",
    channel: "channels",
    entity: "entities",
  };

  return aliases[type] || type;
};

const splitVersionedName = (name: string, version?: string) => {
  if (version) {
    return {
      id: name.replace(
        new RegExp(`-v?${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
        "",
      ),
      version,
    };
  }

  const versionMatch = name.match(
    /^(.+)-v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/,
  );
  if (!versionMatch) return { id: name, version: undefined };

  return { id: versionMatch[1], version: versionMatch[2] };
};

const getResourceKey = ({
  type,
  id,
  name,
  version,
}: {
  type: string;
  id?: string;
  name: string;
  version?: string;
}) => {
  const parsed = splitVersionedName(id || name, version);
  return `${normalizeCollectionType(type)}:${parsed.id}:${parsed.version || ""}`.toLowerCase();
};

const getNodeResourceData = (
  data: NodeDataContent,
  key:
    | "message"
    | "agent"
    | "agentTool"
    | "service"
    | "domain"
    | "system"
    | "entity"
    | "channel"
    | "dataProduct"
    | "data",
) => {
  const resource = data?.[key];
  if (!resource || typeof resource !== "object") return undefined;
  return "data" in resource && resource.data ? resource.data : resource;
};

interface VisualiserSearchProps {
  nodes: CustomNode[];
  onNodeSelect: (node: CustomNode) => void;
  onClear: () => void;
  onPaneClick?: () => void;
}

export interface VisualiserSearchRef {
  hideSuggestions: () => void;
}

const VisualiserSearch = memo(
  forwardRef<VisualiserSearchRef, VisualiserSearchProps>(
    ({ nodes, onNodeSelect, onClear, onPaneClick: _onPaneClick }, ref) => {
      const [searchQuery, setSearchQuery] = useState("");
      const [filteredSuggestions, setFilteredSuggestions] = useState<
        SearchSuggestion[]
      >([]);
      const [showSuggestions, setShowSuggestions] = useState(false);
      const [selectedSuggestionIndex, setSelectedSuggestionIndex] =
        useState(-1);
      const searchInputRef = useRef<HTMLInputElement>(null);
      const containerRef = useRef<HTMLDivElement>(null);
      const suggestionsListRef = useRef<HTMLDivElement>(null);
      const suggestionItemRefs = useRef<Array<HTMLDivElement | null>>([]);

      const hideSuggestions = useCallback(() => {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }, []);

      useImperativeHandle(
        ref,
        () => ({
          hideSuggestions,
        }),
        [hideSuggestions],
      );

      const getNodeDisplayName = useCallback((node: CustomNode) => {
        if (node.type === "messageGroup") {
          return (node.data as any)?.groupName || node.id;
        }
        if (node.type === "messageGroupExpanded") {
          return (node.data as any)?.groupName || node.id;
        }
        const message = getNodeResourceData(node.data, "message");
        const agent = getNodeResourceData(node.data, "agent");
        const agentTool = getNodeResourceData(node.data, "agentTool");
        const service = getNodeResourceData(node.data, "service");
        const domain = getNodeResourceData(node.data, "domain");
        const system = getNodeResourceData(node.data, "system");
        const entity = getNodeResourceData(node.data, "entity");
        const channel = getNodeResourceData(node.data, "channel");
        const dataProduct = getNodeResourceData(node.data, "dataProduct");
        const data = getNodeResourceData(node.data, "data");
        const name =
          message?.name ||
          message?.id ||
          agent?.name ||
          agent?.id ||
          agentTool?.name ||
          agentTool?.id ||
          service?.name ||
          service?.id ||
          domain?.name ||
          domain?.id ||
          system?.name ||
          system?.id ||
          entity?.name ||
          entity?.id ||
          channel?.name ||
          channel?.id ||
          dataProduct?.name ||
          dataProduct?.id ||
          data?.name ||
          data?.id ||
          node.data?.name ||
          node.id;
        const version =
          message?.version ||
          agent?.version ||
          agentTool?.version ||
          service?.version ||
          domain?.version ||
          system?.version ||
          entity?.version ||
          channel?.version ||
          dataProduct?.version ||
          data?.version ||
          node.data?.version;
        return formatVersionedName(name, version);
      }, []);

      const getNodeResourceKey = useCallback(
        (node: CustomNode, label: string) => {
          if (
            node.type === "messageGroup" ||
            node.type === "messageGroupExpanded"
          ) {
            return `${node.type}:${node.id}`.toLowerCase();
          }

          const data = node.data as any;
          const resource =
            getNodeResourceData(data, "message") ||
            getNodeResourceData(data, "agent") ||
            getNodeResourceData(data, "agentTool") ||
            getNodeResourceData(data, "service") ||
            getNodeResourceData(data, "domain") ||
            getNodeResourceData(data, "system") ||
            getNodeResourceData(data, "entity") ||
            getNodeResourceData(data, "channel") ||
            getNodeResourceData(data, "dataProduct") ||
            data?.data ||
            data;

          return getResourceKey({
            type: node.type || "unknown",
            id: resource?.id,
            name: resource?.name || resource?.id || label || node.id,
            version: resource?.version || data?.version,
          });
        },
        [],
      );

      const dedupeSearchSuggestions = useCallback(
        (suggestions: SearchSuggestion[]) => {
          const uniqueSuggestions: SearchSuggestion[] = [];
          const indexByResourceKey = new Map<string, number>();

          suggestions.forEach((suggestion) => {
            const existingIndex = indexByResourceKey.get(
              suggestion.resourceKey,
            );

            if (existingIndex === undefined) {
              indexByResourceKey.set(
                suggestion.resourceKey,
                uniqueSuggestions.length,
              );
              uniqueSuggestions.push(suggestion);
              return;
            }

            if (
              suggestion.isGroupedMessage &&
              !uniqueSuggestions[existingIndex].isGroupedMessage
            ) {
              uniqueSuggestions[existingIndex] = suggestion;
            }
          });

          return uniqueSuggestions;
        },
        [],
      );

      const getSearchSuggestions = useCallback(
        (nodesToIndex: CustomNode[]): SearchSuggestion[] => {
          const suggestions = nodesToIndex.flatMap((node) => {
            const nodeName = getNodeDisplayName(node);
            const suggestions: SearchSuggestion[] = [
              {
                key: node.id,
                node,
                label: nodeName,
                searchText: nodeName,
                type: node.type || "unknown",
                resourceKey: getNodeResourceKey(node, nodeName),
              },
            ];

            if (node.type !== "messageGroup") return suggestions;

            const groupName = node.data?.groupName || nodeName;
            const groupedMessages = node.data?.messages || [];
            groupedMessages.forEach((item, index) => {
              const message = item.message;
              const messageName = message?.data?.name || message?.data?.id;
              if (!messageName) return;

              const version = message?.data?.version;
              const label = formatVersionedName(messageName, version);

              suggestions.push({
                key: `${node.id}:${message?.data?.id || messageName}:${version || index}`,
                node,
                label,
                searchText: `${label} ${groupName}`,
                type: message?.collection || "message",
                resourceKey: getResourceKey({
                  type: message?.collection || "message",
                  id: message?.data?.id,
                  name: messageName,
                  version,
                }),
                groupName,
                isGroupedMessage: true,
              });
            });

            return suggestions;
          });

          return dedupeSearchSuggestions(suggestions);
        },
        [dedupeSearchSuggestions, getNodeDisplayName, getNodeResourceKey],
      );

      const getNodeTypeMeta = useCallback((nodeType: string): NodeTypeMeta => {
        const meta: Record<string, NodeTypeMeta> = {
          events: {
            label: "Event",
            Icon: Zap,
            iconClass: "border-orange-500/25 bg-orange-500/10 text-orange-500",
            badgeClass:
              "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
          },
          event: {
            label: "Event",
            Icon: Zap,
            iconClass: "border-orange-500/25 bg-orange-500/10 text-orange-500",
            badgeClass:
              "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
          },
          commands: {
            label: "Command",
            Icon: MessageSquare,
            iconClass: "border-blue-500/25 bg-blue-500/10 text-blue-500",
            badgeClass:
              "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          },
          command: {
            label: "Command",
            Icon: MessageSquare,
            iconClass: "border-blue-500/25 bg-blue-500/10 text-blue-500",
            badgeClass:
              "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          },
          queries: {
            label: "Query",
            Icon: SearchIcon,
            iconClass: "border-green-500/25 bg-green-500/10 text-green-500",
            badgeClass:
              "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-300",
          },
          query: {
            label: "Query",
            Icon: SearchIcon,
            iconClass: "border-green-500/25 bg-green-500/10 text-green-500",
            badgeClass:
              "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-300",
          },
          services: {
            label: "Service",
            Icon: Server,
            iconClass: "border-pink-500/25 bg-pink-500/10 text-pink-500",
            badgeClass:
              "border-pink-500/25 bg-pink-500/10 text-pink-700 dark:text-pink-300",
          },
          agents: {
            label: "Agent",
            Icon: Bot,
            iconClass: "border-sky-500/25 bg-sky-500/10 text-sky-500",
            badgeClass:
              "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
          },
          agent: {
            label: "Agent",
            Icon: Bot,
            iconClass: "border-sky-500/25 bg-sky-500/10 text-sky-500",
            badgeClass:
              "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
          },
          agentTool: {
            label: "Agent Tool",
            Icon: Wrench,
            iconClass: "border-violet-500/25 bg-violet-500/10 text-violet-500",
            badgeClass:
              "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
          },
          "agent-tool": {
            label: "Agent Tool",
            Icon: Wrench,
            iconClass: "border-violet-500/25 bg-violet-500/10 text-violet-500",
            badgeClass:
              "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
          },
          domains: {
            label: "Domain",
            Icon: Blocks,
            iconClass:
              "border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
            badgeClass:
              "border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
          },
          systems: {
            label: "System",
            Icon: Group,
            iconClass: "border-violet-500/25 bg-violet-500/10 text-violet-500",
            badgeClass:
              "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
          },
          flows: {
            label: "Flow",
            Icon: Workflow,
            iconClass: "border-teal-500/25 bg-teal-500/10 text-teal-500",
            badgeClass:
              "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
          },
          channels: {
            label: "Channel",
            Icon: ListTree,
            iconClass: "border-gray-500/25 bg-gray-500/10 text-gray-500",
            badgeClass:
              "border-gray-500/25 bg-gray-500/10 text-gray-700 dark:text-gray-300",
          },
          data: {
            label: "Data",
            Icon: Database,
            iconClass: "border-blue-500/25 bg-blue-500/10 text-blue-500",
            badgeClass:
              "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          },
          entities: {
            label: "Entity",
            Icon: Database,
            iconClass: "border-blue-500/25 bg-blue-500/10 text-blue-500",
            badgeClass:
              "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          },
          externalSystem: {
            label: "External",
            Icon: Server,
            iconClass: "border-pink-500/25 bg-pink-500/10 text-pink-500",
            badgeClass:
              "border-pink-500/25 bg-pink-500/10 text-pink-700 dark:text-pink-300",
          },
          actor: {
            label: "Actor",
            Icon: User,
            iconClass:
              "border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
            badgeClass:
              "border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
          },
          user: {
            label: "User",
            Icon: User,
            iconClass:
              "border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
            badgeClass:
              "border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
          },
          messageGroup: {
            label: "Group",
            Icon: Layers,
            iconClass: "border-violet-500/25 bg-violet-500/10 text-violet-500",
            badgeClass:
              "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
          },
          messageGroupExpanded: {
            label: "Group",
            Icon: Layers,
            iconClass: "border-violet-500/25 bg-violet-500/10 text-violet-500",
            badgeClass:
              "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
          },
        };

        return (
          meta[nodeType] || {
            label: nodeType,
            Icon: Layers,
            iconClass: "border-gray-500/25 bg-gray-500/10 text-gray-500",
            badgeClass:
              "border-gray-500/25 bg-gray-500/10 text-gray-700 dark:text-gray-300",
          }
        );
      }, []);

      const handleSearchChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
          const query = event.target.value;
          setSearchQuery(query);

          if (query.length > 0) {
            const search = query.toLowerCase();
            const filtered = getSearchSuggestions(nodes).filter((suggestion) =>
              suggestion.searchText.toLowerCase().includes(search),
            );
            setFilteredSuggestions(filtered);
            setShowSuggestions(true);
            setSelectedSuggestionIndex(-1);
          } else {
            setFilteredSuggestions(getSearchSuggestions(nodes));
            setShowSuggestions(true);
            setSelectedSuggestionIndex(-1);
          }
        },
        [nodes, getSearchSuggestions],
      );

      const handleSearchFocus = useCallback(() => {
        const suggestions = getSearchSuggestions(nodes);
        const search = searchQuery.toLowerCase();
        setFilteredSuggestions(
          searchQuery.length === 0
            ? suggestions
            : suggestions.filter((suggestion) =>
                suggestion.searchText.toLowerCase().includes(search),
              ),
        );
        setShowSuggestions(true);
        setSelectedSuggestionIndex(-1);
      }, [nodes, searchQuery, getSearchSuggestions]);

      const handleSuggestionClick = useCallback(
        (suggestion: SearchSuggestion) => {
          setSearchQuery("");
          setFilteredSuggestions([]);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          onNodeSelect(suggestion.node);
        },
        [onNodeSelect],
      );

      const handleSearchKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
          switch (event.key) {
            case "ArrowDown":
              event.preventDefault();
              if (filteredSuggestions.length === 0) return;
              setShowSuggestions(true);
              setSelectedSuggestionIndex((prev) =>
                prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
              );
              break;
            case "ArrowUp":
              event.preventDefault();
              if (filteredSuggestions.length === 0) return;
              setShowSuggestions(true);
              setSelectedSuggestionIndex((prev) =>
                prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
              );
              break;
            case "Enter":
              event.preventDefault();
              if (
                showSuggestions &&
                selectedSuggestionIndex >= 0 &&
                selectedSuggestionIndex < filteredSuggestions.length
              ) {
                handleSuggestionClick(
                  filteredSuggestions[selectedSuggestionIndex],
                );
              }
              break;
            case "Escape":
              setShowSuggestions(false);
              setSelectedSuggestionIndex(-1);
              break;
          }
        },
        [
          showSuggestions,
          filteredSuggestions,
          selectedSuggestionIndex,
          handleSuggestionClick,
        ],
      );

      const clearSearch = useCallback(() => {
        setSearchQuery("");
        setShowSuggestions(false);
        setFilteredSuggestions([]);
        setSelectedSuggestionIndex(-1);
        onClear();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, [onClear]);

      useEffect(() => {
        suggestionItemRefs.current = suggestionItemRefs.current.slice(
          0,
          filteredSuggestions.length,
        );
      }, [filteredSuggestions.length]);

      useEffect(() => {
        if (!showSuggestions || selectedSuggestionIndex < 0) return;

        const list = suggestionsListRef.current;
        const item = suggestionItemRefs.current[selectedSuggestionIndex];
        if (!list || !item) return;

        const itemTop = item.offsetTop;
        const itemBottom = itemTop + item.offsetHeight;
        const visibleTop = list.scrollTop;
        const visibleBottom = visibleTop + list.clientHeight;

        if (itemTop < visibleTop) {
          list.scrollTop = itemTop;
        } else if (itemBottom > visibleBottom) {
          list.scrollTop = itemBottom - list.clientHeight;
        }
      }, [
        showSuggestions,
        selectedSuggestionIndex,
        filteredSuggestions.length,
      ]);

      // Close suggestions when clicking outside
      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (
            containerRef.current &&
            !containerRef.current.contains(event.target as any)
          ) {
            setShowSuggestions(false);
            setSelectedSuggestionIndex(-1);
          }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
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
              className="w-full px-4 py-2 pr-10 bg-[rgb(var(--ec-input-bg))] border border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))] placeholder:text-[rgb(var(--ec-page-text-muted))] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent))] focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]"
                aria-label="Clear search"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsListRef}
              className="absolute top-full left-0 right-0 mt-1 bg-[rgb(var(--ec-card-bg))] border border-[rgb(var(--ec-page-border))] rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {filteredSuggestions.map((suggestion, index) => {
                const nodeTypeMeta = getNodeTypeMeta(suggestion.type);
                const Icon = nodeTypeMeta.Icon;
                const isSelected = index === selectedSuggestionIndex;
                return (
                  <div
                    key={`${suggestion.key}:${index}`}
                    ref={(element) => {
                      suggestionItemRefs.current[index] = element;
                    }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    className={`px-3 py-2 cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? "bg-[rgb(var(--ec-accent-subtle))] outline outline-1 -outline-offset-1 outline-[rgb(var(--ec-accent))]"
                        : "hover:bg-[rgb(var(--ec-page-border)/0.5)]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border ${nodeTypeMeta.iconClass}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[rgb(var(--ec-page-text))]">
                        {suggestion.label}
                      </span>
                      {suggestion.isGroupedMessage && suggestion.groupName && (
                        <span className="mt-0.5 block truncate text-xs text-[rgb(var(--ec-page-text-muted))]">
                          in {suggestion.groupName}
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-0.5 flex-shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${nodeTypeMeta.badgeClass}`}
                    >
                      {nodeTypeMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    },
  ),
);

VisualiserSearch.displayName = "VisualiserSearch";

export default VisualiserSearch;
