/**
 * A clicked node's page, next to it: a small EventCatalog docs page for the resource. Its type, name and version, its
 * summary and badges, actions (ask the agent, view the code), and what it sends, receives, reads and writes, as
 * the catalog's Sends / Receives lists show them. Styled after the catalog's docs pages (see diagram-styles.ts).
 */
import { useMemo, useState, type RefObject } from 'react';
import { Code2, MessageCircleQuestion, Plus, Users, X } from 'lucide-react';
import { EditableText, EditStatus, Field, NodeCard, useSavedFlash } from '@eventcatalog/visualiser/studio';
import { type EntityProperty, type Model, type Note, type Resource, type ResourceType } from '@eventcatalog/visualiser/model';
import { TypeIcon, TypePill } from './resource-types';
import { SchemaCode } from './ported/schema-code';

const WIDTH = 340;
// Wider while showing a schema, as code needs the room
const SCHEMA_WIDTH = 520;

/** The language to highlight a schema in (Avro and JSON Schema are JSON) */
const SCHEMA_LANGUAGES: Record<string, string> = {
  'json-schema': 'json',
  avro: 'json',
  json: 'json',
  protobuf: 'protobuf',
  yaml: 'yaml',
  xml: 'xml',
  graphql: 'graphql',
};
const SCHEMA_LABELS: Record<string, string> = {
  'json-schema': 'JSON Schema',
  avro: 'Avro',
  json: 'JSON',
  protobuf: 'Protobuf',
  yaml: 'YAML',
  xml: 'XML',
  graphql: 'GraphQL',
  other: 'Schema',
};

/** The link to the code: the resource's url, else one in its evidence (e.g. "Startup.cs:51 (https://github.com/...)") */
export const codeLinkOf = (resource: Resource) => {
  const link = resource.url ?? resource.evidence?.match(/https?:\/\/[^\s)]+/)?.[0];
  // Only web links (a diagram from somewhere else may not have been checked against the schema)
  return link && /^https?:\/\//i.test(link.trim()) ? link : undefined;
};
const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

type NodeInfoProps = {
  nodeId: string;
  resource: Resource;
  model: Model;
  notes: Note[];
  containerRef: RefObject<HTMLElement | null>;
  /** Its name starts empty, to type it straight in (a node just made: it keeps its name if nothing's typed) */
  nameEmpty?: boolean;
  onClose: () => void;
  /** Goes to a related resource: centred on the diagram, with its page */
  onOpenResource: (id: string) => void;
  onAsk?: () => void;
  openLink: (url: string) => unknown;
  /** Changes its name, version or summary on the canvas (not given where it can't be changed) */
  onEdit?: (edit: ResourceEdit) => void;
};

// How each relation reads from either end, in the order the catalog lists them
const OUTGOING: Record<string, string> = {
  sends: 'Sends',
  receives: 'Receives',
  'routes-through': 'Channels',
  reads: 'Reads from',
  writes: 'Writes to',
  connects: 'Connects to',
};
const INCOMING: Record<string, string> = {
  sends: 'Sent by',
  receives: 'Received by',
  'routes-through': 'Messages',
  reads: 'Read by',
  writes: 'Written by',
  connects: 'Connected from',
};
// A "connects" relation reads as its label from where it starts (e.g. "Triggers", "Calls"), and from where it ends
// as that label turned round, for the canvas's own labels (a team "owns" what it's connected to: "Owned by")
const capitalise = (text: string) => text.replace(/^\w/, (letter) => letter.toUpperCase());
const outgoingLabel = (relation: { kind: string; label?: string }) =>
  relation.kind === 'connects' && relation.label ? capitalise(relation.label) : OUTGOING[relation.kind];
const INCOMING_LABELS: Record<string, string> = { owns: 'Owned by', manages: 'Managed by', references: 'Referenced by', carries: 'Carried by' };
const incomingLabel = (relation: { kind: string; label?: string }) =>
  (relation.kind === 'connects' && relation.label && INCOMING_LABELS[relation.label.toLowerCase()]) || INCOMING[relation.kind];

/** What can be changed from the page: the resource's name, version and summary (and an entity's properties) */
export type ResourceEdit = { name?: string; version?: string; summary?: string; properties?: EntityProperty[] };

/**
 * An entity's properties: each a name and a type, edited where they are (saved as they're typed), added and removed.
 * Read only where it can't be changed.
 */
function EntityProperties({ properties, onChange, onSaved }: { properties: EntityProperty[]; onChange?: (next: EntityProperty[]) => void; onSaved: () => void }) {
  if (!onChange)
    return properties.length ? (
      <ul className="ec-entity-props">
        {properties.map((property) => (
          <li key={property.name}>
            <span className="ec-entity-prop-name">{property.name}</span>
            <span className="ec-entity-prop-type">{property.type}</span>
          </li>
        ))}
      </ul>
    ) : null;
  const change = (index: number, field: Partial<EntityProperty>) => onChange(properties.map((property, at) => (at === index ? { ...property, ...field } : property)));
  return (
    <div className="ec-entity-props is-editing">
      {properties.map((property, index) => (
        <div key={index} className="ec-entity-prop-row">
          <EditableText label="Property name" value={property.name} onSave={(name) => change(index, { name })} onSaved={onSaved} placeholder="name" required />
          <EditableText label="Property type" value={property.type} onSave={(type) => change(index, { type })} onSaved={onSaved} placeholder="type" className="ec-entity-prop-type-input" required />
          <button
            type="button"
            className="ec-icon-button ec-entity-prop-remove"
            aria-label={`Remove ${property.name}`}
            onClick={() => {
              onChange(properties.filter((_, at) => at !== index));
              onSaved();
            }}
          >
            <X aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="ec-entity-prop-add"
        onClick={() => {
          onChange([...properties, { name: `property${properties.length + 1}`, type: 'string' }]);
          onSaved();
        }}
      >
        <Plus aria-hidden /> Add property
      </button>
    </div>
  );
}

type Related = { id: string; name: string; type: ResourceType; inferred: boolean };

export function NodeInfo({
  nodeId,
  resource,
  model,
  notes,
  containerRef,
  nameEmpty,
  onClose,
  onOpenResource,
  onAsk,
  openLink,
  onEdit,
}: NodeInfoProps) {
  // "Saved", for a moment after a change is
  const { saved, showSaved } = useSavedFlash();
  // Messages with a schema have a Schema tab, as their pages in EventCatalog do
  const [tab, setTab] = useState<'overview' | 'schema'>('overview');
  const codeLink = codeLinkOf(resource);
  // Where it was found, without the link (shown as "View the code")
  const source = resource.evidence?.replace(/\s*\(?https?:\/\/[^\s)]+\)?/, '').trim();
  const byId = useMemo(() => new Map(model.resources.map((r) => [r.id, r])), [model]);

  const sections = useMemo(() => {
    const groups = new Map<string, Related[]>();
    const add = (label: string, id: string, inferred?: boolean) => {
      const other = byId.get(id);
      const list = groups.get(label) ?? [];
      if (other && !list.some((item) => item.id === id)) groups.set(label, [...list, { id, name: other.name, type: other.type, inferred: !!inferred }]);
    };
    for (const relation of model.relations) {
      if (relation.from === resource.id) add(outgoingLabel(relation), relation.to, relation.inferred);
      if (relation.to === resource.id) add(incomingLabel(relation), relation.from, relation.inferred);
    }
    model.resources.filter((r) => r.parent === resource.id).forEach((r) => add('Contains', r.id));
    return [...groups];
  }, [model, resource, byId]);

  const parent = resource.parent ? byId.get(resource.parent) : undefined;
  const resourceNotes = notes.filter((note) => note.resource === resource.id);

  const width = tab === 'schema' ? SCHEMA_WIDTH : WIDTH;
  return (
    <NodeCard
      nodeId={nodeId}
      containerRef={containerRef}
      label={resource.name}
      width={width}
      onClose={onClose}
      kicker={
        <>
          <TypePill type={resource.type} />
          {parent && (
            <span className="ec-doc-card-breadcrumb">
              in <TypeIcon type={parent.type} className="ec-inline-icon" /> {parent.name}
            </span>
          )}
        </>
      }
      header={
        <>
          {onEdit ? (
            // A small form: what's typed is saved as it's typed (there's nothing to press), and shown on the node
            <div className="ec-edit-form" key={resource.id}>
              <Field label="Name">
                <EditableText
                  label="Name"
                  value={resource.name}
                  onSave={(name) => onEdit({ name })}
                  onSaved={showSaved}
                  className="ec-editable-title"
                  startEmpty={nameEmpty}
                  required
                />
              </Field>
              {resource.type !== 'actor' && (
                <Field label="Version" className="ec-field-version">
                  <EditableText
                    label="Version"
                    value={resource.version ?? '0.0.1'}
                    onSave={(version) => onEdit({ version })}
                    onSaved={showSaved}
                    placeholder="0.0.1"
                    required
                  />
                </Field>
              )}
              <Field label="Summary">
                <EditableText
                  label="Summary"
                  value={resource.summary ?? ''}
                  onSave={(summary) => onEdit({ summary })}
                  onSaved={showSaved}
                  placeholder="What it does, in a sentence or two"
                  className="ec-editable-summary"
                  multiline
                />
              </Field>
              {resource.type === 'entity' && (
                <Field label="Properties">
                  <EntityProperties properties={resource.properties ?? []} onChange={(properties) => onEdit({ properties })} onSaved={showSaved} />
                </Field>
              )}
              <EditStatus saved={saved} />
            </div>
          ) : (
            <>
              <h2 className="ec-doc-card-title">
                {resource.name}
                {resource.version && <span className="ec-doc-card-version">v{resource.version}</span>}
              </h2>
              {resource.summary && <p className="ec-doc-card-summary">{resource.summary}</p>}
            </>
          )}
          {(resource.technology || resource.owners?.length) && (
            <div className="ec-badges">
              {resource.technology && <span className="ec-badge">{resource.technology}</span>}
              {resource.owners?.map((owner) => (
                <span key={owner} className="ec-badge">
                  <Users aria-hidden /> {owner}
                </span>
              ))}
            </div>
          )}
          {(onAsk || codeLink) && (
            <div className="ec-doc-card-toolbar">
              {onAsk && (
                <button type="button" className="ec-toolbar-link" onClick={onAsk}>
                  <MessageCircleQuestion aria-hidden /> Ask about this
                </button>
              )}
              {onAsk && codeLink && <span className="ec-toolbar-separator" />}
              {codeLink && (
                <button type="button" className="ec-toolbar-link" title={source || codeLink} onClick={() => openLink(codeLink)}>
                  <Code2 aria-hidden /> View the code
                </button>
              )}
            </div>
          )}
          {resource.schema && (
            <div className="ec-doc-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'overview'} className="ec-doc-tab" onClick={() => setTab('overview')}>
                Overview
              </button>
              <button type="button" role="tab" aria-selected={tab === 'schema'} className="ec-doc-tab" onClick={() => setTab('schema')}>
                Schema <span className="ec-doc-tab-label">{SCHEMA_LABELS[resource.schema.format]}</span>
              </button>
            </div>
          )}
        </>
      }
    >
        {tab === 'schema' && resource.schema ? (
          <div className="ec-doc-card-schema">
            {resource.schema.path && <p className="ec-doc-schema-path">{resource.schema.path}</p>}
            <SchemaCode code={resource.schema.content} language={SCHEMA_LANGUAGES[resource.schema.format] ?? 'text'} isDark={isDark()} maxHeight="380px" />
          </div>
        ) : (
          <div className="ec-doc-card-body">
            {sections.map(([label, items]) => (
              <section key={label} className="ec-doc-section">
                <h3>{label}</h3>
                <ul className="ec-doc-list">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="ec-doc-list-link"
                        title={item.inferred ? `Go to ${item.name} (inferred by the agent)` : `Go to ${item.name}`}
                        onClick={() => onOpenResource(item.id)}
                      >
                        <TypeIcon type={item.type} />
                        <span className="ec-doc-list-name">{item.name}</span>
                        {item.inferred && <span className="ec-inferred-tag">inferred</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {source && !codeLink && <p className="ec-doc-found">Found in {source}</p>}

            {resourceNotes.length > 0 && (
              <section className="ec-doc-section">
                <h3>Notes</h3>
                {resourceNotes.map((note, index) => (
                  <p key={index} className="ec-doc-note">
                    {note.text}
                    <span> — {note.author ?? 'Agent'}</span>
                  </p>
                ))}
              </section>
            )}
          </div>
        )}
    </NodeCard>
  );
}
