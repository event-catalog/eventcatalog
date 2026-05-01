import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { ExternalLink, MessageSquare, ServerCog, Wrench } from 'lucide-react';
import { aiSettingsSchema } from '@utils/eventcatalog-config/config-schema';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { Row, cn } from './Row';
import { ASSISTANT_CONFIGURATION_DOCS_URL, ASSISTANT_DOCS_URL, ToggleRow, UpgradeRequired } from './SettingsShared';

interface Props {
  canEdit: boolean;
  initial: { chatEnabled: boolean; llmsTxtEnabled: boolean };
  chatAvailable: boolean;
  hasPlan: boolean;
  inSSR: boolean;
  hasChatConfigFile: boolean;
  apiBase: string;
}

export const AssistantSettingsForm = ({ canEdit, initial, chatAvailable, hasPlan, inSSR, hasChatConfigFile, apiBase }: Props) => {
  const [chatEnabled, setChatEnabled] = useState(initial.chatEnabled);
  const [pristine, setPristine] = useState(initial.chatEnabled);
  const [saving, setSaving] = useState(false);

  const dirty = chatEnabled !== pristine;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const save = async () => {
    if (!canEdit) return;
    const candidate = aiSettingsSchema.safeParse({
      llmsTxtEnabled: initial.llmsTxtEnabled,
      chatEnabled,
    });
    if (!candidate.success) {
      toast.error('Invalid settings');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate.data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Could not save');
        return;
      }
      setPristine(chatEnabled);
      toast.success('Saved to eventcatalog.config.js');
    } catch (err) {
      toast.error(`Could not save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="divide-y divide-[rgb(var(--ec-page-border))]">
      <Toaster richColors closeButton position="bottom-right" theme="system" />
      {!canEdit && (
        <div className="pb-6">
          <ReadOnlyBanner />
        </div>
      )}

      <Row
        title="Assistant Agent"
        description="Assistant agent that answers questions about your architecture directly in your catalog."
        canEdit={canEdit && chatAvailable}
        dirty={dirty}
        saving={saving}
        onSave={chatAvailable ? save : undefined}
      >
        {chatAvailable ? (
          <div className="space-y-3">
            <ToggleRow
              icon={<MessageSquare className="h-4 w-4" aria-hidden />}
              label={chatEnabled ? 'Enabled' : 'Disabled'}
              hint={chatEnabled ? 'Chat is available to readers of this catalog.' : 'Chat is hidden from the catalog.'}
              checked={chatEnabled}
              disabled={!canEdit}
              onChange={setChatEnabled}
            />
            {chatEnabled && <ConfigurationRequired />}
          </div>
        ) : !hasPlan ? (
          <UpgradeRequired
            tier="Starter and Scale"
            blurb="The EventCatalog Assistant is part of our paid plans. Upgrade to give your team a built-in AI agent that answers questions about your architecture."
            docsUrl={ASSISTANT_DOCS_URL}
          />
        ) : !inSSR ? (
          <AssistantNeedsSSR />
        ) : !hasChatConfigFile ? (
          <AssistantNeedsConfigFile />
        ) : null}
      </Row>
    </form>
  );
};

const ConfigurationRequired = () => (
  <div className="rounded-lg border border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent)/0.06)] px-4 py-3">
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent)/0.1)] text-[rgb(var(--ec-accent))]">
        <Wrench className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[rgb(var(--ec-page-text))]">Configuration required</p>
        <p className="mt-0.5 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
          The Agent needs an{' '}
          <code className="rounded bg-[rgb(var(--ec-page-bg))] px-1 py-0.5 font-mono text-[11px]">eventcatalog.chat.js</code> file
          and a model provider (bring your own model). Follow the configuration guide to set it up.
        </p>
        <a
          href={ASSISTANT_CONFIGURATION_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[rgb(var(--ec-accent))] hover:underline'
          )}
        >
          Configure the Agent
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </div>
  </div>
);

const AssistantNeedsSSR = () => (
  <div className="overflow-hidden rounded-lg border border-[rgb(var(--ec-accent)/0.4)] bg-gradient-to-br from-[rgb(var(--ec-accent)/0.1)] via-[rgb(var(--ec-accent)/0.05)] to-transparent">
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent)/0.1)] text-[rgb(var(--ec-accent))]">
        <ServerCog className="h-4 w-4" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))]">Server output mode required</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-accent))]">
            SSR
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
          Your catalog needs to run as a live server before the Agent can chat.
        </p>
        <p className="mt-1 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
          Switch your catalog to server mode and you’re good to go — the configuration guide walks through it.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={ASSISTANT_CONFIGURATION_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-[rgb(var(--ec-accent))] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[rgb(var(--ec-accent-hover))]"
          >
            Configuration guide
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <a
            href={ASSISTANT_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]"
          >
            Learn more
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  </div>
);

const AssistantNeedsConfigFile = () => (
  <div className="overflow-hidden rounded-lg border border-[rgb(var(--ec-accent)/0.4)] bg-gradient-to-br from-[rgb(var(--ec-accent)/0.1)] via-[rgb(var(--ec-accent)/0.05)] to-transparent">
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent)/0.1)] text-[rgb(var(--ec-accent))]">
        <Wrench className="h-4 w-4" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))]">Add an eventcatalog.chat.js file</p>
        <p className="mt-1 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
          The Agent needs an{' '}
          <code className="rounded bg-[rgb(var(--ec-page-bg))] px-1 py-0.5 font-mono text-[11px]">eventcatalog.chat.js</code> file
          in your catalog directory and a model provider (bring your own model) before it can answer questions.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={ASSISTANT_CONFIGURATION_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-[rgb(var(--ec-accent))] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[rgb(var(--ec-accent-hover))]"
          >
            Configuration guide
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <a
            href={ASSISTANT_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]"
          >
            Learn more
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  </div>
);
