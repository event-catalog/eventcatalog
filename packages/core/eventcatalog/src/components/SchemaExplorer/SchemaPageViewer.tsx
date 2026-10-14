import type { ReactNode } from 'react';
import SchemaDetailsPanel from './SchemaDetailsPanel';
import type { SchemaItem } from './types';

interface SchemaPageViewerProps {
  message: SchemaItem;
  availableVersions: SchemaItem[];
  showOwners?: boolean;
  showProducersConsumers?: boolean;
  /** Tab requested in the URL, resolved on the server to avoid a flash of the default tab. */
  initialTab?: string;
  /** Examples rendered on the server through the MDX pipeline, passed as the `examples` slot. */
  examples?: ReactNode;
  hasRenderedExamples?: boolean;
}

export default function SchemaPageViewer({
  message,
  availableVersions,
  showOwners = true,
  showProducersConsumers = true,
  initialTab,
  examples,
  hasRenderedExamples = false,
}: SchemaPageViewerProps) {
  const handleVersionChange = (version: string) => {
    // Construct new URL
    // URL: /schemas/[collection]/[id]/[version]
    const url = `/schemas/${message.collection}/${message.data.id}/${version}`;
    window.location.href = url;
  };

  return (
    <SchemaDetailsPanel
      message={message}
      availableVersions={availableVersions}
      selectedVersion={message.data.version}
      onVersionChange={handleVersionChange}
      showOwners={showOwners}
      showProducersConsumers={showProducersConsumers}
      initialTab={initialTab}
      renderedExamples={hasRenderedExamples ? examples : undefined}
    />
  );
}
