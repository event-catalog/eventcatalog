import { memo, useState, type FormEvent, type ReactNode } from 'react';
import type { Node } from '@xyflow/react';
import { Box, ExternalLink, Library, Trash2, X } from 'lucide-react';
import { getCatalogLink } from '../catalog';
import { getNodeLabel, getResource, isVersioned, updateResource } from '../node-types';
import type { UpdateNodeData } from './canvas-nodes';
import { NODE_ICONS } from './icons';
import { STATUS } from './status';

const inputClass =
  'w-full rounded-lg border px-3 py-2 text-sm shadow-sm bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))] placeholder:text-[rgb(var(--ec-page-text-muted))] focus:outline-none focus:border-[rgb(var(--ec-accent))] focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.25)] read-only:cursor-default read-only:opacity-70 read-only:shadow-none read-only:focus:ring-0 read-only:focus:border-[rgb(var(--ec-input-border))]';
const buttonClass = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors';

// Versions are usually semantic versions (1.0.0), but any text is allowed
const LOOKS_LIKE_A_VERSION = /^v?\d+(\.\d+){0,2}([-+][\w.-]+)?$/;

/** How to name each type, shown under the name */
const NAME_HINTS: Record<string, string> = {
  event: 'The name of the event. Use a verb-noun format in the past tense (e.g., OrderPlaced).',
  command: 'The name of the command. Use an instruction (e.g., PlaceOrder).',
  query: 'The name of the query. Ask for something (e.g., GetOrder).',
  service: 'The name of the service (e.g., Orders Service).',
  channel: 'The name of the channel (e.g., orders.events).',
};

type Field = 'name' | 'version' | 'summary';

/**
 * The details of the node being edited: its name, version and summary, saved together with Save changes (one
 * change for everyone, and one step to undo). Catalog resources are read only: they're changed in the catalog.
 * Notes and text are edited on the canvas.
 */
export default memo(function PropertiesPanel({
  node,
  onChange,
  onDelete,
  onClose,
}: {
  /** What's shown of the node (not its position, so dragging it doesn't re-render the panel) */
  node: Pick<Node, 'id' | 'type' | 'data'>;
  onChange: UpdateNodeData;
  onDelete: (ids: string[]) => void;
  onClose: () => void;
}) {
  const resource = getResource(node.type, node.data);
  const link = getCatalogLink(node);
  const label = getNodeLabel(node.type);
  const noun = label.toLowerCase();
  const { icon: Icon, className: iconClassName } = NODE_ICONS[node.type ?? ''] ?? { icon: Box, className: '' };
  const versioned = isVersioned(node.type);

  // What's been changed here and not saved. Fields not changed show the node as it is, so changes others make while
  // it's open show up.
  const [draft, setDraft] = useState<Partial<Record<Field, string>>>({});
  const saved: Record<Field, string> = {
    name: String(resource.name ?? ''),
    version: String(link?.version ?? resource.version ?? ''),
    summary: String(resource.summary ?? ''),
  };
  const value = (field: Field) => draft[field] ?? saved[field];
  const edit = (field: Field) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }));

  const changes = Object.entries(draft).filter(([field, text]) => text !== saved[field as Field]);
  const missing = !value('name').trim() || (versioned && !value('version').trim());
  const canSave = !link && changes.length > 0 && !missing;
  const version = value('version');

  const save = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSave) return;
    onChange(node.id, (data) => updateResource(node.type, data, Object.fromEntries(changes)));
    setDraft({});
    onClose();
  };

  return (
    <aside className="flex w-[22rem] shrink-0 flex-col border-l bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))]">
      <header className="flex items-center gap-3 border-b px-5 py-4 border-[rgb(var(--ec-page-border))]">
        <Icon size={22} className={`shrink-0 ${iconClassName}`} />
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{label}</h2>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close"
          className="shrink-0 rounded-md p-1 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)] hover:text-[rgb(var(--ec-icon-hover))]"
        >
          <X size={18} />
        </button>
      </header>

      <form
        onSubmit={save}
        // ⌘/Ctrl + Enter saves from any field (Enter alone adds a line to the summary)
        onKeyDown={(event) => (event.metaKey || event.ctrlKey) && event.key === 'Enter' && save(event)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {link && (
            <div className="space-y-2 rounded-lg border p-3 text-xs bg-[rgb(var(--ec-accent-subtle)/0.5)] border-[rgb(var(--ec-accent)/0.25)]">
              <p className="flex items-center gap-1.5 font-semibold text-[rgb(var(--ec-page-text))]">
                <Library size={14} className="text-[rgb(var(--ec-accent))]" />
                From your catalog
              </p>
              <p className="text-[rgb(var(--ec-page-text-muted))]">
                Its name, version and summary come from the catalog: change them there and they're kept in sync here.
              </p>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[rgb(var(--ec-accent))] hover:underline"
              >
                Open in catalog <ExternalLink size={12} />
              </a>
            </div>
          )}

          <FormField label="Name" hint={NAME_HINTS[node.type ?? ''] ?? `The name of the ${noun}.`} required={!link}>
            <input
              autoFocus={!link}
              value={value('name')}
              readOnly={!!link}
              onChange={edit('name')}
              placeholder={`Name this ${noun}`}
              className={inputClass}
            />
          </FormField>
          {versioned && (
            <FormField label="Version" hint="The version number (e.g., 1.0.0)." required={!link}>
              <input
                value={version}
                readOnly={!!link}
                onChange={edit('version')}
                placeholder="0.0.1"
                spellCheck={false}
                className={inputClass}
              />
              {!link && version && !LOOKS_LIKE_A_VERSION.test(version) && (
                <p className={`text-xs ${STATUS.warning.text}`}>Versions are usually like 1.0.0</p>
              )}
            </FormField>
          )}
          <FormField label="Summary" hint={`A brief summary of the ${noun}.`}>
            <textarea
              rows={5}
              value={value('summary')}
              readOnly={!!link}
              onChange={edit('summary')}
              placeholder={`What does this ${noun} do?`}
              className={`${inputClass} resize-y`}
            />
          </FormField>
        </div>

        <footer className="flex items-center gap-2 border-t px-5 py-4 border-[rgb(var(--ec-page-border))]">
          <button
            type="button"
            onClick={() => onDelete([node.id])}
            title={`Delete ${noun}`}
            aria-label={`Delete ${noun}`}
            className={`mr-auto rounded-lg p-2 ${STATUS.danger.text} ${STATUS.danger.hover}`}
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`${buttonClass} border border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-page-border)/0.4)]`}
          >
            {link ? 'Close' : 'Cancel'}
          </button>
          {!link && (
            <button
              type="submit"
              disabled={!canSave}
              className={`${buttonClass} bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:bg-[rgb(var(--ec-button-bg-hover))] disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Save changes
            </button>
          )}
        </footer>
      </form>
    </aside>
  );
});

function FormField({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block">
        <span className="block text-sm font-semibold text-[rgb(var(--ec-page-text))]">
          {label}
          {required && <span className={`ml-0.5 ${STATUS.danger.text}`}>*</span>}
        </span>
        <span className="mt-0.5 block text-xs text-[rgb(var(--ec-page-text-muted))]">{hint}</span>
      </span>
      {children}
    </label>
  );
}
