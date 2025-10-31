import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import type { VersionDiff } from './types';

interface DiffViewerProps {
  diffs: VersionDiff[];
  onOpenFullscreen?: () => void;
  apiAccessEnabled?: boolean;
}

export default function DiffViewer({ diffs, onOpenFullscreen, apiAccessEnabled = false }: DiffViewerProps) {
  if (diffs.length === 0) return null;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Version History</h3>
          <p className="text-sm text-gray-600">
            {apiAccessEnabled
              ? `Showing ${diffs.length} version comparison${diffs.length !== 1 ? 's' : ''}`
              : 'Compare schema versions side-by-side'}
          </p>
        </div>
        {onOpenFullscreen && apiAccessEnabled && (
          <button
            onClick={onOpenFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            title="Open in fullscreen"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
            Fullscreen
          </button>
        )}
      </div>
      {apiAccessEnabled ? (
        <div className="space-y-8">
          {diffs.map((diff, index) => (
            <div key={`${diff.newerVersion}-${diff.olderVersion}`} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">v{diff.newerVersion}</span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="font-semibold text-gray-900">v{diff.olderVersion}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {index === 0 ? 'Latest change' : `${index + 1} version${index + 1 !== 1 ? 's' : ''} ago`}
                  </span>
                </div>
              </div>
              <div className="bg-white relative">
                <div dangerouslySetInnerHTML={{ __html: diff.diffHtml }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-purple-200 rounded-lg p-8">
          <div className="flex flex-col items-center text-center max-w-md mx-auto">
            <div className="flex-shrink-0 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">Upgrade to Scale</h4>
            <p className="text-sm text-gray-600 mb-6">
              Compare schema versions side-by-side with visual diffs. Track breaking changes, see exactly what changed between
              versions, and maintain better schema governance.
            </p>
            <a
              href="https://eventcatalog.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
            >
              Start 14-day free trial
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
