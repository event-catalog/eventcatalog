import { createColumnHelper } from '@tanstack/react-table';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DocumentTextIcon, MapIcon } from '@heroicons/react/24/solid';
import {
  ArrowDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  EllipsisVerticalIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import { getColorAndIconForCollection } from '@utils/collections/icons';
import { getCollectionTextColorClass } from '@utils/collection-colors';
import { getBadgeHref, getBadgeReactStyle } from '@utils/badge-styles';
import { isIconPath, resolveIconUrl } from '@utils/icon';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite, type FavoriteItem } from '../../../stores/favorites-store';
import type { DiscoverTableData, CollectionType } from './DiscoverTable';
import type { TableConfiguration } from '@types';
import { formatAdrDate, isAdrCollection } from '@utils/collections/adr-constants';
import { CornerDownRight } from 'lucide-react';

const columnHelper = createColumnHelper<DiscoverTableData>();

const getAgentProviderIconUrls = (provider?: string) => {
  if (!provider) return null;
  const providerIconName = provider
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const hasThemedIcon = ['openai', 'anthropic'].includes(providerIconName);

  return hasThemedIcon
    ? {
        light: resolveIconUrl(`/icons/agent/${providerIconName}-light.svg`),
        dark: resolveIconUrl(`/icons/agent/${providerIconName}-dark.svg`),
      }
    : {
        default: resolveIconUrl(`/icons/agent/${providerIconName}.svg`),
      };
};

const AgentProviderIcon = ({ provider, className }: { provider: string; className: string }) => {
  const providerIconUrls = getAgentProviderIconUrls(provider);
  if (!providerIconUrls) return null;

  if ('light' in providerIconUrls && 'dark' in providerIconUrls) {
    return (
      <>
        <img src={providerIconUrls.light} alt="" className={`${className} dark:hidden`} loading="lazy" />
        <img src={providerIconUrls.dark} alt="" className={`hidden ${className} dark:inline-block`} loading="lazy" />
      </>
    );
  }

  return <img src={providerIconUrls.default} alt="" className={className} loading="lazy" />;
};

// Badge cell component (proper React component to use hooks)
const BadgesCell = ({
  badges,
}: {
  badges: Array<{ content: string; backgroundColor?: string; textColor?: string; url?: string }>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!badges || badges.length === 0) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;

  const visibleItems = isExpanded ? badges : badges.slice(0, 3);
  const hiddenCount = badges.length - 3;

  return (
    <div className="flex flex-col gap-1 items-start">
      {visibleItems.map((badge, index) => {
        const href = getBadgeHref(badge);
        const className =
          'inline-flex items-center px-2 py-0.5 text-[11px] font-normal rounded-md max-w-[140px] truncate border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] bg-transparent';

        return href ? (
          <a
            key={`${badge.content}-${index}`}
            href={href}
            className={className}
            style={getBadgeReactStyle(badge)}
            title={badge.content}
          >
            <span className="truncate">{badge.content}</span>
            <ArrowTopRightOnSquareIcon className="ml-1 h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
          </a>
        ) : (
          <span key={`${badge.content}-${index}`} className={className} style={getBadgeReactStyle(badge)} title={badge.content}>
            {badge.content}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs text-[rgb(var(--ec-accent))] hover:underline">
          {isExpanded ? 'less' : `+${hiddenCount}`}
        </button>
      )}
    </div>
  );
};

// Shared badge column
const createBadgesColumn = (tableConfiguration: TableConfiguration) =>
  columnHelper.accessor((row) => row.data.badges, {
    id: 'badges',
    header: () => <span>{tableConfiguration?.columns?.badges?.label || 'Badges'}</span>,
    enableSorting: false,
    cell: (info) => <BadgesCell badges={info.getValue() || []} />,
    meta: {
      showFilter: false,
    },
  });

const ResourceNameCell = ({ item }: { item: DiscoverTableData }) => {
  const isLatestVersion = item.data.version === item.data.latestVersion;
  const { color, Icon } = getColorAndIconForCollection(item.collection);
  const resourceIcon = item.data.icon;
  const resourceIconUrl = isIconPath(resourceIcon) ? resolveIconUrl(resourceIcon) : null;
  const isDomain = item.collection === 'domains';
  const subdomains = isDomain ? item.data.domains || [] : [];

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <a
        href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
        className="group inline-flex items-center gap-2.5 hover:text-[rgb(var(--ec-accent))] transition-colors"
      >
        {resourceIconUrl ? (
          <img src={resourceIconUrl} alt="" className="h-5 w-5 flex-shrink-0 rounded-sm object-contain" />
        ) : (
          <Icon className={`h-4 w-4 flex-shrink-0 ${getCollectionTextColorClass(color, 'text-[rgb(var(--ec-icon-color))]')}`} />
        )}
        <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))] group-hover:text-[rgb(var(--ec-accent))]">
          {item.data.name}
        </span>
        {!isLatestVersion && <span className="text-xs text-[rgb(var(--ec-icon-color))]">v{item.data.version}</span>}
        {item.isSubdomain && (
          <span className="rounded-full border border-[rgb(var(--ec-page-border))] px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--ec-page-text-muted))]">
            Subdomain
          </span>
        )}
      </a>

      {subdomains.length > 0 && (
        <div className="flex flex-col gap-1 pl-6">
          {subdomains.map((domain: any) => (
            <a
              key={`${domain.data.id}-${domain.data.version}`}
              href={buildUrl(`/docs/${domain.collection || 'domains'}/${domain.data.id}/${domain.data.version}`)}
              className="group/subdomain inline-flex w-fit items-center gap-1.5 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-accent))]"
            >
              <CornerDownRight className="h-3.5 w-3.5 flex-shrink-0 text-[rgb(var(--ec-icon-color))] group-hover/subdomain:text-[rgb(var(--ec-accent))]" />
              <span className="font-medium text-[rgb(var(--ec-page-text))] group-hover/subdomain:text-[rgb(var(--ec-accent))]">
                {domain.data.name}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

const MENU_WIDTH = 280;
const MENU_GAP = 6;

const RowActionsMenu = ({ item, collectionType }: { item: DiscoverTableData; collectionType: CollectionType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const favorites = useStore(favoritesStore);
  const href = buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`);
  const visualiserHref = buildUrl(`/visualiser/${item.collection}/${item.data.id}/${item.data.version}`);
  const hasVisualiser = !isAdrCollection(item.collection);
  const nodeKey = `${item.collection}-${item.data.id}-${item.data.version}`;
  const badgeLabel =
    collectionType === 'external-systems'
      ? 'External System'
      : collectionType.charAt(0).toUpperCase() + collectionType.slice(1, -1);
  const isFavorite = favorites.some((fav) => fav.nodeKey === nodeKey);

  // The table lives inside scrollable, overflow-hidden containers, so the menu is
  // rendered in a portal with fixed positioning to avoid being clipped.
  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom;

    // Flip above the trigger when there isn't enough room below it.
    const openUpwards = menuHeight > 0 && spaceBelow < menuHeight + MENU_GAP && rect.top > spaceBelow;
    const top = openUpwards ? rect.top - menuHeight - MENU_GAP : rect.bottom + MENU_GAP;
    const left = Math.max(MENU_GAP, rect.right - MENU_WIDTH);

    setMenuPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  const handleToggleFavorite = () => {
    const favoriteItem: FavoriteItem = {
      nodeKey,
      path: [],
      title: item.data.name,
      badge: badgeLabel,
      href,
    };
    toggleFavorite(favoriteItem);
    setIsOpen(false);
  };

  return (
    <div className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-md p-1.5 text-[rgb(var(--ec-icon-color))] transition-colors hover:bg-[rgb(var(--ec-content-hover)/0.5)] hover:text-[rgb(var(--ec-page-text))]"
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: menuPosition?.top ?? -9999,
              left: menuPosition?.left ?? -9999,
              width: MENU_WIDTH,
              visibility: menuPosition ? 'visible' : 'hidden',
            }}
            className="z-50 overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg))] shadow-xl"
          >
            <a
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
            >
              <DocumentTextIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
              View documentation
            </a>
            {hasVisualiser && (
              <a
                href={visualiserHref}
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
              >
                <MapIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
                View in visualiser
              </a>
            )}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
            >
              <StarIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
              {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

// Shared actions column
const createActionsColumn = (collectionType: CollectionType, tableConfiguration: TableConfiguration) =>
  columnHelper.accessor('data.name', {
    id: 'actions',
    header: () => <span></span>,
    enableSorting: false,
    cell: (info) => {
      const item = info.row.original;
      return <RowActionsMenu item={item} collectionType={collectionType} />;
    },
    meta: {
      showFilter: false,
    },
  });

// Shared summary column
const createSummaryColumn = (tableConfiguration: TableConfiguration) =>
  columnHelper.accessor('data.summary', {
    id: 'summary',
    header: () => <span>{tableConfiguration?.columns?.summary?.label || 'Summary'}</span>,
    cell: (info) => {
      const summary = info.renderValue() as string;
      const isDraft = info.row.original.data.draft;
      const displayText = `${summary || ''}${isDraft ? ' (Draft)' : ''}`;
      return (
        <span className="text-[0.8rem] text-[rgb(var(--ec-icon-color))] line-clamp-2" title={displayText}>
          {displayText}
        </span>
      );
    },
    meta: {
      showFilter: false,
      className: 'max-w-md',
    },
  });

// Collection list cell renderer (for producers, consumers, services, etc.)
const CollectionListCell = ({
  items,
  emptyText = '-',
  maxVisible = 3,
}: {
  items: Array<{ collection: string; data: { id: string; name: string; version: string } }> | undefined;
  emptyText?: string;
  maxVisible?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const itemsWithIcons = useMemo(
    () =>
      items?.map((item) => ({
        ...item,
        ...getColorAndIconForCollection(item.collection),
      })) || [],
    [items]
  );

  if (!items || items.length === 0) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">{emptyText}</span>;

  const visibleItems = isExpanded ? itemsWithIcons : itemsWithIcons.slice(0, maxVisible);
  const hiddenCount = itemsWithIcons.length - maxVisible;

  return (
    <div className="flex flex-col gap-1">
      {visibleItems.map((item, index: number) => (
        <a
          key={`${item.data.id}-${index}`}
          href={buildUrl(`/docs/${item.collection}/${item.data.id}/${item.data.version}`)}
          className="group inline-flex items-center gap-1.5 text-[0.8rem] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] transition-colors"
        >
          <item.Icon className={`h-3.5 w-3.5 ${getCollectionTextColorClass(item.color)} flex-shrink-0`} />
          <span className="truncate max-w-[120px]" title={item.data.name}>
            {item.data.name}
          </span>
        </a>
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[rgb(var(--ec-accent))] hover:underline text-left"
        >
          {isExpanded ? 'Show less' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// AGENT COLUMNS
// ============================================================================
export const getAgentColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Agent'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor((row) => row.data.model?.provider, {
    id: 'provider',
    header: () => <span>{tableConfiguration?.columns?.provider?.label || 'Provider'}</span>,
    cell: (info) => {
      const provider = info.getValue() as string | undefined;
      if (!provider) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;
      return (
        <span className="inline-flex items-center gap-2" title={provider} aria-label={provider}>
          <AgentProviderIcon provider={provider} className="h-3 w-3 flex-shrink-0 rounded-sm object-contain" />
          <span className="text-[0.8rem] font-medium text-[rgb(var(--ec-page-text))]">{provider}</span>
        </span>
      );
    },
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.model', {
    id: 'model',
    header: () => <span>{tableConfiguration?.columns?.model?.label || 'Model'}</span>,
    cell: (info) => {
      const model = info.getValue() as any;
      if (!model?.name) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;
      return (
        <div className="flex flex-col gap-0.5 text-[0.8rem]">
          <span className="font-medium text-[rgb(var(--ec-page-text))]">{model.name}</span>
        </div>
      );
    },
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.receives', {
    id: 'receives',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowDownIcon className="w-3.5 h-3.5" />
        Receives
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.sends', {
    id: 'sends',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowUpIcon className="w-3.5 h-3.5" />
        Sends
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('agents', tableConfiguration),
];

// ============================================================================
// ADR COLUMNS
// ============================================================================
export const getAdrColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Decision record'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.statusBadge', {
    id: 'status',
    header: () => <span>{tableConfiguration?.columns?.status?.label || 'Status'}</span>,
    enableSorting: false,
    cell: (info) => {
      const badge = info.getValue();
      if (!badge) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;
      return <BadgesCell badges={[badge]} />;
    },
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.date', {
    id: 'date',
    header: () => <span>{tableConfiguration?.columns?.date?.label || 'Date'}</span>,
    sortingFn: (rowA, rowB) => {
      const left = rowA.original.data.date ? new Date(rowA.original.data.date).getTime() : 0;
      const right = rowB.original.data.date ? new Date(rowB.original.data.date).getTime() : 0;
      return left - right;
    },
    cell: (info) => {
      const date = info.getValue();
      if (!date) return <span className="text-xs text-[rgb(var(--ec-icon-color))]">-</span>;
      return <span className="text-[0.8rem] text-[rgb(var(--ec-page-text))]">{formatAdrDate(new Date(date))}</span>;
    },
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('adrs', tableConfiguration),
];

// ============================================================================
// EVENT COLUMNS
// ============================================================================
export const getEventColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Event'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.producers', {
    id: 'producers',
    header: () => <span>Producers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.consumers', {
    id: 'consumers',
    header: () => <span>Consumers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('events', tableConfiguration),
];

// ============================================================================
// COMMAND COLUMNS
// ============================================================================
export const getCommandColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Command'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.producers', {
    id: 'producers',
    header: () => <span>Producers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.consumers', {
    id: 'consumers',
    header: () => <span>Consumers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('commands', tableConfiguration),
];

// ============================================================================
// QUERY COLUMNS
// ============================================================================
export const getQueryColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Query'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.producers', {
    id: 'producers',
    header: () => <span>Producers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.consumers', {
    id: 'consumers',
    header: () => <span>Consumers</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('queries', tableConfiguration),
];

// ============================================================================
// SERVICE COLUMNS
// ============================================================================
export const getServiceColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Service'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.receives', {
    id: 'receives',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowDownIcon className="w-3.5 h-3.5" />
        Receives
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.sends', {
    id: 'sends',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowUpIcon className="w-3.5 h-3.5" />
        Sends
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('services', tableConfiguration),
];

// ============================================================================
// DOMAIN COLUMNS
// ============================================================================
export const getDomainColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Domain'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.services', {
    id: 'services',
    header: () => <span>Services</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.agents', {
    id: 'agents',
    header: () => <span>Agents</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('domains', tableConfiguration),
];

// ============================================================================
// SYSTEM COLUMNS
// ============================================================================
export const getSystemColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'System'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.services', {
    id: 'services',
    header: () => <span>Services</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.flows', {
    id: 'flows',
    header: () => <span>Flows</span>,
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('systems', tableConfiguration),
];

// ============================================================================
// FLOW COLUMNS
// ============================================================================
export const getFlowColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Flow'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('flows', tableConfiguration),
];

// ============================================================================
// CONTAINER (DATA) COLUMNS
// ============================================================================
export const getContainerColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Data'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.servicesThatWriteToContainer', {
    id: 'writes',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowDownIcon className="w-3.5 h-3.5" />
        Writes
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.servicesThatReadFromContainer', {
    id: 'reads',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowUpIcon className="w-3.5 h-3.5" />
        Reads
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('containers', tableConfiguration),
];

// ============================================================================
// DATA PRODUCT COLUMNS
// ============================================================================
export const getDataProductColumns = (tableConfiguration: TableConfiguration) => [
  columnHelper.accessor('data.name', {
    id: 'name',
    header: () => <span>{tableConfiguration?.columns?.name?.label || 'Data Product'}</span>,
    cell: (info) => <ResourceNameCell item={info.row.original} />,
    meta: {
      filterVariant: 'name',
    },
  }),
  createSummaryColumn(tableConfiguration),
  columnHelper.accessor('data.inputs', {
    id: 'inputs',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowDownIcon className="w-3.5 h-3.5" />
        Inputs
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  columnHelper.accessor('data.outputs', {
    id: 'outputs',
    header: () => (
      <span className="flex items-center gap-1">
        <ArrowUpIcon className="w-3.5 h-3.5" />
        Outputs
      </span>
    ),
    cell: (info) => <CollectionListCell items={info.getValue()} />,
    meta: {
      showFilter: false,
    },
  }),
  createBadgesColumn(tableConfiguration),
  createActionsColumn('data-products', tableConfiguration),
];

// ============================================================================
// COLUMN GETTER BY COLLECTION TYPE
// ============================================================================
export const getDiscoverColumns = (collectionType: CollectionType, tableConfiguration: TableConfiguration) => {
  switch (collectionType) {
    case 'agents':
      return getAgentColumns(tableConfiguration);
    case 'adrs':
      return getAdrColumns(tableConfiguration);
    case 'events':
      return getEventColumns(tableConfiguration);
    case 'commands':
      return getCommandColumns(tableConfiguration);
    case 'queries':
      return getQueryColumns(tableConfiguration);
    case 'services':
    case 'external-systems':
      return getServiceColumns(tableConfiguration);
    case 'domains':
      return getDomainColumns(tableConfiguration);
    case 'systems':
      return getSystemColumns(tableConfiguration);
    case 'flows':
      return getFlowColumns(tableConfiguration);
    case 'containers':
      return getContainerColumns(tableConfiguration);
    case 'data-products':
      return getDataProductColumns(tableConfiguration);
    default:
      return [];
  }
};
