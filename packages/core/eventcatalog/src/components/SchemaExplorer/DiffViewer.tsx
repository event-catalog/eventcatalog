import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import type { VersionDiff } from './types';
import { useDarkMode } from './useDarkMode';

// Dark mode overrides for diff2html - scoped under .diff-dark-mode
const DIFF_DARK_STYLES = `
.diff-dark-mode .d2h-wrapper {
  color: #e5e7eb;
}
.diff-dark-mode .d2h-file-header {
  background-color: rgba(255,255,255,0.05);
  border-bottom-color: rgba(255,255,255,0.1);
}
.diff-dark-mode .d2h-file-header .d2h-file-name {
  color: #e5e7eb;
}
.diff-dark-mode .d2h-diff-table {
  border-color: rgba(255,255,255,0.1);
}
.diff-dark-mode .d2h-code-side-linenumber,
.diff-dark-mode .d2h-code-linenumber {
  background-color: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.08);
  color: #6b7280;
}
.diff-dark-mode .d2h-code-line,
.diff-dark-mode .d2h-code-side-line {
  background-color: transparent;
  border-color: rgba(255,255,255,0.06);
  color: #d1d5db;
}
.diff-dark-mode .d2h-code-line-ctn {
  color: #d1d5db;
}
/* Deletion lines */
.diff-dark-mode .d2h-del {
  background-color: rgba(239,68,68,0.1);
  border-color: rgba(239,68,68,0.15);
}
.diff-dark-mode .d2h-del .d2h-code-side-linenumber,
.diff-dark-mode .d2h-del .d2h-code-linenumber {
  background-color: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.15);
  color: #f87171;
}
.diff-dark-mode .d2h-del .d2h-code-line-ctn {
  color: #fca5a5;
}
.diff-dark-mode del {
  background-color: rgba(239,68,68,0.25);
  color: #fca5a5;
  text-decoration: none;
}
/* Addition lines */
.diff-dark-mode .d2h-ins {
  background-color: rgba(34,197,94,0.1);
  border-color: rgba(34,197,94,0.15);
}
.diff-dark-mode .d2h-ins .d2h-code-side-linenumber,
.diff-dark-mode .d2h-ins .d2h-code-linenumber {
  background-color: rgba(34,197,94,0.15);
  border-color: rgba(34,197,94,0.15);
  color: #4ade80;
}
.diff-dark-mode .d2h-ins .d2h-code-line-ctn {
  color: #bbf7d0;
}
.diff-dark-mode ins {
  background-color: rgba(34,197,94,0.25);
  color: #bbf7d0;
  text-decoration: none;
}
/* Info/context header */
.diff-dark-mode .d2h-info {
  background-color: rgba(59,130,246,0.08);
  border-color: rgba(59,130,246,0.15);
  color: #93c5fd;
}
/* File diff border */
.diff-dark-mode .d2h-file-diff {
  border-color: rgba(255,255,255,0.1);
}
.diff-dark-mode .d2h-file-side-diff {
  border-color: rgba(255,255,255,0.1);
}
/* Tag styles */
.diff-dark-mode .d2h-tag {
  background-color: rgba(59,130,246,0.15);
  border-color: rgba(59,130,246,0.3);
  color: #93c5fd;
}
/* Empty placeholder lines */
.diff-dark-mode .d2h-code-side-emptyplaceholder,
.diff-dark-mode .d2h-emptyplaceholder {
  background-color: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.06);
}
/* File wrapper border */
.diff-dark-mode .d2h-file-wrapper {
  border-color: rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  overflow: hidden;
}
.diff-dark-mode .d2h-files-diff {
  border-color: rgba(255,255,255,0.1);
}
`;

interface DiffViewerProps {
  diffs: VersionDiff[];
  onOpenFullscreen?: () => void;
  apiAccessEnabled?: boolean;
}

export default function DiffViewer({ diffs, onOpenFullscreen, apiAccessEnabled = false }: DiffViewerProps) {
  const isDark = useDarkMode();

  if (diffs.length === 0) return null;

  return (
    <div className="h-full overflow-auto p-5">
      {isDark && <style dangerouslySetInnerHTML={{ __html: DIFF_DARK_STYLES }} />}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[rgb(var(--ec-page-text))] mb-1">Version History</h3>
          <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">
            {apiAccessEnabled
              ? `${diffs.length} version comparison${diffs.length !== 1 ? 's' : ''}`
              : 'Compare schema versions side-by-side'}
          </p>
        </div>
        {onOpenFullscreen && apiAccessEnabled && (
          <button
            onClick={onOpenFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
            title="Open in fullscreen"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
            Fullscreen
          </button>
        )}
      </div>
      {apiAccessEnabled ? (
        <div className={`space-y-6 ${isDark ? 'diff-dark-mode' : ''}`}>
          {diffs.map((diff, index) => (
            <div
              key={`${diff.newerVersion}-${diff.olderVersion}`}
              className="border border-[rgb(var(--ec-page-border))] rounded-lg overflow-hidden"
            >
              <div className="bg-[rgb(var(--ec-content-hover))] border-b border-[rgb(var(--ec-page-border))] px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-semibold text-[rgb(var(--ec-page-text))]">v{diff.newerVersion}</span>
                    <span className="text-[rgb(var(--ec-page-text-muted))] mx-2">&rarr;</span>
                    <span className="font-semibold text-[rgb(var(--ec-page-text))]">v{diff.olderVersion}</span>
                  </div>
                  <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                    {index === 0 ? 'Latest change' : `${index + 1} version${index + 1 !== 1 ? 's' : ''} ago`}
                  </span>
                </div>
              </div>
              <div className="relative">
                <div dangerouslySetInnerHTML={{ __html: diff.diffHtml }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-accent)/0.3)] rounded-lg p-8">
          <div className="flex flex-col items-center text-center max-w-md mx-auto">
            <div className="flex-shrink-0 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-[rgb(var(--ec-accent))]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-[rgb(var(--ec-page-text))] mb-2">Upgrade to Scale</h4>
            <p className="text-sm text-[rgb(var(--ec-page-text-muted))] mb-6 leading-relaxed">
              Compare schema versions side-by-side with visual diffs. Track breaking changes, see exactly what changed between
              versions, and maintain better schema governance.
            </p>
            <a
              href="https://eventcatalog.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[rgb(var(--ec-accent))] rounded-lg hover:opacity-90 transition-colors"
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
