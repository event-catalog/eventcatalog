import { memo } from "react";
import { Panel, type Node } from "@xyflow/react";
import {
  Zap,
  Bot,
  Wrench,
  ServerIcon,
  Workflow,
  MessageSquare,
  Search as SearchIcon,
  ArrowLeftRight,
  Group as GroupIcon,
  Globe,
  User,
  Database,
  Boxes,
  Box,
  type LucideIcon,
} from "lucide-react";

/**
 * A diagram's legend: how many of each kind of node it shows (and of each domain's, when steps are grouped by
 * domain), with the kind's icon. Clicking an entry hides or shows those nodes. Studio's canvases have the same one.
 */

export type LegendEntry = {
  count: number;
  colorClass: string;
  groupId?: string;
};

// Boundaries around other nodes, left out of the legend
const GROUP_NODE_TYPES = ["group", "system-group", "domain-group", "swimlane"];

// Friendly labels for legend keys that differ from their raw node type (shown capitalised)
const LEGEND_LABELS: Record<string, string> = {
  "context-actor": "Actors",
  "context-domain": "Domains",
  // Studio's node types are singular: listed like the visualiser's
  service: "services",
  event: "events",
  command: "commands",
  query: "queries",
  channel: "channels",
  system: "systems",
  agent: "agents",
  actor: "Actors",
  view: "views",
};

const getLegendLabel = (key: string) => LEGEND_LABELS[key] ?? key;

// Icon + text colour per legend key, mirroring each collection's node styling.
// When a key has no icon mapped, the legend falls back to its coloured square.
const LEGEND_ICONS: Record<string, { Icon: LucideIcon; colorClass: string }> = {
  events: { Icon: Zap, colorClass: "text-[#ef5f00]" },
  event: { Icon: Zap, colorClass: "text-[#ef5f00]" },
  agent: { Icon: Bot, colorClass: "text-[#0797b9]" },
  agents: { Icon: Bot, colorClass: "text-[#0797b9]" },
  agentTool: { Icon: Wrench, colorClass: "text-[#654dc4]" },
  "agent-tool": { Icon: Wrench, colorClass: "text-[#654dc4]" },
  services: { Icon: ServerIcon, colorClass: "text-[#cf3897]" },
  service: { Icon: ServerIcon, colorClass: "text-[#cf3897]" },
  flows: { Icon: Workflow, colorClass: "text-[#0d9b8a]" },
  commands: { Icon: MessageSquare, colorClass: "text-[#0588f0]" },
  command: { Icon: MessageSquare, colorClass: "text-[#0588f0]" },
  queries: { Icon: SearchIcon, colorClass: "text-[#2b9a66]" },
  query: { Icon: SearchIcon, colorClass: "text-[#2b9a66]" },
  channels: { Icon: ArrowLeftRight, colorClass: "text-[#838383]" },
  channel: { Icon: ArrowLeftRight, colorClass: "text-[#838383]" },
  externalSystem: { Icon: Globe, colorClass: "text-[#cf3897]" },
  systems: { Icon: GroupIcon, colorClass: "text-[#8347b9]" },
  system: { Icon: GroupIcon, colorClass: "text-[#8347b9]" },
  actor: { Icon: User, colorClass: "text-[#ffc53d]" },
  "context-actor": { Icon: User, colorClass: "text-[#ffc53d]" },
  "context-domain": { Icon: Boxes, colorClass: "text-[#ffc53d]" },
  data: { Icon: Database, colorClass: "text-[#0588f0]" },
  "data-products": { Icon: Boxes, colorClass: "text-[#3358d4]" },
  field: { Icon: Box, colorClass: "text-[#0797b9]" },
};

// The coloured square for kinds without an icon
const LEGEND_COLORS: Record<string, string> = {
  events: "bg-[#ef5f00]",
  agent: "bg-[#0797b9]",
  agents: "bg-[#0797b9]",
  agentTool: "bg-[#654dc4]",
  "agent-tool": "bg-[#654dc4]",
  services: "bg-[#cf3897]",
  flows: "bg-[#0d9b8a]",
  commands: "bg-[#0588f0]",
  queries: "bg-[#2b9a66]",
  channels: "bg-[#838383]",
  externalSystem: "bg-[#cf3897]",
  systems: "bg-[#8347b9]",
  system: "bg-[#8347b9]",
  actor: "bg-[#ffc53d]",
  "context-actor": "bg-[#ffc53d]",
  step: "bg-[#646464]",
  data: "bg-[#0588f0]",
  "data-products": "bg-[#3358d4]",
  field: "bg-[#0797b9]",
  messageGroup: "bg-[#654dc4]",
  messageGroupExpanded: "bg-[#654dc4]",
};

/** The legend for some nodes: each domain's steps (when grouped by domain), then each kind of node */
export const getLegend = (nodes: Node<any>[]): Record<string, LegendEntry> => {
  const legend: Record<string, LegendEntry> = {};
  const domainGroups = [
    ...new Set(
      nodes
        .filter((node) => node.data.group?.type === "Domain")
        .map((node) => node.data.group?.id),
    ),
  ];
  domainGroups.forEach((groupId) => {
    legend[`${groupId} (Domain)`] = {
      count: nodes.filter((node) => node.data.group?.id === groupId).length,
      colorClass: "bg-[#ffba18]",
      groupId,
    };
  });
  for (const { type } of nodes) {
    // Group boundaries aren't something to count or hide
    if (!type || GROUP_NODE_TYPES.includes(type)) continue;
    const entry = legend[type];
    if (entry) entry.count += 1;
    else
      legend[type] = {
        count: 1,
        colorClass: LEGEND_COLORS[type] || "bg-black",
      };
  }
  return legend;
};

const LEGEND_PANEL_STYLE_WITH_MINIMAP = { marginRight: "230px" } as const;

/** The legend, bottom right */
export const LegendPanel = memo(function LegendPanel({
  legend,
  hiddenKeys,
  showMinimap = false,
  onLegendClick,
}: {
  legend: Record<string, LegendEntry>;
  /** Entries whose nodes are hidden, shown faded */
  hiddenKeys: string[];
  showMinimap?: boolean;
  onLegendClick: (key: string) => void;
}) {
  if (Object.keys(legend).length === 0) return null;

  return (
    <Panel
      position="bottom-right"
      style={showMinimap ? LEGEND_PANEL_STYLE_WITH_MINIMAP : undefined}
    >
      <div className="rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] p-1 text-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18)]">
        <ul className="m-0 p-0">
          {Object.entries(legend).map(([key, { count, colorClass }]) => {
            const legendIcon = LEGEND_ICONS[key];
            const hidden = hiddenKeys.includes(key);
            return (
              <li
                key={key}
                title={`${hidden ? "Show" : "Hide"} ${getLegendLabel(key)}`}
                className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] cursor-pointer text-[rgb(var(--ec-page-text-muted))] hover:bg-[color-mix(in_srgb,rgb(var(--ec-page-text))_6%,transparent)] hover:text-[rgb(var(--ec-page-text))] transition-colors ${hidden ? "opacity-40" : ""}`}
                onClick={() => onLegendClick(key)}
              >
                {legendIcon ? (
                  <legendIcon.Icon
                    className={`w-3 h-3 shrink-0 ${legendIcon.colorClass}`}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                ) : (
                  <span className={`w-2 h-2 block ${colorClass}`} />
                )}
                <span className="block capitalize">
                  {getLegendLabel(key)} ({count})
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
});
