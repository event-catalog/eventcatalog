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
        <Dialog.Content className="fixed inset-4 md:inset-8 rounded-lg bg-white shadow-xl focus:outline-none data-[state=open]:animate-contentShow z-[100] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <ArrowsPointingOutIcon className="h-6 w-6 text-gray-500" />
              <div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">{message.data.name}</Dialog.Title>
                <Dialog.Description className="text-sm text-gray-600 mt-1">
                  v{message.data.version} · {isAvro ? 'Avro' : 'JSON'} Schema
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
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
          <div className="flex justify-end p-4 border-t border-gray-200 flex-shrink-0">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
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
