/**
 * How each type of resource looks, as EventCatalog shows it: its name, its icon (the catalog's, from
 * src/utils/collections/icons.ts) and its colour (the visualiser's, from FocusMode/utils.ts).
 */
import type { ComponentType, SVGProps } from 'react';
import {
  ArrowsRightLeftIcon,
  BoltIcon,
  ChatBubbleLeftIcon,
  ComputerDesktopIcon,
  CubeIcon,
  CpuChipIcon,
  GlobeAltIcon,
  UserIcon,
  MagnifyingGlassIcon,
  RectangleGroupIcon,
  ServerIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { DatabaseIcon, Group } from 'lucide-react';
import { type ResourceType } from '@eventcatalog/visualiser/model';

type Icon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export const RESOURCE_LOOK: Record<ResourceType, { label: string; Icon: Icon; color: string }> = {
  domain: { label: 'Domain', Icon: RectangleGroupIcon, color: 'yellow' },
  system: { label: 'System', Icon: Group as Icon, color: 'purple' },
  service: { label: 'Service', Icon: ServerIcon, color: 'pink' },
  event: { label: 'Event', Icon: BoltIcon, color: 'orange' },
  command: { label: 'Command', Icon: ChatBubbleLeftIcon, color: 'blue' },
  query: { label: 'Query', Icon: MagnifyingGlassIcon, color: 'green' },
  channel: { label: 'Channel', Icon: ArrowsRightLeftIcon, color: 'gray' },
  container: { label: 'Data store', Icon: DatabaseIcon as Icon, color: 'blue' },
  actor: { label: 'Actor', Icon: UserIcon, color: 'sky' },
  'external-system': { label: 'External system', Icon: GlobeAltIcon, color: 'purple' },
  agent: { label: 'Agent', Icon: CpuChipIcon, color: 'violet' },
  view: { label: 'View', Icon: ComputerDesktopIcon, color: 'sky' },
  entity: { label: 'Entity', Icon: CubeIcon, color: 'blue' },
  team: { label: 'Team', Icon: UserGroupIcon, color: 'emerald' },
};

/** The type's pill, as on the visualiser's nodes */
export function TypePill({ type }: { type: ResourceType }) {
  const look = RESOURCE_LOOK[type];
  return (
    <span className="ec-type-pill" data-color={look.color}>
      {look.label}
    </span>
  );
}

/** The type's icon, in its colour */
export function TypeIcon({ type, className = 'ec-type-icon' }: { type: ResourceType; className?: string }) {
  const { Icon, color } = RESOURCE_LOOK[type];
  return <Icon className={className} data-color={color} aria-hidden />;
}
