/**
 * A node's card on a diagram, when it's clicked: Studio's node card (NodeCard), read only. What it is and where (its
 * type, and the domain or system it's in), its name, version and summary, what it's connected to (a message's
 * producers and consumers, what a service sends and receives: click one to go to it), and links to its diagram and
 * docs.
 */
import { memo, useState, type RefObject } from "react";
import type { Node } from "@xyflow/react";
import {
  ArrowRight,
  Box,
  ChevronDown,
  ChevronRight,
  FileText,
  Network,
  Package,
  Workflow,
  Wrench,
} from "lucide-react";
import { NodeCard } from "../studio/components/NodeCard";
import { NODE_ICONS, type NodeIcon } from "../studio/components/icons";
import { GROUP_TYPES } from "../studio/node-types";
import { getNodeInfo, NODE_TYPE_LABELS } from "../utils/node-labels";
import type { NeighbourGroup } from "../utils/node-neighbours";

// The node types' names, singular or plural (as the node graphs build them)
const PLURAL: Record<string, string> = {
  service: "services",
  agent: "agents",
  event: "events",
  command: "commands",
  query: "queries",
  channel: "channels",
  flow: "flows",
  system: "systems",
  domain: "domains",
  "domain-group": "domains",
  "system-group": "systems",
  container: "data",
  "data-product": "data-products",
  entity: "entities",
};
const typeKey = (type?: string) => PLURAL[type ?? ""] ?? type ?? "";
const typeLabel = (type?: string) => NODE_TYPE_LABELS[typeKey(type)] ?? "Node";

// Each kind of node's icon, as Studio shows it (and the kinds only diagrams have)
const ICON_KEYS: Record<string, string> = {
  services: "service",
  agents: "agent",
  events: "event",
  commands: "command",
  queries: "query",
  channels: "channel",
  systems: "system",
  "system-group": "system",
  domains: GROUP_TYPES.domain,
  "domain-group": GROUP_TYPES.domain,
  "context-domain": GROUP_TYPES.domain,
  "external-system": "externalSystem",
  "context-actor": "actor",
  user: "actor",
  entities: "entity",
};
const DIAGRAM_ICONS: Record<string, NodeIcon["icon"]> = {
  flows: Workflow,
  "data-products": Package,
  agentTool: Wrench,
};
// Only the icon: the card draws them all in the muted text colour, as search does (node-card.css)
const typeIcon = (type?: string): NodeIcon["icon"] => {
  const key = typeKey(type);
  return (
    DIAGRAM_ICONS[key] ??
    NODE_ICONS[ICON_KEYS[key] ?? ICON_KEYS[type ?? ""] ?? type ?? ""]?.icon ??
    Box
  );
};

/** Its type: an outlined pill with its icon (as Studio's node card) */
function NodeTypePill({ type }: { type?: string }) {
  const Icon = typeIcon(type);
  return (
    <span className="ec-doc-card-type">
      <Icon aria-hidden />
      {typeLabel(type)}
    </span>
  );
}

export type NodeInfoCardProps = {
  node: Pick<Node, "id" | "type" | "data">;
  /** The domain or system it's in, if it's in one on the diagram */
  parentName?: string;
  neighbours: NeighbourGroup[];
  /** Its diagram and docs pages, when it has them (and they aren't the page this is) */
  diagramUrl?: string;
  docsUrl?: string;
  onOpenDiagram: (url: string) => void;
  /** Goes to a node it's connected to (and shows its card) */
  onOpenNode: (id: string) => void;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

// How many of a group's nodes are listed before "Show N more"
const GROUP_LIMIT = 6;

/** One group of what it's connected to (e.g. "Consumed by"), the first few until it's opened */
function NeighbourGroupList({
  group,
  onOpenNode,
}: {
  group: NeighbourGroup;
  onOpenNode: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hidden = open ? 0 : Math.max(0, group.items.length - GROUP_LIMIT);
  const items = hidden ? group.items.slice(0, GROUP_LIMIT) : group.items;
  return (
    <section className="mt-3">
      <h3 className="mb-1 px-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
        {group.heading}
      </h3>
      <ul className="m-0 list-none space-y-px p-0">
        {items.map((item) => {
          const Icon = typeIcon(item.type);
          return (
            <li key={item.id}>
              <button
                type="button"
                title={`Go to ${item.name}`}
                onClick={() => onOpenNode(item.id)}
                className="ec-doc-card-item"
              >
                <span aria-hidden className="ec-doc-card-item-icon">
                  <Icon />
                </span>
                <span className="min-w-[35%] flex-1 truncate">{item.name}</span>
                {item.label && (
                  <span
                    title={item.label}
                    className="min-w-0 max-w-[55%] flex-none truncate text-right text-[11px] text-[rgb(var(--ec-page-text-muted))]"
                  >
                    {item.label}
                  </span>
                )}
                <ChevronRight
                  aria-hidden
                  className="ec-doc-card-item-chevron"
                />
              </button>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ec-doc-card-item ec-doc-card-more"
        >
          <span aria-hidden className="ec-doc-card-item-icon">
            <ChevronDown />
          </span>
          Show {hidden} more
        </button>
      )}
    </section>
  );
}

export default memo(function NodeInfoCard({
  node,
  parentName,
  neighbours,
  diagramUrl,
  docsUrl,
  onOpenDiagram,
  onOpenNode,
  containerRef,
  onClose,
}: NodeInfoCardProps) {
  const { name, version, summary } = getNodeInfo(node);
  return (
    <NodeCard
      nodeId={node.id}
      containerRef={containerRef}
      label={name}
      onClose={onClose}
      bottomInset={64}
      kicker={
        <>
          <NodeTypePill type={node.type} />
          {parentName && (
            <span className="ec-doc-card-breadcrumb">in {parentName}</span>
          )}
        </>
      }
      header={
        <>
          <h2 className="ec-doc-card-title">
            {name}
            {version && <span className="ec-doc-card-version">v{version}</span>}
          </h2>
          {summary && (
            <p className="ec-doc-card-summary is-clamped" title={summary}>
              {summary}
            </p>
          )}
          {(diagramUrl || docsUrl) && (
            <div className="ec-doc-card-actions">
              {diagramUrl && (
                <a
                  href={diagramUrl}
                  onClick={(event) => {
                    // Cmd/ctrl-click opens it in a new tab, as links do
                    if (event.metaKey || event.ctrlKey) return;
                    event.preventDefault();
                    onOpenDiagram(diagramUrl);
                  }}
                  className="ec-doc-card-action is-primary"
                >
                  <Network aria-hidden /> Open diagram
                  <ArrowRight
                    aria-hidden
                    className="ec-doc-card-action-arrow"
                  />
                </a>
              )}
              {docsUrl && (
                <a href={docsUrl} className="ec-doc-card-action">
                  <FileText aria-hidden /> Docs
                </a>
              )}
            </div>
          )}
        </>
      }
    >
      {/* Scrolls under the header, which stays in view */}
      <div className="ec-doc-card-body ec-doc-card-scroll px-4 pb-3.5 pt-1 empty:hidden">
        {neighbours.map((group) => (
          <NeighbourGroupList
            key={group.heading}
            group={group}
            onOpenNode={onOpenNode}
          />
        ))}
      </div>
    </NodeCard>
  );
});
