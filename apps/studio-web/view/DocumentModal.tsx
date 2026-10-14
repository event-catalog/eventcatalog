/**
 * "Export to EventCatalog": a prompt to copy into an AI agent, which ports the diagram over to an EventCatalog (with
 * the EventCatalog skills). Kept simple: copy it; the prompt itself is there to read when wanted.
 * Tailwind with EventCatalog's theme variables, on Headless UI's Dialog and Disclosure.
 */
import { useMemo, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { Check, ChevronRight, Copy, SendHorizontal, X } from 'lucide-react';
import { type Model } from '@eventcatalog/visualiser/model';
import { toCatalogPrompt } from '../src/model/to-prompt';
import { copyToClipboard } from './ported/clipboard';
import { track } from './analytics';

type DocumentModalProps = {
  model: Model;
  onClose: () => void;
  /** Sends the prompt to this chat instead (when the host lets the view send messages) */
  onSendToChat?: (prompt: string) => Promise<void>;
};

const button = 'inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4';
const primary = `${button} bg-[rgb(var(--ec-primary-bg))] text-[rgb(var(--ec-primary-text))] hover:bg-[rgb(var(--ec-primary-bg)/0.85)]!`;
const secondary = `${button} border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]!`;

export function DocumentModal({ model, onClose, onSendToChat }: DocumentModalProps) {
  const prompt = useMemo(() => toCatalogPrompt(model), [model]);
  const [status, setStatus] = useState<'idle' | 'copied' | 'copy-failed' | 'sent' | 'send-failed'>('idle');

  const copy = async () => {
    const ok = await copyToClipboard(prompt);
    setStatus(ok ? 'copied' : 'copy-failed');
    track('export_to_eventcatalog_copied', { ok });
  };
  const send = async () => {
    try {
      await onSendToChat?.(prompt);
      setStatus('sent');
      track('export_to_eventcatalog_sent', { ok: true });
    } catch {
      setStatus('send-failed');
      track('export_to_eventcatalog_sent', { ok: false });
    }
  };

  return (
    <Dialog open onClose={onClose} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0"
        >
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold">Export to EventCatalog</DialogTitle>
              <p className="mt-1.5 text-sm font-light leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                Copy this prompt into your AI agent, and it will be ported over to your EventCatalog.
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

          <div className="px-5 pt-4">
            <button type="button" onClick={copy} className={`${primary} w-full justify-center`}>
              {status === 'copied' ? <Check aria-hidden /> : <Copy aria-hidden />}
              {status === 'copied' ? 'Copied: paste it into your agent' : 'Copy prompt'}
            </button>
            {status === 'copy-failed' && <p className="mt-2 text-xs text-red-600">Couldn't copy here: open the prompt below and copy it.</p>}
          </div>

          <Disclosure as="div" className="px-5 pt-3">
            <DisclosureButton className="group flex items-center gap-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]!">
              <ChevronRight aria-hidden className="h-3.5 w-3.5 transition-transform group-data-open:rotate-90" />
              Show prompt
            </DisclosureButton>
            <DisclosurePanel>
              <textarea
                readOnly
                value={prompt}
                rows={9}
                aria-label="Prompt"
                className="mt-2 block w-full resize-y rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] p-3 font-mono text-[11px] leading-relaxed text-[rgb(var(--ec-page-text))] outline-none"
              />
            </DisclosurePanel>
          </Disclosure>

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-[rgb(var(--ec-page-border))] px-5 py-3">
            {onSendToChat && (
              <button type="button" onClick={send} disabled={status === 'sent'} className={`${secondary} mr-auto`}>
                <SendHorizontal aria-hidden />
                {status === 'sent' ? 'Sent to the chat' : 'Ask this chat instead'}
              </button>
            )}
            <button type="button" onClick={onClose} className={secondary}>
              Done
            </button>
          </div>
          {status === 'send-failed' && <p className="px-5 pb-3 text-xs text-red-600">Couldn't send this to the chat. Copy it instead.</p>}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
