import SchemaGraph from './SchemaGraph';
import type { SchemaItem } from './types';

/** Producers, consumers and channels of the message, drawn with the same node graph as the docs page. */
export default function SchemaUsage({ message }: { message: SchemaItem }) {
  return (
    <div className="flex h-full flex-col overflow-auto pr-1">
      {message.graph ? (
        <SchemaGraph id={`schema-usage-${message.collection}-${message.data.id}-${message.data.version}`} graph={message.graph} />
      ) : (
        <p className="rounded-xl border border-dashed border-[rgb(var(--ec-page-border))] px-4 py-6 text-center text-xs text-[rgb(var(--ec-page-text-muted))]">
          No producers or consumers declared for this message.
        </p>
      )}
    </div>
  );
}
