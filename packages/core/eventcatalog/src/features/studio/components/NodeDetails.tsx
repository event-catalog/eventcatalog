import { memo, type RefObject } from 'react';
import type { Node } from '@xyflow/react';
import { Box, ExternalLink, Library } from 'lucide-react';
import { getCatalogLink } from '../catalog';
import {
  EditableText,
  EditStatus,
  Field,
  NodeCard,
  getNodeLabel,
  getResource,
  isVersioned,
  updateResource,
  useSavedFlash,
  type UpdateNodeData,
  NODE_ICONS,
} from '@eventcatalog/visualiser/studio';

/** Something it's connected to: the node at the other end, and the connection's label */
export type NodeConnection = { id: string; name: string; type?: string; label?: string; outgoing: boolean };

/**
 * A node's details, in a card next to it (as Studio on the web's): its type and where it is, and its name, version
 * and summary, saved as they're typed, and what it's connected to (click one to go to it). Catalog resources are read only (they're changed in the catalog), as is
 * everything on a locked canvas. Notes and text are edited on the canvas.
 */
export default memo(function NodeDetails({
  node,
  parentName,
  connections,
  onOpenNode,
  containerRef,
  nameEmpty,
  locked,
  onChange,
  onClose,
}: {
  /** What's shown of the node (not its position: the card follows the node on screen by itself) */
  node: Pick<Node, 'id' | 'type' | 'data'>;
  /** The domain or system it's in, if it's in one */
  parentName?: string;
  connections: NodeConnection[];
  /** Goes to a node it's connected to (and shows its card) */
  onOpenNode: (id: string) => void;
  /** The canvas, to put the card next to the node */
  containerRef: RefObject<HTMLElement | null>;
  /** Its name starts empty, to type it straight in (a node just made: it keeps its name if nothing's typed) */
  nameEmpty?: boolean;
  locked: boolean;
  onChange: UpdateNodeData;
  onClose: () => void;
}) {
  const { saved, showSaved } = useSavedFlash();
  const resource = getResource(node.type, node.data);
  const link = getCatalogLink(node);
  const label = getNodeLabel(node.type);
  const { icon: Icon, className: iconClassName } = NODE_ICONS[node.type ?? ''] ?? { icon: Box, className: '' };
  const versioned = isVersioned(node.type);
  const name = String(resource.name ?? '');
  const version = String(link?.version ?? resource.version ?? '');
  const summary = String(resource.summary ?? '');
  const save = (fields: Record<string, string>) => onChange(node.id, (data) => updateResource(node.type, data, fields));

  return (
    <NodeCard
      nodeId={node.id}
      containerRef={containerRef}
      label={name || label}
      onClose={onClose}
      kicker={
        <>
          {/* Its type, in its colour (as the web's type pill) */}
          <span className={`flex-none ${iconClassName}`}>
            <span className="inline-flex items-center gap-1 rounded bg-current px-1.5 text-[9px] font-bold uppercase leading-4 tracking-wider">
              <Icon aria-hidden size={10} className="text-white" />
              <span className="text-white">{label}</span>
            </span>
          </span>
          {parentName && <span className="ec-doc-card-breadcrumb">in {parentName}</span>}
        </>
      }
      header={
        link || locked ? (
          <>
            <h2 className="ec-doc-card-title">
              {name}
              {version && <span className="ec-doc-card-version">v{version}</span>}
            </h2>
            {summary && <p className="ec-doc-card-summary">{summary}</p>}
            {link && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[rgb(var(--ec-page-text-muted))]">
                <span className="inline-flex items-center gap-1.5">
                  <Library aria-hidden size={13} className="text-[rgb(var(--ec-accent))]" />
                  From your catalog: change it there
                </span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[rgb(var(--ec-accent))] hover:underline"
                >
                  Open in EventCatalog <ExternalLink aria-hidden size={12} />
                </a>
              </div>
            )}
          </>
        ) : (
          // A small form: what's typed is saved as it's typed (there's nothing to press), and shown on the node
          <div className="ec-edit-form" key={node.id}>
            <Field label="Name">
              <EditableText
                label="Name"
                value={name}
                onSave={(next) => save({ name: next })}
                onSaved={showSaved}
                placeholder={`Name this ${label.toLowerCase()}`}
                className="ec-editable-title"
                startEmpty={nameEmpty}
                required
              />
            </Field>
            {versioned && (
              <Field label="Version" className="ec-field-version">
                <EditableText
                  label="Version"
                  value={version || '0.0.1'}
                  onSave={(next) => save({ version: next })}
                  onSaved={showSaved}
                  placeholder="0.0.1"
                  required
                />
              </Field>
            )}
            <Field label="Summary">
              <EditableText
                label="Summary"
                value={summary}
                onSave={(next) => save({ summary: next })}
                onSaved={showSaved}
                placeholder="What it does, in a sentence or two"
                className="ec-editable-summary"
                multiline
              />
            </Field>
            <EditStatus saved={saved} />
          </div>
        )
      }
    >
      <div className="ec-doc-card-body px-4 pb-3.5 pt-1 empty:hidden">
        {(['Connects to', 'Connected from'] as const).map((heading) => {
          const items = connections.filter((connection) => connection.outgoing === (heading === 'Connects to'));
          if (!items.length) return null;
          return (
            <section key={heading} className="mt-3">
              <h3 className="mb-1.5 text-xs font-semibold text-[rgb(var(--ec-page-text-muted))]">{heading}</h3>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const { icon: ItemIcon, className: itemIconClassName } = NODE_ICONS[item.type ?? ''] ?? {
                    icon: Box,
                    className: '',
                  };
                  return (
                    <li key={`${item.id}-${item.label}`}>
                      <button
                        type="button"
                        title={`Go to ${item.name}`}
                        onClick={() => onOpenNode(item.id)}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-[rgb(var(--ec-content-hover))]"
                      >
                        <ItemIcon aria-hidden size={15} className={`flex-none ${itemIconClassName}`} />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        {item.label && (
                          <span className="flex-none text-[11px] text-[rgb(var(--ec-page-text-muted))]">{item.label}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </NodeCard>
  );
});
