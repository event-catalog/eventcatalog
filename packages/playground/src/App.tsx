import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Editor } from './components/Editor';
import { Visualizer } from './components/Visualizer';
import { TabBar } from './components/TabBar';
import { useDslParser } from './hooks/useDslParser';
import { getErrorsForFile } from './monaco/ec-diagnostics';
import { examples } from './examples';
import { Zap, ChevronDown, AlignLeft, Maximize2, Minimize2, Sun, Moon, Share2, Check } from 'lucide-react';
import { formatEc } from '@eventcatalog/language-server';

const MIN_PANEL_PCT = 20;
const MAX_PANEL_PCT = 80;
const DEFAULT_SPLIT = 45;

const AppHeader = memo(function AppHeader({
  selectedExample,
  onExampleChange,
  vizTheme,
  onToggleVizTheme,
  fullscreen,
  onToggleFullscreen,
  onShare,
  shareRecentlyCopied,
  loadedFromUrl,
}: {
  selectedExample: number;
  onExampleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  vizTheme: 'light' | 'dark';
  onToggleVizTheme: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onShare: () => void;
  shareRecentlyCopied: boolean;
  loadedFromUrl: boolean;
}) {
  return (
    <header className="header">
      <div className="header-logo">
        <Zap size={20} />
        <h1>EventCatalog DSL Playground</h1>
      </div>
      <div className="example-select-wrapper">
        <select
          className="example-select"
          value={loadedFromUrl ? 'url' : selectedExample}
          onChange={onExampleChange}
        >
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
      <span className="subtitle">Edit DSL on the left, see the architecture on the right</span>
      <button
        className="fullscreen-btn"
        onClick={onShare}
        title="Copy shareable link to clipboard"
      >
        {shareRecentlyCopied ? <Check size={15} /> : <Share2 size={15} />}
      </button>
      <button
        className="fullscreen-btn"
        onClick={onToggleVizTheme}
        title={vizTheme === 'light' ? 'Dark visualizer' : 'Light visualizer'}
      >
        {vizTheme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      </button>
      <button
        className="fullscreen-btn"
        onClick={onToggleFullscreen}
        title={fullscreen ? 'Show editor' : 'Fullscreen visualizer'}
      >
        {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    </header>
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
  return { ...examples[getInitialExample()].source };
}

export default function App() {
  const [selectedExample, setSelectedExample] = useState(getInitialExample);
  const [loadedFromUrl, setLoadedFromUrl] = useState(() => getCodeFromUrl() !== null);
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
    const idx = Number(e.target.value);
    if (e.target.value === 'url') return;
    setSelectedExample(idx);
    setLoadedFromUrl(false);
    // Clear ?code param when switching to a built-in example
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = `example=${idx}`;
    window.history.replaceState(null, '', url.toString());
    const newFiles = { ...examples[idx].source };
    setFiles(newFiles);
    setActiveFile(Object.keys(newFiles)[0]);
    setActiveVisualizer(undefined);
  }, []);

  const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  const [shareRecentlyCopied, setShareRecentlyCopied] = useState(false);
  const handleShare = useCallback(() => {
    const allContent = Object.values(files).join('\n');
    const encoded = btoa(unescape(encodeURIComponent(allContent)));
    const url = new URL(window.location.href);
    url.search = `?code=${encoded}`;
    url.hash = '';
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShareRecentlyCopied(true);
      setTimeout(() => setShareRecentlyCopied(false), 2000);
    });
  }, [files]);

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
        onExampleChange={handleExampleChange}
        vizTheme={vizTheme}
        onToggleVizTheme={toggleVizTheme}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        onShare={handleShare}
        shareRecentlyCopied={shareRecentlyCopied}
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
    </div>
  );
}
