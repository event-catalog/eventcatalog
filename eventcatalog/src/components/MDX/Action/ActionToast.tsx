import { useStore } from '@nanostores/react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toastStore, removeToast } from '@stores/action-store';

export default function ActionToast() {
  const toasts = useStore(toastStore);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slideIn ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
          role="alert"
        >
          {toast.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-500" />
          ) : (
            <XCircleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 p-1 rounded hover:bg-black/5 transition-colors"
            aria-label="Dismiss"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
