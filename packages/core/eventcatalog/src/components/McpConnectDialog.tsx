import * as Dialog from '@radix-ui/react-dialog';
import { Check, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import McpIcon from './McpIcon';

type McpConnectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverUrl: string;
  resourceName?: string;
  resourceType: 'domain' | 'system';
};

export default function McpConnectDialog({ open, onOpenChange, serverUrl, resourceName, resourceType }: McpConnectDialogProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absoluteServerUrl = new URL(serverUrl, window.location.origin).href;

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  const copyServerUrl = async () => {
    try {
      await navigator.clipboard.writeText(absoluteServerUrl);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[100] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] p-6 shadow-xl focus:outline-hidden data-[state=open]:animate-contentShow">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))]">
              <McpIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Connect to MCP server</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-[rgb(var(--ec-page-text-muted))]">
                Use this URL to connect an MCP client to this {resourceType}
                {resourceName ? `: ${resourceName}` : ''}.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-2 text-[rgb(var(--ec-icon-color))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6">
            <label htmlFor="mcp-server-url" className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">
              MCP server URL
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="mcp-server-url"
                type="text"
                readOnly
                value={absoluteServerUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg,var(--ec-page-bg)))] px-3 py-2.5 font-mono text-xs text-[rgb(var(--ec-page-text))] outline-hidden focus:border-[rgb(var(--ec-accent))] focus:ring-1 focus:ring-[rgb(var(--ec-accent))]"
              />
              <button
                type="button"
                onClick={copyServerUrl}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] px-3 text-sm font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:bg-[rgb(var(--ec-content-hover))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-[rgb(var(--ec-page-text-muted))]">
              Add this remote server URL to your MCP client. Authentication may be required if it is enabled for this catalog.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
