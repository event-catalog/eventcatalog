import { ArrowUpRight } from 'lucide-react';
import { buildUrl } from '@utils/url-builder';

const setupUrl = 'https://www.eventcatalog.dev/docs/development/ask-your-architecture/eventcatalog-assistant/configuration';
const introduction = 'Your whole catalog, connected to your AI.';
const description =
  'Bring your own model and I can help you understand your services, trace how events flow, and explore the impact of a change across your whole catalog.';
const privacy = 'You choose where your data is processed: on your own infrastructure or with a model provider you trust.';
const setup = 'I’m not connected to a model yet. Your catalog owner can connect one to get started.';

export const offlineReplyText = `${introduction}\n\n${description}\n\n${privacy}\n\n${setup}`;

export default function OfflineReply() {
  return (
    <div className="ec-chat-offline w-full space-y-4 py-2 text-[13px] leading-relaxed text-[rgb(var(--ec-content-text))]">
      <div className="space-y-2">
        <p className="text-base font-medium leading-snug text-[rgb(var(--ec-page-text))]">{introduction}</p>
        <p>{description}</p>
      </div>
      <div className="space-y-3 rounded-xl border border-[rgb(var(--ec-accent)/0.15)] bg-[rgb(var(--ec-accent)/0.04)] p-4">
        <div className="space-y-1">
          <p className="font-medium text-[rgb(var(--ec-page-text))]">Your model. Your control.</p>
          <p className="text-[rgb(var(--ec-page-text-muted))]">{privacy}</p>
        </div>
        <p>{setup}</p>
        <a
          href={setupUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--ec-accent))] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[rgb(var(--ec-accent-hover))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--ec-accent))]"
        >
          Connect your model
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
      <p className="text-xs leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
        Don’t need the assistant?{' '}
        <a href={buildUrl('/settings/assistant')} className="underline underline-offset-2 hover:text-[rgb(var(--ec-page-text))]">
          Turn off Event Catalog Assistant
        </a>{' '}
        or set <code className="text-[11px]">chat.enabled: false</code> in your catalog configuration.
      </p>
    </div>
  );
}

/**
 * The chat's error, from the chat API's JSON body when there is one. A configuration error means
 * eventcatalog.chat.js didn't load; `reason` says why (dev mode only).
 */
export type ChatError = { type: 'configuration'; reason?: string } | { type: 'error'; message: string };

export const getChatError = (error: Error | undefined): ChatError => {
  const fallback = 'Something went wrong. Please try again.';
  if (!error) return { type: 'error', message: fallback };
  try {
    const body = JSON.parse(error.message);
    if (body?.code === 'CHAT_CONFIGURATION_ERROR') return { type: 'configuration', reason: body.reason };
    if (typeof body?.error === 'string') return { type: 'error', message: body.error };
  } catch {
    // Not JSON: the error message is already readable
  }
  return { type: 'error', message: error.message || fallback };
};

/**
 * The assistant's reply when eventcatalog.chat.js exists but didn't load. In dev mode (with the
 * reason) it walks the catalog owner through the fix; otherwise it points readers to the owner.
 */
export function ConfigurationErrorReply({ reason }: { reason?: string }) {
  return (
    <div className="ec-chat-offline w-full space-y-4 py-2 text-[13px] leading-relaxed text-[rgb(var(--ec-content-text))]">
      <div className="space-y-2">
        <p className="text-base font-medium leading-snug text-[rgb(var(--ec-page-text))]">I can’t reach your model yet.</p>
        <p>
          Your catalog has an <code className="text-[12px]">eventcatalog.chat.js</code>, but it didn’t load, so I’m not connected
          to a model.
        </p>
      </div>
      <div className="space-y-3 rounded-xl border border-[rgb(var(--ec-accent)/0.15)] bg-[rgb(var(--ec-accent)/0.04)] p-4">
        {reason ? (
          <>
            <div className="space-y-1.5">
              <p className="font-medium text-[rgb(var(--ec-page-text))]">What went wrong</p>
              <pre className="whitespace-pre-wrap break-words rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] px-3 py-2 font-mono text-[11px] text-[rgb(var(--ec-page-text))]">
                {reason}
              </pre>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-[rgb(var(--ec-page-text))]">How to fix it</p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  Install the packages your <code className="text-[12px]">eventcatalog.chat.js</code> imports in your catalog,
                  e.g. <code className="text-[12px]">npm install ai @ai-sdk/anthropic</code>.
                </li>
                <li>
                  Add the provider’s API key to the <code className="text-[12px]">.env</code> file in your catalog, e.g.{' '}
                  <code className="text-[12px]">ANTHROPIC_API_KEY</code>.
                </li>
                <li>Restart EventCatalog.</li>
              </ol>
            </div>
          </>
        ) : (
          <p>Your catalog owner can find out why in the server logs, under “Error loading chat configuration”.</p>
        )}
        <a
          href={setupUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--ec-accent))] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[rgb(var(--ec-accent-hover))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--ec-accent))]"
        >
          Configuration guide
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
