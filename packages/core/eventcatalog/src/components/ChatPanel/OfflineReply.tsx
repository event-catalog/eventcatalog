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
