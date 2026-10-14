/**
 * "Save to file", where the browser can't ask where to save (Firefox, Safari, views in chats): name the file, then
 * it's downloaded. Tailwind with EventCatalog's theme variables, on Headless UI's Dialog.
 */
import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Download, X } from 'lucide-react';
import { DIAGRAM_FILE_EXTENSION } from '@eventcatalog/visualiser/studio';

type SaveFileDialogProps = {
  open: boolean;
  /** The name to start from (without the extension) */
  defaultName: string;
  onSave: (name: string) => void;
  onClose: () => void;
};

const button = 'inline-flex h-9 flex-none items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors [&_svg]:h-4 [&_svg]:w-4';
const primary = `${button} bg-[rgb(var(--ec-primary-bg))] text-[rgb(var(--ec-primary-text))] hover:bg-[rgb(var(--ec-primary-bg)/0.85)]!`;
const secondary = `${button} border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]!`;

export function SaveFileDialog({ open, defaultName, onSave, onClose }: SaveFileDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0"
        >
          {/* Keyed on open, so each time it opens it starts from the diagram's name */}
          {open && <SaveFileForm defaultName={defaultName} onSave={onSave} onClose={onClose} />}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function SaveFileForm({ defaultName, onSave, onClose }: Omit<SaveFileDialogProps, 'open'>) {
  const [name, setName] = useState(defaultName);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(name);
      }}
    >
      <div className="flex items-start gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-base font-semibold">Save to file</DialogTitle>
          <p className="mt-1.5 text-sm font-light leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
            Saves this diagram, with its notes and comments. Open it again from the menu, or drop it on the canvas.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 -mt-1 rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]! hover:text-[rgb(var(--ec-page-text))]!"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <label className="block px-5 pt-4">
        <span className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">File name</span>
        <div className="mt-1.5 flex h-9 items-center rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] pr-3 focus-within:border-[rgb(var(--ec-page-text-muted))]">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            maxLength={120}
            spellCheck={false}
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-[rgb(var(--ec-page-text))] outline-none"
          />
          <span className="flex-none text-sm text-[rgb(var(--ec-page-text-muted))]">{DIAGRAM_FILE_EXTENSION}</span>
        </div>
      </label>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-[rgb(var(--ec-page-border))] px-5 py-3">
        <button type="button" onClick={onClose} className={secondary}>
          Cancel
        </button>
        <button type="submit" className={primary}>
          <Download aria-hidden />
          Save
        </button>
      </div>
    </form>
  );
}
