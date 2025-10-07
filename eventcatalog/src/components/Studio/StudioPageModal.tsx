import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ExternalLinkIcon, CheckIcon, ClipboardIcon, Loader2 } from 'lucide-react';

const StudioPageModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openStudioModal', handleOpen);
    return () => window.removeEventListener('openStudioModal', handleOpen);
  }, []);

  const handleCopyResources = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/catalog');

      if (!response.ok) {
        throw new Error('Failed to fetch catalog data');
      }

      const catalogData = await response.json();

      await navigator.clipboard.writeText(JSON.stringify(catalogData, null, 2));
      setCopySuccess(true);
      setHasCopied(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy resources:', err);
      setError('Failed to copy resources. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenStudio = () => {
    window.open(
      'https://app.eventcatalog.studio/playground?import-resources=true&utm_source=eventcatalog&utm_medium=referral&utm_campaign=studio-page',
      '_blank'
    );
    setIsOpen(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl focus:outline-none data-[state=open]:animate-contentShow z-[100]">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-3">Open EventCatalog Studio</Dialog.Title>

          <Dialog.Description className="text-sm text-gray-600 mb-6">
            Import your catalog resources into{' '}
            <a
              href="https://eventcatalog.studio"
              className="text-gray-900 hover:text-gray-700 underline font-semibold"
              target="_blank"
              rel="noopener noreferrer"
            >
              EventCatalog Studio
            </a>{' '}
            to create architecture diagrams.
          </Dialog.Description>

          <div className="space-y-4">
            {/* Step 1: Copy Resources */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Step 1: Copy your resources</h4>
              <p className="text-xs text-gray-600 mb-3">Copy your EventCatalog resources to your clipboard.</p>

              <button
                onClick={handleCopyResources}
                disabled={isLoading}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                  copySuccess
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : isLoading
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading resources...</span>
                  </>
                ) : copySuccess ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <ClipboardIcon className="w-4 h-4" />
                    <span>Copy resources to clipboard</span>
                  </>
                )}
              </button>

              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>

            {/* Step 2: Open Studio */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Step 2: Open EventCatalog Studio</h4>
              <p className="text-xs text-gray-600 mb-3">
                Go to EventCatalog Studio and paste your resources into the modal dialog.
              </p>

              <button
                onClick={handleOpenStudio}
                disabled={!hasCopied}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  hasCopied ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ExternalLinkIcon className="w-4 h-4" />
                <span>Open EventCatalog Studio</span>
              </button>

              <p className="text-[12px] text-gray-500 italic mt-4 mb-0">
                All data is stored locally in your browser. Nothing is sent to external servers.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                onClick={() => setIsOpen(false)}
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

export default StudioPageModal;
