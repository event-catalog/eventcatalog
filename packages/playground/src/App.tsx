import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Editor } from './components/Editor';
import { Visualizer } from './components/Visualizer';
import { TabBar } from './components/TabBar';
import { useDslParser } from './hooks/useDslParser';
import { getErrorsForFile } from './monaco/ec-diagnostics';
import { examples } from './examples';
import { createZipBlob } from './utils/zip';
import { Zap, ChevronDown, AlignLeft, Maximize2, Minimize2, Sun, Moon, Share2, Check, Download, X, Copy } from 'lucide-react';
import { formatEc } from '@eventcatalog/language-server';

const MIN_PANEL_PCT = 20;
const MAX_PANEL_PCT = 80;
const DEFAULT_SPLIT = 45;
const EXPORT_EXTRACT_DIR = './ec-model';

interface ExportResult {
  fileName: string;
  isZip: boolean;
  ecFiles: string[];
}

const AppHeader = memo(function AppHeader({
  selectedExample,
  templateUnselected,
  onExampleChange,
  vizTheme,
  onToggleVizTheme,
  fullscreen,
  onToggleFullscreen,
  onShare,
  onExportForImport,
  exportRecentlyDownloaded,
  loadedFromUrl,
}: {
  selectedExample: number;
  templateUnselected: boolean;
  onExampleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  vizTheme: 'light' | 'dark';
  onToggleVizTheme: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onShare: () => void;
  onExportForImport: () => void;
  exportRecentlyDownloaded: boolean;
  loadedFromUrl: boolean;
}) {
  return (
    <header className="header">
      <div className="header-logo">
        <Zap size={20} />
        <h1>EventCatalog Modelling</h1>
      </div>
      <div className="example-select-wrapper">
        <select
          className="example-select"
          value={loadedFromUrl ? 'url' : (templateUnselected ? '' : selectedExample)}
          onChange={onExampleChange}
        >
          {templateUnselected && (
            <option value="" disabled>
              Select a template
            </option>
          )}
          {loadedFromUrl && (
            <option value="url">
              Shared Link — Loaded from query string
            </option>
          )}
          {examples.map((ex, i) => (
            <option key={i} value={i}>
              {ex.name} — {ex.description}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="example-select-arrow" />
      </div>
      <span className="subtitle">Edit models on the left, see the architecture on the right</span>
      <div className="header-actions">
        <div className="header-action-group" aria-label="Sharing actions">
          <div className="tooltip-wrap" data-tooltip="Share model link">
            <button
              className="fullscreen-btn"
              onClick={onShare}
              title="Share model link"
              aria-label="Share model link"
            >
              <Share2 size={15} />
            </button>
          </div>
          <div className="tooltip-wrap" data-tooltip="Download model files">
            <button
              className="fullscreen-btn"
              onClick={onExportForImport}
              title="Download model files for EventCatalog import"
              aria-label="Download model files for EventCatalog import"
            >
              {exportRecentlyDownloaded ? <Check size={15} /> : <Download size={15} />}
            </button>
          </div>
        </div>

        <div className="header-action-group" aria-label="View actions">
          <div className="tooltip-wrap" data-tooltip={vizTheme === 'light' ? 'Switch to dark visualizer' : 'Switch to light visualizer'}>
            <button
              className="fullscreen-btn"
              onClick={onToggleVizTheme}
              title={vizTheme === 'light' ? 'Dark visualizer' : 'Light visualizer'}
              aria-label={vizTheme === 'light' ? 'Switch to dark visualizer' : 'Switch to light visualizer'}
            >
              {vizTheme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
          <div className="tooltip-wrap" data-tooltip={fullscreen ? 'Show editor' : 'Fullscreen visualizer'}>
            <button
              className="fullscreen-btn"
              onClick={onToggleFullscreen}
              title={fullscreen ? 'Show editor' : 'Fullscreen visualizer'}
              aria-label={fullscreen ? 'Show editor' : 'Fullscreen visualizer'}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});

const ShareLinkModal = memo(function ShareLinkModal({
  shareUrl,
  onClose,
}: {
  shareUrl: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  return (
    <div className="export-modal-overlay" onClick={onClose} role="presentation">
      <div className="export-modal" role="dialog" aria-modal="true" aria-label="Share model" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>Share this model</h2>
          <button className="export-modal-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <p className="export-modal-lead">Share this URL with your team so they can open the same model in EventCatalog Modelling.</p>

        <div className="command-row">
          <code>{shareUrl}</code>
          <button className="command-copy-btn" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="share-modal-note">
          Data is local and not stored.
        </p>
      </div>
    </div>
  );
});

const ExportHelpModal = memo(function ExportHelpModal({
  exportResult,
  onClose,
}: {
  exportResult: ExportResult;
  onClose: () => void;
}) {
  const [copiedValue, setCopiedValue] = useState<string>('');
  const hasMultiple = exportResult.isZip;
  const importedFiles = hasMultiple
    ? exportResult.ecFiles.map((file) => `${EXPORT_EXTRACT_DIR}/${file}`).join(' ')
    : `./${exportResult.ecFiles[0] ?? 'main.ec'}`;
  const unzipCommand = `unzip ${exportResult.fileName} -d ${EXPORT_EXTRACT_DIR}`;
  const createCommand = `npx @eventcatalog/cli --dir ./my-catalog import ${importedFiles}`;
  const updateCommand = `npx @eventcatalog/cli --dir ./existing-catalog import ${importedFiles}`;

  const copy = useCallback((value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(''), 2000);
    });
  }, []);

  return (
    <div className="export-modal-overlay" onClick={onClose} role="presentation">
      <div className="export-modal" role="dialog" aria-modal="true" aria-label="Import into EventCatalog" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>Export downloaded</h2>
          <button className="export-modal-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
        <p className="export-modal-lead">
          Your model is saved as <code>{exportResult.fileName}</code>. Run these commands to turn it into an EventCatalog project.
        </p>

        {hasMultiple && (
          <div className="command-section">
            <p>1. Unzip the model files</p>
            <div className="command-row">
              <code>{unzipCommand}</code>
              <button className="command-copy-btn" onClick={() => copy(unzipCommand)}>
                {copiedValue === unzipCommand ? <Check size={13} /> : <Copy size={13} />}
                Copy
              </button>
            </div>
          </div>
        )}

        <div className="command-section">
          <p>{hasMultiple ? '2' : '1'}. Import into a new EventCatalog project</p>
          <div className="command-row">
            <code>{createCommand}</code>
            <button className="command-copy-btn" onClick={() => copy(createCommand)}>
              {copiedValue === createCommand ? <Check size={13} /> : <Copy size={13} />}
              Copy
            </button>
          </div>
        </div>

        <div className="command-section">
          <p>{hasMultiple ? '3' : '2'}. Import into an existing EventCatalog project</p>
          <div className="command-row">
            <code>{updateCommand}</code>
            <button className="command-copy-btn" onClick={() => copy(updateCommand)}>
              {copiedValue === updateCommand ? <Check size={13} /> : <Copy size={13} />}
              Copy
            </button>
          </div>
        </div>

        <p className="export-modal-tip">Tip: add <code>--dry-run</code> first to preview changes before writing files.</p>
      </div>
    </div>
  );
});

let newFileCounter = 1;

function getCodeFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) return decodeURIComponent(escape(atob(code)));
  } catch {}
  return null;
}

function isNewRoute(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path.endsWith('/new');
}

function getBasePathname(): string {
  const basePath = window.location.pathname.replace(/\/new\/?$/, '/');
  return basePath || '/';
}

function getInitialExample(): number {
  // Restore from URL hash (e.g. #example=3)
  const hash = window.location.hash;
  const match = hash.match(/example=(\d+)/);
  if (match) {
    const idx = Number(match[1]);
    if (idx >= 0 && idx < examples.length) return idx;
  }
  return 0;
}

function getInitialFiles(): Record<string, string> {
  const code = getCodeFromUrl();
  if (code) return { 'main.ec': code };
  if (isNewRoute()) return { 'main.ec': '' };
  return { ...examples[getInitialExample()].source };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function App() {
  const [selectedExample, setSelectedExample] = useState(getInitialExample);
  const [loadedFromUrl, setLoadedFromUrl] = useState(() => getCodeFromUrl() !== null);
  const [templateUnselected, setTemplateUnselected] = useState(() => isNewRoute() && getCodeFromUrl() === null);
  const [files, setFiles] = useState<Record<string, string>>(getInitialFiles);
  const [activeFile, setActiveFile] = useState(Object.keys(getInitialFiles())[0]);
  const [activeVisualizer, setActiveVisualizer] = useState<string | undefined>(undefined);
  const { graph, errors, fileOffsets } = useDslParser(files, activeVisualizer);
  const [splitPct, setSplitPct] = useState(DEFAULT_SPLIT);
  const [fullscreen, setFullscreen] = useState(false);
  const [vizTheme, setVizTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('ec-playground-theme');
      if (saved === 'dark' || saved === 'light') {
        document.documentElement.setAttribute('data-theme', saved);
        return saved;
      }
    } catch {}
    return 'light';
  });
  const isDragging = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const toggleVizTheme = useCallback(() => {
    setVizTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ec-playground-theme', next); } catch {}
      return next;
    });
  }, []);

  const handleExampleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '') return;
    const idx = Number(e.target.value);
    if (e.target.value === 'url') return;
    setSelectedExample(idx);
    setTemplateUnselected(false);
    setLoadedFromUrl(false);
    // Clear ?code param when switching to a built-in example
    const url = new URL(window.location.href);
    url.pathname = getBasePathname();
    url.search = '';
    url.hash = `example=${idx}`;
    window.history.replaceState(null, '', url.toString());
    const newFiles = { ...examples[idx].source };
    setFiles(newFiles);
    setActiveFile(Object.keys(newFiles)[0]);
    setActiveVisualizer(undefined);
  }, []);

  const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [exportRecentlyDownloaded, setExportRecentlyDownloaded] = useState(false);
  const [latestExport, setLatestExport] = useState<ExportResult | null>(null);
  const handleShare = useCallback(() => {
    const allContent = Object.values(files).join('\n');
    const encoded = btoa(unescape(encodeURIComponent(allContent)));
    const url = new URL(window.location.href);
    url.pathname = getBasePathname();
    url.search = `?code=${encoded}`;
    url.hash = '';
    setShareUrl(url.toString());
  }, [files]);

  const handleExportForImport = useCallback(() => {
    const ecFiles = Object.entries(files)
      .filter(([filename]) => filename.toLowerCase().endsWith('.ec'))
      .map(([filename, content]) => ({ name: filename, content }));

    const ecFileNames = ecFiles.map((file) => file.name);

    if (ecFiles.length <= 1) {
      const oneFile = ecFiles[0] ?? { name: 'main.ec', content: '' };
      const blob = new Blob([oneFile.content], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, oneFile.name);
      setLatestExport({
        fileName: oneFile.name,
        isZip: false,
        ecFiles: [oneFile.name],
      });
    } else {
      const zip = createZipBlob(ecFiles);
      downloadBlob(zip, 'ec-model.zip');
      setLatestExport({
        fileName: 'ec-model.zip',
        isZip: true,
        ecFiles: ecFileNames,
      });
    }

    setExportRecentlyDownloaded(true);
    setTimeout(() => setExportRecentlyDownloaded(false), 2000);
  }, [files]);

  useEffect(() => {
    if (!latestExport && !shareUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLatestExport(null);
        setShareUrl(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [latestExport, shareUrl]);

  const handleFileChange = useCallback((value: string) => {
    setFiles((prev) => ({ ...prev, [activeFile]: value }));
  }, [activeFile]);

  const handleAddFile = useCallback(() => {
    const name = `file${newFileCounter++}.ec`;
    setFiles((prev) => ({ ...prev, [name]: '' }));
    setActiveFile(name);
  }, []);

  const handleCloseFile = useCallback((filename: string) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[filename];
      return next;
    });
    if (activeFile === filename) {
      const remaining = Object.keys(files).filter((f) => f !== filename);
      setActiveFile(remaining[0]);
    }
  }, [activeFile, files]);

  const handleFormat = useCallback(() => {
    setFiles((prev) => ({ ...prev, [activeFile]: formatEc(prev[activeFile]) }));
  }, [activeFile]);

  const activeFileErrors = getErrorsForFile(errors, activeFile, fileOffsets);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.classList.add('resizing');
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(MAX_PANEL_PCT, Math.max(MIN_PANEL_PCT, pct)));
    };

    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.classList.remove('resizing');
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const fileNames = Object.keys(files);

  return (
    <div className="app">
      <AppHeader
        selectedExample={selectedExample}
        templateUnselected={templateUnselected}
        onExampleChange={handleExampleChange}
        vizTheme={vizTheme}
        onToggleVizTheme={toggleVizTheme}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        onShare={handleShare}
        onExportForImport={handleExportForImport}
        exportRecentlyDownloaded={exportRecentlyDownloaded}
        loadedFromUrl={loadedFromUrl}
      />
      <div className="main" ref={mainRef}>
        {!fullscreen && (
          <>
            <div className="editor-pane" style={{ width: `${splitPct}%` }}>
              <div className="pane-header">
                <TabBar
                  files={fileNames}
                  activeFile={activeFile}
                  onSelectFile={setActiveFile}
                  onCloseFile={handleCloseFile}
                  onAddFile={handleAddFile}
                />
                <button className="format-btn" onClick={handleFormat} title="Format code (Shift+Alt+F)">
                  <AlignLeft size={14} />
                </button>
                {errors.length > 0 && (
                  <span className="error-count">
                    {errors.length} error{errors.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <Editor
                value={files[activeFile] ?? ''}
                onChange={handleFileChange}
                errors={activeFileErrors}
                allFiles={files}
                onFormat={handleFormat}
              />
            </div>
            <div className="resize-handle" onMouseDown={onMouseDown}>
              <div className="resize-handle-line" />
            </div>
          </>
        )}
        <div className="visualizer-pane" style={{ width: fullscreen ? '100%' : `${100 - splitPct}%` }}>
          {graph.empty ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgb(var(--ec-page-text-muted))', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>No visualizer block found</p>
              <p style={{ fontSize: '13px' }}>Add a <code>visualizer</code> block to see the architecture diagram</p>
            </div>
          ) : (
            <>
              {graph.visualizers && graph.visualizers.length > 1 && (
                <div style={{ padding: '4px 8px', borderBottom: '1px solid rgb(var(--ec-page-border))', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'rgb(var(--ec-page-text-muted))' }}>View:</span>
                  <select
                    value={graph.activeVisualizer || ''}
                    onChange={(e) => setActiveVisualizer(e.target.value)}
                    style={{ fontSize: '12px', background: 'rgb(var(--ec-card-bg))', color: 'rgb(var(--ec-page-text))', border: '1px solid rgb(var(--ec-page-border))', borderRadius: '4px', padding: '2px 6px' }}
                  >
                    {graph.visualizers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
              <Visualizer key={fullscreen ? 'fs' : 'split'} graph={graph} />
            </>
          )}
        </div>
      </div>
      {shareUrl && <ShareLinkModal shareUrl={shareUrl} onClose={() => setShareUrl(null)} />}
      {latestExport && <ExportHelpModal exportResult={latestExport} onClose={() => setLatestExport(null)} />}
    </div>
  );
}
