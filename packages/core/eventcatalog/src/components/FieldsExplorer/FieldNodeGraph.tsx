import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionLineType,
  type Node,
  type Edge,
} from '@xyflow/react';
import {
  Event as EventNodeComponent,
  Command as CommandNodeComponent,
  Query as QueryNodeComponent,
  Service as ServiceNodeComponent,
  Field as FieldNodeComponent,
} from '@eventcatalog/visualiser';
import { X, ChevronDown, ChevronRight, Search, AlertTriangle } from 'lucide-react';
import { BoltIcon, ChatBubbleLeftIcon, MagnifyingGlassIcon, ServerIcon } from '@heroicons/react/24/solid';
import { getNodesAndEdges, type FieldOccurrence } from '@utils/node-graphs/field-node-graph';
import * as ContextMenu from '@radix-ui/react-context-menu';
import '@xyflow/react/dist/style.css';

interface FieldNodeGraphProps {
  fieldPath: string;
  fieldType: string;
  fieldDescription?: string;
  fieldRequired?: boolean;
  fieldConflicts?: { type: string; count: number }[];
  occurrences: FieldOccurrence[];
  onClose: () => void;
}

interface ContextMenuItem {
  label: string;
  href: string;
  external?: boolean;
  download?: string;
  separator?: boolean;
}

function wrapWithContextMenu(Component: React.ComponentType<any>) {
  const Wrapped = memo((props: any) => {
    const items: ContextMenuItem[] | undefined = props.data?.contextMenu;
    if (!items?.length) return <Component {...props} />;
    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div>
            <Component {...props} />
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content
            className="min-w-[220px] bg-[rgb(var(--ec-card-bg,255_255_255))] rounded-md p-1 shadow-md border border-[rgb(var(--ec-page-border))] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, index) => (
              <div key={index}>
                {item.separator && index > 0 && <ContextMenu.Separator className="h-[1px] bg-[rgb(var(--ec-page-border))] m-1" />}
                <ContextMenu.Item
                  asChild
                  className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-[rgb(var(--ec-content-hover))] rounded-sm flex items-center text-[rgb(var(--ec-page-text))]"
                >
                  <a
                    href={item.href}
                    {...(item.download ? { download: item.download } : {})}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {item.label}
                  </a>
                </ContextMenu.Item>
              </div>
            ))}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    );
  });
  Wrapped.displayName = `WithContextMenu(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
}

// React 19 vs React 18 ReactNode type drift between @eventcatalog/visualiser
// and the catalog means these MemoExoticComponents don't match ComponentType<any>
// unless we widen once here.
const nodeTypes = {
  service: wrapWithContextMenu(ServiceNodeComponent as unknown as React.ComponentType<any>),
  event: wrapWithContextMenu(EventNodeComponent as unknown as React.ComponentType<any>),
  command: wrapWithContextMenu(CommandNodeComponent as unknown as React.ComponentType<any>),
  query: wrapWithContextMenu(QueryNodeComponent as unknown as React.ComponentType<any>),
  field: FieldNodeComponent as unknown as React.ComponentType<any>,
} as unknown as import('@xyflow/react').NodeTypes;

const getIconForMessageType = (type: string) => {
  switch (type) {
    case 'event':
      return { Icon: BoltIcon, bg: 'bg-orange-500' };
    case 'command':
      return { Icon: ChatBubbleLeftIcon, bg: 'bg-blue-500' };
    case 'query':
      return { Icon: MagnifyingGlassIcon, bg: 'bg-green-500' };
    default:
      return { Icon: ChatBubbleLeftIcon, bg: 'bg-gray-500' };
  }
};

const COLLAPSED_LIMIT = 5;

interface ResourceItem {
  key: string;
  label: string;
  version: string;
  Icon: React.ComponentType<{ className?: string }>;
  bg: string;
  onClick: () => void;
}

function CollapsibleResourceList({
  title,
  count,
  items,
  defaultExpanded = true,
}: {
  title: string;
  count: number;
  items: ResourceItem[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search ? items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())) : items;
  const displayed = showAll ? filtered : filtered.slice(0, COLLAPSED_LIMIT);
  const hasMore = filtered.length > COLLAPSED_LIMIT;

  return (
    <div>
      <button className="flex items-center justify-between w-full mb-2 group" onClick={() => setExpanded(!expanded)}>
        <h4 className="text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider flex items-center gap-1">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {title} ({count})
        </h4>
      </button>
      {expanded && (
        <div className="space-y-1.5">
          {items.length > COLLAPSED_LIMIT && (
            <div className="relative mb-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[rgb(var(--ec-icon-color))]" />
              <input
                type="text"
                placeholder={`Filter ${title.toLowerCase()}...`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowAll(true);
                }}
                className="w-full pl-7 pr-2 py-1 text-[11px] rounded border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg,var(--ec-page-bg)))] text-[rgb(var(--ec-page-text))] placeholder:text-[rgb(var(--ec-page-text-muted))] focus:outline-none focus:border-[rgb(var(--ec-accent))]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {displayed.map((item) => (
            <button
              key={item.key}
              className="flex items-center gap-2 w-full rounded-lg border border-[rgb(var(--ec-page-border)/0.5)] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] hover:border-[rgb(var(--ec-accent))] transition-colors px-2.5 py-2 text-left"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
              }}
            >
              <span className={`flex items-center justify-center w-5 h-5 ${item.bg} rounded flex-shrink-0`}>
                <item.Icon className="h-2.5 w-2.5 text-white" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[rgb(var(--ec-page-text))] truncate">{item.label}</div>
                <div className="text-[10px] text-[rgb(var(--ec-page-text-muted))]">v{item.version}</div>
              </div>
            </button>
          ))}
          {hasMore && !search && (
            <button
              className="text-[11px] text-[rgb(var(--ec-accent))] hover:underline w-full text-left pl-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(!showAll);
              }}
            >
              {showAll ? 'Show less' : `Show all ${filtered.length}`}
            </button>
          )}
          {search && filtered.length === 0 && (
            <div className="text-[11px] text-[rgb(var(--ec-page-text-muted))] pl-1">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldNodeGraphInner({
  fieldPath,
  fieldType,
  fieldDescription,
  fieldRequired,
  fieldConflicts,
  occurrences,
  onClose,
}: FieldNodeGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getNodesAndEdges({ fieldPath, fieldType, occurrences }),
    [fieldPath, fieldType, occurrences]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const edgesRef = useRef(initialEdges);
  edgesRef.current = edges;

  const { fitView } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load visualiser styles (animations, hover effects, theme variables)
  useEffect(() => {
    import('@eventcatalog/visualiser/styles-core.css');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.2 }), 50);
    return () => clearTimeout(timer);
  }, [fitView]);

  // Unique messages, producers, consumers for the details panel
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    return occurrences.filter((occ) => {
      const key = `${occ.messageId}-${occ.messageVersion}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [occurrences]);

  const uniqueProducers = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; version: string; name?: string }[] = [];
    for (const occ of occurrences) {
      for (const p of occ.producers) {
        const key = `${p.id}-${p.version}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(p);
        }
      }
    }
    return result;
  }, [occurrences]);

  const uniqueConsumers = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; version: string; name?: string }[] = [];
    for (const occ of occurrences) {
      for (const c of occ.consumers) {
        const key = `${c.id}-${c.version}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(c);
        }
      }
    }
    return result;
  }, [occurrences]);

  // ── Hover highlighting (matches main NodeGraph behaviour) ──

  const hoveredEdgeNodesRef = useRef<Element[]>([]);
  const hoveredNodeEdgesRef = useRef<Element[]>([]);
  const hoveredNodePeersRef = useRef<Element[]>([]);

  const handleEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const nodeEls = wrapper.querySelectorAll(`[data-id="${edge.source}"], [data-id="${edge.target}"]`);
    nodeEls.forEach((el) => el.classList.add('ec-edge-hover-node'));
    hoveredEdgeNodesRef.current = Array.from(nodeEls);
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    hoveredEdgeNodesRef.current.forEach((el) => el.classList.remove('ec-edge-hover-node'));
    hoveredEdgeNodesRef.current = [];
  }, []);

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const peerIds = new Set<string>();
    const edgeEls: Element[] = [];

    for (const edge of edgesRef.current) {
      if (edge.source !== node.id && edge.target !== node.id) continue;
      const el = wrapper.querySelector(`.react-flow__edge[data-id="${edge.id}"]`);
      if (el) {
        el.classList.add('ec-node-hover-edge');
        edgeEls.push(el);
      }
      if (edge.source !== node.id) peerIds.add(edge.source);
      if (edge.target !== node.id) peerIds.add(edge.target);
    }
    hoveredNodeEdgesRef.current = edgeEls;

    peerIds.add(node.id);
    const selector = Array.from(peerIds)
      .map((id) => `[data-id="${id}"]`)
      .join(', ');
    if (selector) {
      const peerEls = wrapper.querySelectorAll(selector);
      peerEls.forEach((el) => el.classList.add('ec-edge-hover-node'));
      hoveredNodePeersRef.current = Array.from(peerEls);
    }
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    hoveredNodeEdgesRef.current.forEach((el) => el.classList.remove('ec-node-hover-edge'));
    hoveredNodeEdgesRef.current = [];
    hoveredNodePeersRef.current.forEach((el) => el.classList.remove('ec-edge-hover-node'));
    hoveredNodePeersRef.current = [];
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[90vw] h-[80vh] max-w-[1400px] rounded-xl border shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--ec-page-bg))',
          borderColor: 'rgb(var(--ec-page-border))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'rgb(var(--ec-page-border))' }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--ec-page-text))' }}>
              Field Traceability
            </h3>
            <code
              className="px-2 py-0.5 rounded text-xs font-mono"
              style={{
                backgroundColor: 'rgb(var(--ec-accent) / 0.1)',
                color: 'rgb(var(--ec-accent))',
              }}
            >
              {fieldPath}
            </code>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[rgb(var(--ec-content-hover))] flex-shrink-0"
            style={{ color: 'rgb(var(--ec-icon-color))' }}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: Graph + Details panel */}
        <div className="flex-1 min-h-0 flex">
          {/* Node Graph */}
          <div className="flex-1 min-w-0 eventcatalog-visualizer" ref={wrapperRef}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onEdgeMouseEnter={handleEdgeMouseEnter}
              onEdgeMouseLeave={handleEdgeMouseLeave}
              onNodeMouseEnter={handleNodeMouseEnter}
              onNodeMouseLeave={handleNodeMouseLeave}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              connectionLineType={ConnectionLineType.SmoothStep}
              fitView
              proOptions={{ hideAttribution: true }}
              nodesDraggable={true}
              nodesConnectable={false}
              elementsSelectable={false}
              minZoom={0.07}
              maxZoom={1.5}
            >
              <Background color="var(--ec-bg-dots)" gap={16} />
              <Controls position="bottom-left" />
            </ReactFlow>
          </div>

          {/* Right details panel */}
          <div className="w-[280px] flex-shrink-0 border-l overflow-y-auto" style={{ borderColor: 'rgb(var(--ec-page-border))' }}>
            <div className="p-4 space-y-4">
              {/* Field info */}
              <div>
                <h4 className="text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wider mb-2">
                  Field
                </h4>
                <div className="space-y-1.5">
                  <div className="text-sm font-mono font-semibold text-[rgb(var(--ec-page-text))]">{fieldPath}</div>
                  <div className="text-xs text-[rgb(var(--ec-page-text-muted))]">{fieldType}</div>
                  {fieldRequired && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                      Required
                    </span>
                  )}
                  {fieldDescription && (
                    <p className="text-xs text-[rgb(var(--ec-page-text-muted))] leading-relaxed mt-1">{fieldDescription}</p>
                  )}
                </div>
              </div>

              {/* Conflicts */}
              {fieldConflicts && fieldConflicts.length > 1 && (
                <div>
                  <h4 className="text-[11px] font-medium text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Type Conflict
                  </h4>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                    <p className="text-xs text-amber-600 mb-2">
                      This field has inconsistent types across messages (
                      {fieldConflicts.map((c) => `${c.type} in ${c.count}`).join(', ')})
                    </p>
                    <div className="space-y-1">
                      {fieldConflicts.map((c) => (
                        <div key={c.type} className="flex items-center justify-between text-xs">
                          <code className="font-mono text-[rgb(var(--ec-page-text))]">{c.type}</code>
                          <span className="text-[rgb(var(--ec-page-text-muted))]">
                            {c.count} {c.count === 1 ? 'schema' : 'schemas'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <CollapsibleResourceList
                title="Messages"
                count={uniqueMessages.length}
                defaultExpanded={true}
                items={uniqueMessages.map((occ) => {
                  const { Icon, bg } = getIconForMessageType(occ.messageType);
                  return {
                    key: `${occ.messageId}-${occ.messageVersion}`,
                    label: occ.messageName || occ.messageId,
                    version: occ.messageVersion,
                    Icon,
                    bg,
                    onClick: () => {
                      const nodeId = `msg-${occ.messageId}-${occ.messageVersion}`;
                      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
                    },
                  };
                })}
              />

              {/* Producers */}
              {uniqueProducers.length > 0 && (
                <CollapsibleResourceList
                  title="Producers"
                  count={uniqueProducers.length}
                  defaultExpanded={false}
                  items={uniqueProducers.map((p) => ({
                    key: `${p.id}-${p.version}`,
                    label: p.name || p.id,
                    version: p.version,
                    Icon: ServerIcon,
                    bg: 'bg-pink-500',
                    onClick: () => {
                      const nodeId = `svc-producer-${p.id}-${p.version}`;
                      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
                    },
                  }))}
                />
              )}

              {/* Consumers */}
              {uniqueConsumers.length > 0 && (
                <CollapsibleResourceList
                  title="Consumers"
                  count={uniqueConsumers.length}
                  defaultExpanded={false}
                  items={uniqueConsumers.map((c) => ({
                    key: `${c.id}-${c.version}`,
                    label: c.name || c.id,
                    version: c.version,
                    Icon: ServerIcon,
                    bg: 'bg-pink-500',
                    onClick: () => {
                      const nodeId = `svc-consumer-${c.id}-${c.version}`;
                      fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.5 });
                    },
                  }))}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FieldNodeGraph(props: FieldNodeGraphProps) {
  return (
    <ReactFlowProvider>
      <FieldNodeGraphInner {...props} />
    </ReactFlowProvider>
  );
}
