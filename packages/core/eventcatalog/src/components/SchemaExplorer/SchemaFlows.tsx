import { useEffect, useState } from 'react';
import { ArrowTopRightOnSquareIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import SchemaGraph from './SchemaGraph';
import type { FlowUsage, SchemaItem } from './types';
import { getSchemaRelationshipHref } from './utils';

interface SchemaFlowsProps {
  message: SchemaItem;
  flows: FlowUsage[];
}

const flowKey = (flow: FlowUsage) => `${flow.id}-${flow.version}`;

/** The diagram of a flow the message appears in, with a picker when it appears in several. */
export default function SchemaFlows({ message, flows }: SchemaFlowsProps) {
  const [selectedKey, setSelectedKey] = useState(() => (flows[0] ? flowKey(flows[0]) : ''));
  // Keep the selection valid when the message (and so the list of flows) changes.
  useEffect(() => {
    if (!flows.some((flow) => flowKey(flow) === selectedKey)) setSelectedKey(flows[0] ? flowKey(flows[0]) : '');
  }, [flows, selectedKey]);

  const selected = flows.find((flow) => flowKey(flow) === selectedKey) ?? flows[0];
  if (!selected) return null;

  return (
    <div className="flex h-full flex-col overflow-auto pr-1">
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
        {flows.length > 1 ? (
          <label className="relative inline-flex items-center">
            <span className="sr-only">Flow</span>
            <select
              value={flowKey(selected)}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="appearance-none rounded-md border border-[rgb(var(--ec-input-border))] bg-[rgb(var(--ec-input-bg))] py-1.5 pl-3 pr-8 text-sm font-medium text-[rgb(var(--ec-input-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.4)]"
            >
              {flows.map((flow) => (
                <option key={flowKey(flow)} value={flowKey(flow)}>
                  {flow.name || flow.id} (v{flow.version})
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 h-4 w-4 text-[rgb(var(--ec-icon-color))]" />
          </label>
        ) : (
          <span className="text-sm font-semibold text-[rgb(var(--ec-page-text))]">
            {selected.name || selected.id}
            <span className="ml-2 font-mono text-[11px] font-normal text-[rgb(var(--ec-page-text-muted))]">
              v{selected.version}
            </span>
          </span>
        )}
        <a
          href={getSchemaRelationshipHref({ id: selected.id, version: selected.version, collection: 'flows' })}
          className="inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--ec-accent))] hover:underline"
        >
          Open flow
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </a>
        {selected.summary && <span className="basis-full text-xs text-[rgb(var(--ec-page-text-muted))]">{selected.summary}</span>}
      </div>

      {selected.graph ? (
        <SchemaGraph
          key={flowKey(selected)}
          id={`schema-flow-${message.collection}-${message.data.id}-${message.data.version}-${flowKey(selected)}`}
          graph={selected.graph}
          showLegend={false}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-[rgb(var(--ec-page-border))] px-4 py-6 text-center text-xs text-[rgb(var(--ec-page-text-muted))]">
          The diagram for this flow could not be built.
        </p>
      )}
    </div>
  );
}
