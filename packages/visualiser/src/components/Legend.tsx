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
  events: { Icon: Zap, colorClass: "text-orange-600" },
  event: { Icon: Zap, colorClass: "text-orange-600" },
  agent: { Icon: Bot, colorClass: "text-sky-600" },
  agents: { Icon: Bot, colorClass: "text-sky-600" },
  agentTool: { Icon: Wrench, colorClass: "text-violet-600" },
  "agent-tool": { Icon: Wrench, colorClass: "text-violet-600" },
  services: { Icon: ServerIcon, colorClass: "text-pink-600" },
  service: { Icon: ServerIcon, colorClass: "text-pink-600" },
  flows: { Icon: Workflow, colorClass: "text-teal-600" },
  commands: { Icon: MessageSquare, colorClass: "text-blue-600" },
  command: { Icon: MessageSquare, colorClass: "text-blue-600" },
  queries: { Icon: SearchIcon, colorClass: "text-green-600" },
  query: { Icon: SearchIcon, colorClass: "text-green-600" },
  channels: { Icon: ArrowLeftRight, colorClass: "text-gray-600" },
  channel: { Icon: ArrowLeftRight, colorClass: "text-gray-600" },
  externalSystem: { Icon: Globe, colorClass: "text-pink-600" },
  systems: { Icon: GroupIcon, colorClass: "text-purple-600" },
  system: { Icon: GroupIcon, colorClass: "text-purple-600" },
  actor: { Icon: User, colorClass: "text-yellow-500" },
  "context-actor": { Icon: User, colorClass: "text-yellow-500" },
  "context-domain": { Icon: Boxes, colorClass: "text-yellow-500" },
  data: { Icon: Database, colorClass: "text-blue-600" },
  "data-products": { Icon: Boxes, colorClass: "text-indigo-600" },
  field: { Icon: Box, colorClass: "text-cyan-600" },
};

// The coloured square for kinds without an icon
const LEGEND_COLORS: Record<string, string> = {
  events: "bg-orange-600",
  agent: "bg-sky-600",
  agents: "bg-sky-600",
  agentTool: "bg-violet-600",
  "agent-tool": "bg-violet-600",
  services: "bg-pink-600",
  flows: "bg-teal-600",
  commands: "bg-blue-600",
  queries: "bg-green-600",
  channels: "bg-gray-600",
  externalSystem: "bg-pink-600",
  systems: "bg-purple-600",
  system: "bg-purple-600",
  actor: "bg-yellow-500",
  "context-actor": "bg-yellow-500",
  step: "bg-gray-700",
  data: "bg-blue-600",
  "data-products": "bg-indigo-600",
  field: "bg-cyan-600",
  messageGroup: "bg-violet-600",
  messageGroupExpanded: "bg-violet-600",
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
      colorClass: "bg-yellow-600",
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
      <div className="bg-[rgb(var(--ec-card-bg))] border border-[rgb(var(--ec-page-border))] font-light px-4 text-[12px] shadow-md py-1 rounded-md">
        <ul className="m-0 p-0 ">
          {Object.entries(legend).map(([key, { count, colorClass }]) => {
            const legendIcon = LEGEND_ICONS[key];
            const hidden = hiddenKeys.includes(key);
            return (
              <li
                key={key}
                title={`${hidden ? "Show" : "Hide"} ${getLegendLabel(key)}`}
                className={`flex space-x-2 items-center text-[10px] cursor-pointer text-[rgb(var(--ec-page-text))] hover:text-[rgb(var(--ec-accent))] hover:underline transition-opacity ${hidden ? "opacity-40" : ""}`}
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
