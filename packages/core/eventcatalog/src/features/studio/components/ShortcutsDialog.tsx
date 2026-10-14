import { useEffect } from 'react';
import { X } from 'lucide-react';
import { ShortcutsList } from '@eventcatalog/visualiser/studio';

/** What Studio here doesn't have of the shortcuts Studio on the web lists */
const NOT_HERE = ['Command palette', 'Find on canvas'];

/** Help: the keyboard shortcuts, as Studio on the web lists them */
export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl"
      >
        <div className="flex flex-none items-center justify-between border-b border-[rgb(var(--ec-page-border))] px-5 py-4">
          <h2 id="shortcuts-title" className="text-base font-semibold">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))]"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <ShortcutsList omit={NOT_HERE} />
      </div>
    </div>
  );
}
