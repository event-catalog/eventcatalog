/**
 * The schema, shown by the EventCatalog viewer MCP App (../viewer) for showResource with view "schema".
 * Like EventCatalog's schema pages, it shows a message's schema as its source (Schema) or with the Schema
 * Explorer's viewers (Properties, for JSON Schema, Avro and Protobuf), in MCP hosts that support MCP Apps.
 * Hosts without MCP Apps support show the tool's text instead.
 */
import { useCallback, useEffect, useState } from 'react';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { Code, ExternalLink, Maximize2, Minimize2, Table } from 'lucide-react';
import JSONSchemaViewer from '../../../../components/SchemaExplorer/JSONSchemaViewer';
import AvroSchemaViewer from '../../../../components/SchemaExplorer/AvroSchemaViewer';
import ProtobufSchemaViewer from '../../../../components/SchemaExplorer/ProtobufSchemaViewer';
import { SchemaCode } from './schema-code';
import { RESOURCE_TYPE_LABELS } from '../shared/resource-types';
import type { SchemaViewerPayload, SchemaViewerSchema } from './shared';

const INLINE_MAX_HEIGHT = '560px';

const FORMAT_LABELS: Record<SchemaViewerSchema['kind'], string> = {
  json: 'JSON Schema',
  avro: 'Avro',
  protobuf: 'Protobuf',
  code: '',
};

type SchemaTab = 'code' | 'properties';

function SchemaProperties({ schema, maxHeight }: { schema: SchemaViewerSchema; maxHeight?: string }) {
  switch (schema.kind) {
    case 'json':
      return <JSONSchemaViewer schema={schema.schema} maxHeight={maxHeight} />;
    case 'avro':
      return <AvroSchemaViewer schema={schema.schema} maxHeight={maxHeight} showRequired />;
    case 'protobuf':
      return <ProtobufSchemaViewer schema={schema.schema} maxHeight={maxHeight} showRequired />;
    default:
      return null;
  }
}

type SchemaViewerViewProps = {
  app: App | null;
  /** The schemas from the latest tool result */
  payload: SchemaViewerPayload;
  hostContext?: McpUiHostContext;
};

export function SchemaViewerView({ app, payload, hostContext }: SchemaViewerViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Properties first: it's what people asking to see a schema usually want
  const [tab, setTab] = useState<SchemaTab>('properties');

  // Show the first schema again when the view gets a new tool result
  useEffect(() => setSelectedIndex(0), [payload]);

  // The view runs in a sandbox and can't navigate, so EventCatalog opens in the host
  const openInCatalog = useCallback(
    (path: string) => app?.openLink({ url: new URL(path, payload.catalogUrl).href }),
    [app, payload]
  );

  const { resource, schemas } = payload;
  const schema = schemas[selectedIndex] ?? schemas[0];
  // Schemas without a viewer, such as XML Schema, only have their source
  const hasProperties = schema && schema.kind !== 'code';
  const activeTab: SchemaTab = hasProperties ? tab : 'code';
  const isDark = hostContext?.theme === 'dark';
  const tabs: Array<{ id: SchemaTab; label: string; icon: typeof Code }> = [
    { id: 'code', label: 'Schema', icon: Code },
    ...(hasProperties ? [{ id: 'properties' as const, label: 'Properties', icon: Table }] : []),
  ];
  const isFullscreen = hostContext?.displayMode === 'fullscreen';
  const canGoFullscreen = hostContext?.availableDisplayModes?.includes('fullscreen');
  const buttonClass =
    'inline-flex h-7 items-center gap-1.5 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-2.5 text-xs font-medium text-[rgb(var(--ec-page-text))] transition-colors hover:border-[rgb(var(--ec-accent))] hover:text-[rgb(var(--ec-accent))]';

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-screen' : ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--ec-page-border))] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className="shrink-0 rounded bg-[rgb(var(--ec-accent-subtle))] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-accent))]">
            {RESOURCE_TYPE_LABELS[resource.collection] ?? resource.collection}
          </span>
          <span className="truncate font-semibold">{resource.name}</span>
          <span className="shrink-0 text-xs text-[rgb(var(--ec-page-text-muted))]">v{resource.version}</span>
          {schema && FORMAT_LABELS[schema.kind] && (
            <span className="shrink-0 text-xs text-[rgb(var(--ec-page-text-muted))]">· {FORMAT_LABELS[schema.kind]}</span>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" className={buttonClass} onClick={() => openInCatalog(payload.docsPath)}>
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            Open in EventCatalog
          </button>
          {canGoFullscreen && (
            <button
              type="button"
              className={buttonClass}
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
              onClick={() => app?.requestDisplayMode({ mode: isFullscreen ? 'inline' : 'fullscreen' })}
            >
              {isFullscreen ? (
                <Minimize2 aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 aria-hidden className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
      {schema && (
        <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--ec-page-border))] px-3">
          <div className="flex items-center gap-1" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setTab(id)}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === id
                    ? 'border-[rgb(var(--ec-accent))] text-[rgb(var(--ec-page-text))]'
                    : 'border-transparent text-[rgb(var(--ec-page-text-muted))] hover:border-[rgb(var(--ec-page-border))] hover:text-[rgb(var(--ec-page-text))]'
                }`}
              >
                <Icon aria-hidden className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          {schemas.length > 1 && (
            <div className="flex min-w-0 gap-1 overflow-x-auto py-1.5" aria-label="Schemas">
              {schemas.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  aria-pressed={index === selectedIndex}
                  onClick={() => setSelectedIndex(index)}
                  className={`whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                    index === selectedIndex
                      ? 'border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-page-text))]'
                      : 'border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className={`p-3 ${isFullscreen ? 'min-h-0 flex-1' : ''}`}>
        {!schema ? (
          <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">{resource.name} has no schema.</p>
        ) : activeTab === 'properties' ? (
          <SchemaProperties key={selectedIndex} schema={schema} maxHeight={isFullscreen ? undefined : INLINE_MAX_HEIGHT} />
        ) : (
          <SchemaCode
            key={selectedIndex}
            code={schema.code}
            language={schema.language}
            isDark={isDark}
            maxHeight={isFullscreen ? undefined : INLINE_MAX_HEIGHT}
          />
        )}
      </div>
    </div>
  );
}
