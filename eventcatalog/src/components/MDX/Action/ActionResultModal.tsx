import * as Dialog from '@radix-ui/react-dialog';
import { useStore } from '@nanostores/react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { actionModalStore, closeResultModal } from '@stores/action-store';

export default function ActionResultModal() {
  const modalState = useStore(actionModalStore);
  const { isOpen, actionName, result } = modalState;

  const isSuccess = result?.success ?? false;
  const message = result?.message || result?.error || 'No message';
  const hasData = result?.data && Object.keys(result.data).length > 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeResultModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-lg bg-[rgb(var(--ec-page-bg))] shadow-xl focus:outline-none data-[state=open]:animate-contentShow z-[100]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--ec-page-border))]">
            <div className="flex items-center gap-3">
              {isSuccess ? (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
              )}
              <div>
                <Dialog.Title className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">
                  {isSuccess ? 'Action Completed' : 'Action Failed'}
                </Dialog.Title>
                {actionName && (
                  <Dialog.Description className="text-sm text-[rgb(var(--ec-page-text-muted))]">{actionName}</Dialog.Description>
                )}
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-2 text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle))] rounded-md transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-[rgb(var(--ec-page-text))]">{message}</p>

            {hasData && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-[rgb(var(--ec-page-text-muted))] mb-2">Details</h4>
                <pre className="bg-[rgb(var(--ec-card-bg))] border border-[rgb(var(--ec-page-border))] rounded-md p-3 overflow-auto text-sm text-[rgb(var(--ec-page-text))]">
                  {JSON.stringify(result?.data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-[rgb(var(--ec-page-border))]">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent))] focus:ring-offset-2 transition-colors"
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
