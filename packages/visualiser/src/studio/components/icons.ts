import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Bot,
  Boxes,
  Archive,
  Database,
  DatabaseZap,
  Globe,
  Group,
  Mail,
  MonitorSmartphone,
  ScanSearch,
  Search,
  ServerIcon,
  StickyNote,
  TableProperties,
  Type,
  User,
  Users,
  Zap,
} from "lucide-react";
import { GROUP_TYPES } from "../node-types";

/** How each kind of node, and each catalog collection, looks in the canvas's lists (the colours are each kind's own) */
export type NodeIcon = { icon: LucideIcon; className: string };

export const NODE_ICONS: Record<string, NodeIcon> = {
  [GROUP_TYPES.domain]: { icon: Boxes, className: "text-[#ffc53d]" },
  [GROUP_TYPES.system]: { icon: Group, className: "text-[#654dc4]" },
  // Catalog domains and systems added as cards
  "context-domain": { icon: Boxes, className: "text-[#ffc53d]" },
  system: { icon: Group, className: "text-[#654dc4]" },
  service: { icon: ServerIcon, className: "text-[#cf3897]" },
  event: { icon: Zap, className: "text-[#ef5f00]" },
  command: { icon: Mail, className: "text-[#0588f0]" },
  query: { icon: Search, className: "text-[#2b9a66]" },
  channel: { icon: ArrowRightLeft, className: "text-[#838383]" },
  data: { icon: Database, className: "text-[#0588f0]" },
  // The other kinds of data store, in the components list
  "data:cache": { icon: DatabaseZap, className: "text-[#0588f0]" },
  "data:searchIndex": { icon: ScanSearch, className: "text-[#0588f0]" },
  "data:objectStore": { icon: Archive, className: "text-[#0588f0]" },
  view: { icon: MonitorSmartphone, className: "text-[#0797b9]" },
  externalSystem: { icon: Globe, className: "text-[#8347b9]" },
  agent: { icon: Bot, className: "text-[#654dc4]" },
  actor: { icon: User, className: "text-[#ffc53d]" },
  team: { icon: Users, className: "text-[#26997b]" },
  // A table of its properties, as the node shows it
  entity: { icon: TableProperties, className: "text-[#0588f0]" },
  note: { icon: StickyNote, className: "text-[#ffc53d]" },
  text: { icon: Type, className: "text-[rgb(var(--ec-icon-color))]" },
};

/** The catalog's collections, in the order the catalog list shows them, with the icon of the node each becomes */
export const CATALOG_GROUPS: ({
  collection: string;
  label: string;
} & NodeIcon)[] = [
  {
    collection: "domains",
    label: "Domains",
    ...NODE_ICONS[GROUP_TYPES.domain],
  },
  {
    collection: "systems",
    label: "Systems",
    ...NODE_ICONS[GROUP_TYPES.system],
  },
  { collection: "services", label: "Services", ...NODE_ICONS.service },
  { collection: "events", label: "Events", ...NODE_ICONS.event },
  { collection: "commands", label: "Commands", ...NODE_ICONS.command },
  { collection: "queries", label: "Queries", ...NODE_ICONS.query },
  { collection: "channels", label: "Channels", ...NODE_ICONS.channel },
  { collection: "containers", label: "Data Stores", ...NODE_ICONS.data },
];
