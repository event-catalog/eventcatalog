/** Help: the keyboard shortcuts, as drawing tools list them. Tailwind on Headless UI's Dialog */
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { ShortcutsList } from '@eventcatalog/visualiser/studio';

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          // Fits the window (it scrolls when it's short), in two columns where there's room
          className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0"
        >
          <div className="flex flex-none items-center justify-between border-b border-[rgb(var(--ec-page-border))] px-5 py-4">
            <DialogTitle className="text-base font-semibold">Keyboard shortcuts</DialogTitle>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]! hover:text-[rgb(var(--ec-page-text))]!"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
          <ShortcutsList />
        </DialogPanel>
      </div>
    </Dialog>
  );
}
