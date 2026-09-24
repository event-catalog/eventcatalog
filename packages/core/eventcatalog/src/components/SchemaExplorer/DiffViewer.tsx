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
}

export default function DiffViewer({ diffs, onOpenFullscreen }: DiffViewerProps) {
  const isDark = useDarkMode();

  if (diffs.length === 0) return null;

  return (
    <div className="h-full overflow-auto p-2">
      {isDark && <style dangerouslySetInnerHTML={{ __html: DIFF_DARK_STYLES }} />}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[rgb(var(--ec-page-text))] mb-1">Version Comparison</h3>
          <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">
            {`${diffs.length} selected comparison${diffs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {onOpenFullscreen && (
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
      <div className={`space-y-6 ${isDark ? 'diff-dark-mode' : ''}`}>
        {diffs.map((diff) => (
          <div
            key={`${diff.fromVersion}-${diff.toVersion}`}
            className="border border-[rgb(var(--ec-page-border))] rounded-lg overflow-hidden"
          >
            <div className="bg-[rgb(var(--ec-content-hover))] border-b border-[rgb(var(--ec-page-border))] px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-semibold text-[rgb(var(--ec-page-text))]">v{diff.fromVersion}</span>
                  <span className="text-[rgb(var(--ec-page-text-muted))] mx-2">&rarr;</span>
                  <span className="font-semibold text-[rgb(var(--ec-page-text))]">v{diff.toVersion}</span>
                </div>
                <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">Selected comparison</span>
              </div>
            </div>
            <div className="relative">
              <div dangerouslySetInnerHTML={{ __html: diff.diffHtml }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
