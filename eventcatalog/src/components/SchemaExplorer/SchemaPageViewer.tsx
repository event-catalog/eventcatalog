import SchemaDetailsPanel from './SchemaDetailsPanel';
import type { SchemaItem } from './types';

interface SchemaPageViewerProps {
  message: SchemaItem;
  availableVersions: SchemaItem[];
  apiAccessEnabled?: boolean;
  showOwners?: boolean;
  showProducersConsumers?: boolean;
}

export default function SchemaPageViewer({
  message,
  availableVersions,
  apiAccessEnabled = false,
  showOwners = true,
  showProducersConsumers = true,
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
      apiAccessEnabled={apiAccessEnabled}
      showOwners={showOwners}
      showProducersConsumers={showProducersConsumers}
    />
  );
}
