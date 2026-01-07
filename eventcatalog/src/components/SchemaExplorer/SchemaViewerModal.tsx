import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import JSONSchemaViewer from './JSONSchemaViewer';
import AvroSchemaViewer from './AvroSchemaViewer';
import type { SchemaItem } from './types';

interface SchemaViewerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  message: SchemaItem;
  parsedSchema: any;
  parsedAvroSchema?: any;
}

export default function SchemaViewerModal({
  isOpen,
  onOpenChange,
  message,
  parsedSchema,
  parsedAvroSchema,
}: SchemaViewerModalProps) {
  if (!parsedSchema && !parsedAvroSchema) return null;

  const isAvro = !!parsedAvroSchema;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-8 rounded-lg bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] shadow-xl focus:outline-none data-[state=open]:animate-contentShow z-[100] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--ec-page-border))] flex-shrink-0">
            <div className="flex items-center gap-3">
              <ArrowsPointingOutIcon className="h-6 w-6 text-[rgb(var(--ec-icon-color))]" />
              <div>
                <Dialog.Title className="text-xl font-semibold text-[rgb(var(--ec-page-text))]">{message.data.name}</Dialog.Title>
                <Dialog.Description className="text-sm text-[rgb(var(--ec-page-text-muted))] mt-1">
                  v{message.data.version} · {isAvro ? 'Avro' : 'JSON'} Schema
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] rounded-md transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-6">
            {isAvro ? (
              <AvroSchemaViewer schema={parsedAvroSchema} expand={true} search={true} />
            ) : (
              <JSONSchemaViewer schema={parsedSchema} expand={true} search={true} />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-[rgb(var(--ec-page-border))] flex-shrink-0">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent))] focus:ring-offset-2 transition-colors"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
