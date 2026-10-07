import { memo } from 'react';
import type { Node } from '@xyflow/react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { getCatalogLink } from '../catalog';
import { getNodeLabel, getResource, updateResource } from '../node-types';
import type { UpdateNodeData } from './canvas-nodes';
import { STATUS } from './status';

const inputClass =
  'w-full rounded-md border px-2 py-1.5 text-sm bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))] text-[rgb(var(--ec-input-text))]';

/** The selected node's name and summary (read only for catalog resources: those are changed in the catalog) */
export default memo(function PropertiesPanel({
  node,
  onChange,
  onDelete,
}: {
  /** What's shown of the node (not its position, so dragging it doesn't re-render the panel) */
  node: Pick<Node, 'id' | 'type' | 'data'>;
  onChange: UpdateNodeData;
  onDelete: (ids: string[]) => void;
}) {
  const resource = getResource(node.type, node.data);
  const link = getCatalogLink(node);
  const setField = (field: string, value: string) =>
    onChange(node.id, (data) => updateResource(node.type, data, { [field]: value }));

  return (
    <aside className="w-72 shrink-0 space-y-4 overflow-y-auto border-l p-4 bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))]">
      <h2 className="text-sm font-semibold">{getNodeLabel(node.type)}</h2>
      {link && (
        <div className="space-y-2 rounded-md border p-3 text-xs border-[rgb(var(--ec-page-border))]">
          <p className="text-[rgb(var(--ec-page-text-muted))]">
            Linked to <span className="font-medium text-[rgb(var(--ec-page-text))]">{String(resource.name)}</span> v{link.version}{' '}
            in the catalog. Edit it in the catalog to change its name or summary.
          </p>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[rgb(var(--ec-accent))] hover:underline"
          >
            View in catalog <ExternalLink size={12} />
          </a>
        </div>
      )}
      <label className="block space-y-1 text-xs text-[rgb(var(--ec-page-text-muted))]">
        Name
        <input
          value={String(resource.name ?? '')}
          readOnly={!!link}
          onChange={(e) => setField('name', e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-xs text-[rgb(var(--ec-page-text-muted))]">
        Summary
        <textarea
          rows={4}
          value={String(resource.summary ?? '')}
          readOnly={!!link}
          onChange={(e) => setField('summary', e.target.value)}
          className={inputClass}
        />
      </label>
      <button
        onClick={() => onDelete([node.id])}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${STATUS.danger.text} ${STATUS.danger.hover}`}
      >
        <Trash2 size={14} />
        Delete
      </button>
    </aside>
  );
});
