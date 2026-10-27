import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import type { VersionDiff } from './types';
import { useDarkMode } from './useDarkMode';
import { getDiffDarkStyles } from './diff-dark-styles';

const DIFF_DARK_STYLES = getDiffDarkStyles('.diff-dark-mode');

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
