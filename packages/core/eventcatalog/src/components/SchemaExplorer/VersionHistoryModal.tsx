import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import DiffViewer from './DiffViewer';
import type { VersionDiff } from './types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  diffs: VersionDiff[];
  messageName: string;
  apiAccessEnabled?: boolean;
}

export default function VersionHistoryModal({
  isOpen,
  onOpenChange,
  diffs,
  messageName,
  apiAccessEnabled = false,
}: VersionHistoryModalProps) {
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
                <Dialog.Title className="text-xl font-semibold text-gray-900">Version History</Dialog.Title>
                <Dialog.Description className="text-sm text-gray-600 mt-1">{messageName}</Dialog.Description>
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
          <div className="flex-1 overflow-y-auto p-6">
            {diffs.length > 0 ? (
              <DiffViewer diffs={diffs} apiAccessEnabled={apiAccessEnabled} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-center">No version history available</p>
              </div>
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
