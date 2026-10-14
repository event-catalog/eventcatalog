import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CodeBracketIcon, DocumentTextIcon, MapIcon } from '@heroicons/react/24/solid';
import { EllipsisVerticalIcon, StarIcon } from '@heroicons/react/24/outline';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite } from '@stores/favorites-store';

const MENU_WIDTH = 280;
const MENU_GAP = 6;

interface RowActionsMenuProps {
  title: string;
  /** Link to the resource's documentation page. */
  href: string;
  /** Link to the resource in the visualiser. The menu leaves the visualiser out when absent. */
  visualiserHref?: string;
  /** Link to the resource's schema page. The menu leaves the schema out when absent. */
  schemaHref?: string;
  favorite: { nodeKey: string; badge: string };
}

/** The "..." menu at the end of a table row, with links to the resource and a favorite toggle. */
export function RowActionsMenu({ title, href, visualiserHref, schemaHref, favorite }: RowActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const favorites = useStore(favoritesStore);
  const isFavorite = favorites.some((fav) => fav.nodeKey === favorite.nodeKey);

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
    toggleFavorite({ nodeKey: favorite.nodeKey, path: [], title, badge: favorite.badge, href });
    setIsOpen(false);
  };

  return (
    <div className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Actions"
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
            {visualiserHref && (
              <a
                href={visualiserHref}
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
              >
                <MapIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
                View in visualiser
              </a>
            )}
            {schemaHref && (
              <a
                href={schemaHref}
                className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-accent))]"
              >
                <CodeBracketIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
                View schema
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
}
