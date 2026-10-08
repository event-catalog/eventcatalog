import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeft,
  Bot,
  Boxes,
  Database,
  Globe,
  Group,
  Mail,
  MonitorSmartphone,
  Search,
  ServerIcon,
  StickyNote,
  Type,
  User,
  Zap,
} from 'lucide-react';
import { GROUP_TYPES } from '../node-types';

/** How each kind of node, and each catalog collection, looks in the canvas's lists (the colours are each kind's own) */
export type NodeIcon = { icon: LucideIcon; className: string };

export const NODE_ICONS: Record<string, NodeIcon> = {
  [GROUP_TYPES.domain]: { icon: Boxes, className: 'text-yellow-500' },
  [GROUP_TYPES.system]: { icon: Group, className: 'text-violet-600' },
  // Catalog domains and systems added as cards
  'context-domain': { icon: Boxes, className: 'text-yellow-500' },
  system: { icon: Group, className: 'text-violet-600' },
  service: { icon: ServerIcon, className: 'text-pink-600' },
  event: { icon: Zap, className: 'text-orange-600' },
  command: { icon: Mail, className: 'text-blue-600' },
  query: { icon: Search, className: 'text-green-600' },
  channel: { icon: ArrowRightLeft, className: 'text-gray-600' },
  data: { icon: Database, className: 'text-blue-600' },
  view: { icon: MonitorSmartphone, className: 'text-sky-600' },
  externalSystem: { icon: Globe, className: 'text-purple-600' },
  agent: { icon: Bot, className: 'text-violet-600' },
  actor: { icon: User, className: 'text-sky-600' },
  note: { icon: StickyNote, className: 'text-yellow-500' },
  text: { icon: Type, className: 'text-[rgb(var(--ec-icon-color))]' },
};

/** The catalog's collections, in the order the catalog list shows them, with the icon of the node each becomes */
export const CATALOG_GROUPS: ({ collection: string; label: string } & NodeIcon)[] = [
  { collection: 'domains', label: 'Domains', ...NODE_ICONS[GROUP_TYPES.domain] },
  { collection: 'systems', label: 'Systems', ...NODE_ICONS[GROUP_TYPES.system] },
  { collection: 'services', label: 'Services', ...NODE_ICONS.service },
  { collection: 'events', label: 'Events', ...NODE_ICONS.event },
  { collection: 'commands', label: 'Commands', ...NODE_ICONS.command },
  { collection: 'queries', label: 'Queries', ...NODE_ICONS.query },
  { collection: 'channels', label: 'Channels', ...NODE_ICONS.channel },
  { collection: 'containers', label: 'Data Stores', ...NODE_ICONS.data },
];
