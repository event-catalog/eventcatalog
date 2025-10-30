import type { VersionDiff } from './types';

interface DiffViewerProps {
  diffs: VersionDiff[];
}

export default function DiffViewer({ diffs }: DiffViewerProps) {
  if (diffs.length === 0) return null;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Version History</h3>
        <p className="text-sm text-gray-600">
          Showing {diffs.length} version comparison{diffs.length !== 1 ? 's' : ''}
        </p>
      </div>
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
    </div>
  );
}
