import { useState } from 'react';
import { CodeBracketIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import JSONSchemaViewer from '@components/SchemaExplorer/JSONSchemaViewer';
import type { PactInteraction } from '@utils/pact';
import SpecificationSource from '../generic/_SpecificationSource';

interface Props {
  /** The contract's name, shown in fullscreen */
  name: string;
  version: string;
  code: string;
  /** The syntax to highlight: json, yaml, xml or text */
  language: string;
  /** The interactions of a contract that is a Pact file. Other contracts are shown as their source only. */
  interactions?: PactInteraction[];
  /** The service the Pact is with, named as the Pact names it */
  provider?: string;
}

type Tab = 'fields' | 'source';

// Every value of an interaction's header reads the same: one size, plain text
const VALUE_CLASS = 'text-sm text-[rgb(var(--ec-page-text))]';
const LABEL_CLASS = 'text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]';

// The file first, then its fields: the order the schema pages have ("Schema", then "Properties")
const TABS: { id: Tab; label: string; Icon: typeof CodeBracketIcon }[] = [
  { id: 'source', label: 'Schema', Icon: CodeBracketIcon },
  { id: 'fields', label: 'Fields', Icon: TableCellsIcon },
];

/**
 * A consumer contract's file. A Pact gets two tabs: the file as written, and the fields the consumer relies on (each
 * interaction in the schema viewer the catalog uses for message schemas). Anything else is the file only.
 */
export default function ContractViewer({ name, version, code, language, interactions, provider }: Props) {
  const [tab, setTab] = useState<Tab>('source');
  const source = <SpecificationSource name={name} version={version} code={code} language={language} />;

  if (!interactions || interactions.length === 0) return source;

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-[rgb(var(--ec-page-border))] px-1" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-[rgb(var(--ec-accent))] text-[rgb(var(--ec-page-text))]'
                : 'border-transparent text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] hover:border-[rgb(var(--ec-page-border))]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'source' && <div className="pt-2">{source}</div>}

      {tab === 'fields' && (
        <div className="flex flex-col gap-5 px-1 pt-3">
          {interactions.map((interaction, index) => (
            <section
              key={`${interaction.description}-${index}`}
              className="overflow-hidden rounded-md border border-[rgb(var(--ec-page-border))]"
            >
              {/* The interaction, in Pact's own terms: given a provider state, the consumer expects this from the provider */}
              <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 border-b border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] px-4 py-3">
                <dt className={LABEL_CLASS}>{interaction.kind === 'message' ? 'Expects' : 'Expects back'}</dt>
                <dd className={VALUE_CLASS}>
                  {interaction.description}
                  {interaction.request && (
                    <code className="ml-2 rounded bg-[rgb(var(--ec-page-bg))] px-1.5 py-0.5 text-xs font-normal text-[rgb(var(--ec-page-text-muted))]">
                      {interaction.request}
                    </code>
                  )}
                </dd>
                {provider && (
                  <>
                    <dt className={LABEL_CLASS}>From</dt>
                    <dd className={VALUE_CLASS}>{provider}</dd>
                  </>
                )}
                {interaction.providerStates.length > 0 && (
                  <>
                    <dt className={LABEL_CLASS}>Given</dt>
                    <dd className={VALUE_CLASS}>{interaction.providerStates.join(', and ')}</dd>
                  </>
                )}
              </dl>
              {interaction.schema ? (
                // The viewer has a border of its own: here it is part of the interaction's card
                <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
                  <JSONSchemaViewer schema={interaction.schema} expand search={interactions.length === 1} />
                </div>
              ) : (
                <p className="px-4 py-3 text-xs text-[rgb(var(--ec-page-text-muted))]">
                  This interaction has no JSON body to list fields from. See the Schema tab.
                </p>
              )}
            </section>
          ))}
          <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">
            Worked out from the Pact&apos;s examples and matching rules. A field with a constant must have exactly that
            value; the others are checked by type or pattern.
          </p>
        </div>
      )}
    </div>
  );
}
