/**
 * "Export…": the diagram as an image (a PNG, as Export image does), or its model (what Save to file writes: the
 * resources, connections, notes and layout) copied to the clipboard, to paste into a chat, an issue or a file.
 * Tailwind with EventCatalog's theme variables, on Headless UI's Dialog.
 */
import type { ReactNode } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Braces, ImageDown, X } from 'lucide-react';

type ExportDialogProps = {
  open: boolean;
  onExportImage: () => void;
  onCopyModel: () => void;
  onClose: () => void;
};

export function ExportDialog({ open, onExportImage, onCopyModel, onClose }: ExportDialogProps) {
  const option = (title: string, description: string, icon: ReactNode, onSelect: () => void) => (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-3 rounded-lg border border-[rgb(var(--ec-page-border))] p-3 text-left transition-colors hover:bg-[rgb(var(--ec-content-hover))]! focus-visible:outline-2 focus-visible:outline-[rgb(var(--ec-accent))]"
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text))] [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[1.75]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-sm font-light leading-relaxed text-[rgb(var(--ec-page-text-muted))]">{description}</span>
      </span>
    </button>
  );

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0"
        >
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold">Export</DialogTitle>
              <p className="mt-1.5 text-sm font-light leading-relaxed text-[rgb(var(--ec-page-text-muted))]">How do you want to export this diagram?</p>
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
          <div className="space-y-2 px-5 pb-5 pt-4">
            {option('As an image', 'The whole diagram, with its notes, as a PNG.', <ImageDown />, onExportImage)}
            {option(
              'Export model',
              'Copies the diagram’s model (its resources, connections, notes and layout) to the clipboard, as Save to file writes it.',
              <Braces />,
              onCopyModel
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
