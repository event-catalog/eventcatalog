import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Braces, Ellipsis, Star, Workflow } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { favoritesStore, toggleFavorite } from '@stores/favorites-store';

const MENU_WIDTH = 208;
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

const itemClass =
  'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-page-text)/0.05)] focus:bg-[rgb(var(--ec-page-text)/0.05)] focus:outline-none';
const iconClass = 'h-3.5 w-3.5 shrink-0 text-[rgb(var(--ec-page-text-muted))]';

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
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[rgb(var(--ec-page-text)/0.06)] hover:text-[rgb(var(--ec-page-text))] ${
          isOpen ? 'bg-[rgb(var(--ec-page-text)/0.06)] text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text-muted))]'
        }`}
      >
        <Ellipsis className="h-4 w-4" />
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
            // A small popover: rounded rows with line icons, the favourite on its own under a hairline
            className="z-50 overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] p-1 shadow-[0_8px_30px_rgb(0_0_0/0.12)]"
          >
            <a href={href} role="menuitem" className={itemClass}>
              <BookOpen className={iconClass} />
              View documentation
            </a>
            {visualiserHref && (
              <a href={visualiserHref} role="menuitem" className={itemClass}>
                <Workflow className={iconClass} />
                View in visualiser
              </a>
            )}
            {schemaHref && (
              <a href={schemaHref} role="menuitem" className={itemClass}>
                <Braces className={iconClass} />
                View schema
              </a>
            )}
            <div className="-mx-1 my-1 h-px bg-[rgb(var(--ec-page-border))]" role="separator" />
            <button type="button" role="menuitem" onClick={handleToggleFavorite} className={itemClass}>
              <Star className={isFavorite ? 'h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400' : iconClass} />
              {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
