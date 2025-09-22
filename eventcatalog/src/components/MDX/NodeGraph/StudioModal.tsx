import React, { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckIcon, ClipboardIcon, ExternalLinkIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { exportNodeGraphForStudio } from '@utils/node-graphs/export-node-graph';

interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StudioModal: React.FC<StudioModalProps> = ({ isOpen, onClose }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const { toObject } = useReactFlow();

  const handleCopyToClipboard = useCallback(async () => {
    const visualizerData = toObject();
    const studioData = exportNodeGraphForStudio(visualizerData);

    try {
      await navigator.clipboard.writeText(JSON.stringify(studioData, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(studioData, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, []);

  const handleOpenStudio = () => {
    window.open(
      'https://app.eventcatalog.studio/playground?import=true&utm_source=eventcatalog&utm_medium=referral&utm_campaign=playground-import',
      '_blank'
    );
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl focus:outline-none data-[state=open]:animate-contentShow z-[100]">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-3">Open in EventCatalog Studio</Dialog.Title>

          <Dialog.Description className="text-sm text-gray-600 mb-6">
            Import your diagram into{' '}
            <a
              href="https://eventcatalog.studio"
              className="text-purple-600 hover:text-purple-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              EventCatalog Studio
            </a>{' '}
            to create designs from your visualization of your architecture.
          </Dialog.Description>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Step 1: Copy diagram</h4>
              <p className="text-xs text-gray-600 mb-3">Copy your diagram data to your clipboard.</p>
              <button
                onClick={handleCopyToClipboard}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                  copySuccess
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {copySuccess ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <ClipboardIcon className="w-4 h-4" />
                    <span>Copy diagram to clipboard</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Step 2: Open EventCatalog Studio</h4>
              <p className="text-xs text-gray-600 mb-3">
                Go to EventCatalog Studio and import your design using the "Import from EventCatalog" button.
              </p>

              <button
                onClick={handleOpenStudio}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                <ExternalLinkIcon className="w-4 h-4" />
                <span>Open EventCatalog Studio</span>
              </button>
              <p className="text-[12px] text-gray-500  italic mt-4 mb-0">
                Don't worry, none of your data is stored by EventCatalog Studio, everything is local to your browser.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                onClick={onClose}
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default StudioModal;
