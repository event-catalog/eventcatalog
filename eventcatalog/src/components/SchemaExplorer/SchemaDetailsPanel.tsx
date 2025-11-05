import { useState, useMemo } from 'react';
import * as Diff from 'diff';
import { html } from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import SchemaDetailsHeader from './SchemaDetailsHeader';
import ApiAccessSection from './ApiAccessSection';
import OwnersSection from './OwnersSection';
import ProducersConsumersSection from './ProducersConsumersSection';
import SchemaContentViewer from './SchemaContentViewer';
import DiffViewer from './DiffViewer';
import VersionHistoryModal from './VersionHistoryModal';
import SchemaCodeModal from './SchemaCodeModal';
import SchemaViewerModal from './SchemaViewerModal';
import { copyToClipboard, downloadSchema } from './utils';
import type { SchemaItem, VersionDiff } from './types';

interface SchemaDetailsPanelProps {
  message: SchemaItem;
  availableVersions: SchemaItem[];
  selectedVersion: string | null;
  onVersionChange: (version: string) => void;
  apiAccessEnabled?: boolean;
}

export default function SchemaDetailsPanel({
  message,
  availableVersions,
  selectedVersion,
  onVersionChange,
  apiAccessEnabled = false,
}: SchemaDetailsPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [schemaViewMode, setSchemaViewMode] = useState<'code' | 'schema' | 'diff'>('code');
  const [apiAccessExpanded, setApiAccessExpanded] = useState(false);
  const [ownersExpanded, setOwnersExpanded] = useState(false);
  const [producersConsumersExpanded, setProducersConsumersExpanded] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSchemaViewerModalOpen, setIsSchemaViewerModalOpen] = useState(false);

  const hasMultipleVersions = availableVersions.length > 1;

  // Generate diffs between all consecutive versions
  const allDiffs: VersionDiff[] = useMemo(() => {
    const diffs: VersionDiff[] = [];
    if (!hasMultipleVersions) return diffs;

    for (let i = 0; i < availableVersions.length - 1; i++) {
      const newerVersion = availableVersions[i];
      const olderVersion = availableVersions[i + 1];

      if (newerVersion.schemaContent && olderVersion.schemaContent) {
        const diff = Diff.createTwoFilesPatch(
          `v${olderVersion.data.version}`,
          `v${newerVersion.data.version}`,
          olderVersion.schemaContent,
          newerVersion.schemaContent,
          '',
          '',
          { context: 3 }
        );

        const diffHtml = html(diff, {
          drawFileList: false,
          matching: 'lines',
          outputFormat: 'side-by-side',
        });

        diffs.push({
          newerVersion: newerVersion.data.version,
          olderVersion: olderVersion.data.version,
          diffHtml,
          newerContent: newerVersion.schemaContent,
          olderContent: olderVersion.schemaContent,
        });
      }
    }
    return diffs;
  }, [availableVersions, hasMultipleVersions]);

  // Check if this is a JSON schema
  const parsedSchema = useMemo(() => {
    const isJSONSchema =
      message.schemaExtension?.toLowerCase() === 'json' && message.schemaContent && message.schemaContent.trim() !== '';
    if (!isJSONSchema) return null;

    try {
      const parsed = JSON.parse(message.schemaContent ?? '');
      // Check if it's actually a JSON Schema (has properties or $schema field)
      if (!parsed.properties && !parsed.$schema && !parsed.type) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [message.schemaContent, message.schemaExtension]);

  // Check if this is an Avro schema
  const parsedAvroSchema = useMemo(() => {
    const ext = message.schemaExtension?.toLowerCase();
    const isAvroSchema = (ext === 'avro' || ext === 'avsc') && message.schemaContent && message.schemaContent.trim() !== '';
    if (!isAvroSchema) return null;

    try {
      const parsed = JSON.parse(message.schemaContent ?? '');
      // Check if it's actually an Avro Schema (has type field, typically "record")
      if (!parsed.type) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [message.schemaContent, message.schemaExtension]);

  const handleCopy = async () => {
    if (!message.schemaContent) return;
    const success = await copyToClipboard(message.schemaContent);
    if (success) {
      setCopiedId(message.data.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyCustom = async (content: string, id: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = () => {
    if (!message.schemaContent) return;
    downloadSchema(message.schemaContent, message.data.id, message.schemaExtension || 'json');
  };

  const isCopied = copiedId === message.data.id;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <SchemaDetailsHeader
        message={message}
        availableVersions={availableVersions}
        selectedVersion={selectedVersion}
        onVersionChange={onVersionChange}
        onCopy={handleCopy}
        onDownload={handleDownload}
        isCopied={isCopied}
        schemaViewMode={schemaViewMode}
        onViewModeChange={setSchemaViewMode}
        hasParsedSchema={!!parsedSchema || !!parsedAvroSchema}
        hasDiffs={allDiffs.length > 0}
        diffCount={allDiffs.length}
      />

      {/* API Access Section - Always show, but content changes based on Scale access */}
      <ApiAccessSection
        message={message}
        isExpanded={apiAccessExpanded}
        onToggle={() => setApiAccessExpanded(!apiAccessExpanded)}
        onCopy={handleCopyCustom}
        copiedId={copiedId}
        apiAccessEnabled={apiAccessEnabled}
      />

      {/* Producers and Consumers Section - Only show for messages (not services) */}
      {message.collection !== 'services' && (
        <ProducersConsumersSection
          message={message}
          isExpanded={producersConsumersExpanded}
          onToggle={() => setProducersConsumersExpanded(!producersConsumersExpanded)}
        />
      )}

      {/* Owners Section */}
      <OwnersSection message={message} isExpanded={ownersExpanded} onToggle={() => setOwnersExpanded(!ownersExpanded)} />

      {/* Schema Content - Takes full remaining height */}
      <div className="flex-1 overflow-hidden">
        {schemaViewMode === 'diff' && allDiffs.length > 0 ? (
          <DiffViewer diffs={allDiffs} onOpenFullscreen={() => setIsDiffModalOpen(true)} apiAccessEnabled={apiAccessEnabled} />
        ) : (
          <SchemaContentViewer
            message={message}
            onCopy={handleCopy}
            isCopied={isCopied}
            viewMode={schemaViewMode}
            parsedSchema={parsedSchema}
            parsedAvroSchema={parsedAvroSchema}
            showRequired={true}
            onOpenFullscreen={
              schemaViewMode === 'code'
                ? () => setIsCodeModalOpen(true)
                : schemaViewMode === 'schema' && (parsedSchema || parsedAvroSchema)
                  ? () => setIsSchemaViewerModalOpen(true)
                  : undefined
            }
          />
        )}
      </div>

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isDiffModalOpen}
        onOpenChange={setIsDiffModalOpen}
        diffs={allDiffs}
        messageName={message.data.name}
        apiAccessEnabled={apiAccessEnabled}
      />

      {/* Schema Code Modal */}
      <SchemaCodeModal
        isOpen={isCodeModalOpen}
        onOpenChange={setIsCodeModalOpen}
        message={message}
        onCopy={handleCopy}
        isCopied={isCopied}
      />

      {/* Schema Viewer Modal */}
      <SchemaViewerModal
        isOpen={isSchemaViewerModalOpen}
        onOpenChange={setIsSchemaViewerModalOpen}
        message={message}
        parsedSchema={parsedSchema}
        parsedAvroSchema={parsedAvroSchema}
      />
    </div>
  );
}
