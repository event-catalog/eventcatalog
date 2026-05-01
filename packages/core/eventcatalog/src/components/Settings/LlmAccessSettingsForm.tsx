import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Bot, FileText } from 'lucide-react';
import { aiSettingsSchema } from '@utils/eventcatalog-config/config-schema';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { Row } from './Row';
import { ToggleRow, UpgradeRequired, UrlPanel } from './SettingsShared';

interface Props {
  canEdit: boolean;
  initial: { llmsTxtEnabled: boolean; chatEnabled: boolean };
  hasScalePlan: boolean;
  apiBase: string;
  llmsTxtUrl: string;
  schemasTxtUrl: string;
}

export const LlmAccessSettingsForm = ({ canEdit, initial, hasScalePlan, apiBase, llmsTxtUrl, schemasTxtUrl }: Props) => {
  const [llmsTxtEnabled, setLlmsTxtEnabled] = useState(initial.llmsTxtEnabled);
  const [pristine, setPristine] = useState(initial.llmsTxtEnabled);
  const [saving, setSaving] = useState(false);

  const dirty = llmsTxtEnabled !== pristine;

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
      llmsTxtEnabled,
      chatEnabled: initial.chatEnabled,
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
      setPristine(llmsTxtEnabled);
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
        title="llms.txt"
        description="Generate llms.txt files so tools like Claude, ChatGPT, and Cursor can read your catalog at /docs/llm/llms.txt."
        canEdit={canEdit}
        dirty={dirty}
        saving={saving}
        onSave={save}
      >
        <ToggleRow
          icon={<Bot className="h-4 w-4" aria-hidden />}
          label={llmsTxtEnabled ? 'Enabled' : 'Disabled'}
          hint={
            llmsTxtEnabled
              ? 'AI tools can read your catalog at /docs/llm/llms.txt.'
              : 'AI tools will not be able to read your catalog.'
          }
          checked={llmsTxtEnabled}
          disabled={!canEdit}
          onChange={setLlmsTxtEnabled}
        />
        {llmsTxtEnabled && <LlmsTxtPreview url={llmsTxtUrl} />}
      </Row>

      <Row
        title="schemas.txt"
        description="Give LLMs access to every schema across your organization in one place — events, commands, queries, and services."
        canEdit={false}
        dirty={false}
      >
        {hasScalePlan ? (
          <SchemasTxtAvailable url={schemasTxtUrl} />
        ) : (
          <UpgradeRequired
            tier="Scale"
            blurb="The schema index is a Scale-plan feature. Upgrade to publish a machine-readable catalogue of your schemas alongside llms.txt."
          />
        )}
      </Row>
    </form>
  );
};

const LlmsTxtPreview = ({ url }: { url: string }) => {
  const variants = [
    { label: 'Index', path: '/docs/llm/llms.txt' },
    { label: 'Full', path: '/docs/llm/llms-full.txt' },
  ];
  return (
    <div className="rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.4)] px-4 py-3">
      <p className="text-[12px] font-medium text-[rgb(var(--ec-page-text))]">Point your LLM here</p>
      <p className="mt-0.5 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
        Drop this URL into Claude, ChatGPT, Cursor, or any AI tool to give it the full context of your catalog.
      </p>
      <p className="mt-1 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
        From there you can ask questions about your architecture, services, and events.
      </p>
      <div className="mt-2.5">
        <UrlPanel url={url} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {variants.map((v) => (
          <a
            key={v.path}
            href={v.path}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--ec-page-border))] px-2 py-0.5 text-[11px] text-[rgb(var(--ec-page-text-muted))] transition-colors hover:border-[rgb(var(--ec-accent)/0.5)] hover:text-[rgb(var(--ec-accent))]"
          >
            {v.label}
          </a>
        ))}
      </div>
    </div>
  );
};

const SchemasTxtAvailable = ({ url }: { url: string }) => (
  <div className="space-y-3">
    <ToggleRow
      icon={<FileText className="h-4 w-4" aria-hidden />}
      label="Enabled"
      hint="A markdown index of every event, command, query, and service schema in your catalog."
      checked={true}
      disabled={true}
      onChange={() => {}}
    />
    <div className="rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.4)] px-4 py-3">
      <p className="text-[12px] font-medium text-[rgb(var(--ec-page-text))]">Point your LLM here</p>
      <p className="mt-0.5 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
        Share this URL with Claude, ChatGPT, Cursor, or any AI tool to give it every schema in your catalog.
      </p>
      <p className="mt-1 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
        Perfect for asking about message shapes, fields, and contracts.
      </p>
      <div className="mt-2.5">
        <UrlPanel url={url} />
      </div>
    </div>
  </div>
);
