import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Editor } from './components/Editor';
import { Visualizer } from './components/Visualizer';
import { TabBar } from './components/TabBar';
import { TemplatePicker } from './components/TemplatePicker';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import type { EditorHandle } from './components/Editor';
import { useDslParser, compileDsl } from './hooks/useDslParser';
import { getErrorsForFile } from './monaco/ec-diagnostics';
import { examples } from './examples/index';
import { createZipBlob } from './utils/zip';
import { normalizeCompiledCatalogFiles } from './utils/catalog-export';
import { ChevronDown, AlignLeft, Check, Download, Share2, Sun, Moon, X, Copy, FolderDown } from 'lucide-react';
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
  loadedFromUrl,
  onExport,
  onExportCatalog,
  exportRecentlyDownloaded,
  onShare,
  vizTheme,
  onToggleVizTheme,
}: {
  selectedExample: number;
  templateUnselected: boolean;
  onExampleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  loadedFromUrl: boolean;
  onExport: () => void;
  onExportCatalog: () => void;
  exportRecentlyDownloaded: boolean;
  onShare: () => void;
  vizTheme: 'light' | 'dark';
  onToggleVizTheme: () => void;
}) {
  const currentName = loadedFromUrl
    ? 'Shared Link'
    : templateUnselected
      ? ''
      : examples[selectedExample]?.name ?? '';

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [exportOpen]);

  return (
    <header className="header">
      <div className="header-logo">
        <h1>EventCatalog Canvas{currentName ? <span className="header-template-name"> — {currentName}</span> : ''}</h1>
      </div>
      <div className="header-actions">
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
                Shared Link
              </option>
            )}
            {examples.map((ex, i) => (
              <option key={i} value={i}>
                {ex.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="example-select-arrow" />
        </div>
        <button
          className="header-icon-btn"
          onClick={onToggleVizTheme}
          title={vizTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          {vizTheme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button className="header-icon-btn" onClick={onShare} title="Share model link">
          <Share2 size={15} />
        </button>
        <div className="export-dropdown-wrapper" ref={exportRef}>
          <button className="export-btn-header" onClick={() => setExportOpen((v) => !v)}>
            {exportRecentlyDownloaded ? <Check size={14} /> : <Download size={14} />}
            Export
            <ChevronDown size={12} />
          </button>
          {exportOpen && (
            <div className="export-dropdown">
              <button className="export-dropdown-item" onClick={() => { setExportOpen(false); onExport(); }}>
                <Download size={14} />
                <div>
                  <span className="export-dropdown-item-title">Download DSL files</span>
                  <span className="export-dropdown-item-desc">Export .ec files for use with the CLI</span>
                </div>
              </button>
              <button className="export-dropdown-item" onClick={() => { setExportOpen(false); onExportCatalog(); }}>
                <FolderDown size={14} />
                <div>
                  <span className="export-dropdown-item-title">Download as Catalog</span>
                  <span className="export-dropdown-item-desc">Ready-to-run project — just npm install and start</span>
                </div>
              </button>
            </div>
          )}
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

        <p className="export-modal-lead">Share this URL with your team so they can open the same model in EventCatalog Canvas.</p>

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

const CatalogExportModal = memo(function CatalogExportModal({
  organizationName,
  onOrganizationNameChange,
  onCreateCatalog,
  isExporting,
  onClose,
}: {
  organizationName: string;
  onOrganizationNameChange: (value: string) => void;
  onCreateCatalog: () => void;
  isExporting: boolean;
  onClose: () => void;
}) {
  return (
    <div className="export-modal-overlay" onClick={onClose} role="presentation">
      <div className="export-modal export-modal--compact" role="dialog" aria-modal="true" aria-label="Export catalog" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>Customize Your Catalog</h2>
          <button className="export-modal-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
        <p className="export-modal-lead">
          We will customize your catalog for your organization.
        </p>
        <form
          className="catalog-export-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateCatalog();
          }}
        >
          <label htmlFor="organization-name" className="catalog-export-label">
            Organization Name
          </label>
          <input
            id="organization-name"
            className="catalog-export-input"
            type="text"
            value={organizationName}
            onChange={(e) => onOrganizationNameChange(e.target.value)}
            placeholder="My Organization"
            autoFocus
            disabled={isExporting}
          />
          <button
            className="catalog-export-submit"
            type="submit"
            disabled={isExporting || organizationName.trim().length === 0}
          >
            {isExporting ? 'Creating Zip...' : 'Create Catalog Zip'}
          </button>
        </form>
      </div>
    </div>
  );
});

let newFileCounter = 1;

const DRAFT_KEY = 'ec-canvas-draft';
const DRAFT_ACTIVE_FILE_KEY = 'ec-canvas-draft-active';

function saveDraft(files: Record<string, string>, activeFile: string): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(files));
    localStorage.setItem(DRAFT_ACTIVE_FILE_KEY, activeFile);
  } catch {}
}

function loadDraft(): { files: Record<string, string>; activeFile: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const files = JSON.parse(raw);
    if (!files || typeof files !== 'object' || Object.keys(files).length === 0) return null;
    const activeFile = localStorage.getItem(DRAFT_ACTIVE_FILE_KEY) || Object.keys(files)[0];
    return { files, activeFile };
  } catch {}
  return null;
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_ACTIVE_FILE_KEY);
  } catch {}
}

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
  return basePath || '/playground';
}

function hasExampleHash(): boolean {
  return /example=\d+/.test(window.location.hash);
}

function shouldShowTemplatePicker(): boolean {
  if (getCodeFromUrl() || hasExampleHash() || loadDraft()) return false;
  return true;
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
  const draft = loadDraft();
  if (draft) return draft.files;
  if (shouldShowTemplatePicker()) return { 'main.ec': '' };
  return { ...examples[getInitialExample()].source };
}

function getInitialActiveFile(): string {
  const code = getCodeFromUrl();
  if (code) return 'main.ec';
  if (isNewRoute()) return 'main.ec';
  const draft = loadDraft();
  if (draft) return draft.activeFile;
  return Object.keys(examples[getInitialExample()].source)[0];
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
  const [templateUnselected, setTemplateUnselected] = useState(() => !shouldShowTemplatePicker() && isNewRoute() && getCodeFromUrl() === null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(shouldShowTemplatePicker);
  const [files, setFiles] = useState<Record<string, string>>(getInitialFiles);
  const [activeFile, setActiveFile] = useState(getInitialActiveFile);
  // Track whether the current session is user-authored content that should be saved
  const isUserDraft = useRef(!!getCodeFromUrl() || isNewRoute() || !!loadDraft());
  const [activeVisualizer, setActiveVisualizer] = useState<string | undefined>(undefined);
  const { graph, errors, fileOffsets } = useDslParser(files, activeVisualizer);
  const [splitPct, setSplitPct] = useState(DEFAULT_SPLIT);
  const [vizTheme, setVizTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('ec-playground-theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {}
    return 'light';
  });
  // Set data-theme on mount (runs after any landing page cleanup)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', vizTheme);
  }, [vizTheme]);

  const [cmdkOpen, setCmdkOpen] = useState(false);
  const editorRef = useRef<EditorHandle>(null);
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
    isUserDraft.current = false;
    clearDraft();
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

  const handleTemplateSelect = useCallback((exampleIndex: number) => {
    setSelectedExample(exampleIndex);
    setTemplateUnselected(false);
    setShowTemplatePicker(false);
    isUserDraft.current = false;
    clearDraft();
    const url = new URL(window.location.href);
    url.hash = `example=${exampleIndex}`;
    window.history.replaceState(null, '', url.toString());
    const newFiles = { ...examples[exampleIndex].source };
    setFiles(newFiles);
    setActiveFile(Object.keys(newFiles)[0]);
    setActiveVisualizer(undefined);
  }, []);

  const handleBlankStart = useCallback(() => {
    setShowTemplatePicker(false);
    setTemplateUnselected(true);
    isUserDraft.current = true;
    setFiles({ 'main.ec': '' });
    setActiveFile('main.ec');
  }, []);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [exportRecentlyDownloaded, setExportRecentlyDownloaded] = useState(false);
  const [latestExport, setLatestExport] = useState<ExportResult | null>(null);
  const [showCatalogExport, setShowCatalogExport] = useState(false);
  const [catalogOrganizationName, setCatalogOrganizationName] = useState('My Organization');
  const [isCatalogExporting, setIsCatalogExporting] = useState(false);
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

  const handleOpenCatalogExport = useCallback(() => {
    setShowCatalogExport(true);
  }, []);

  const handleExportCatalog = useCallback(async () => {
    const organizationName = catalogOrganizationName.trim();
    if (!organizationName) return;
    const organizationSlug =
      organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'my-organization';
    const catalogFolderName = `${organizationSlug}-catalog`;

    setIsCatalogExporting(true);

    try {
      const compiled = normalizeCompiledCatalogFiles(await compileDsl(files));

      if (compiled.length === 0) {
        return;
      }

      const catalogId = crypto.randomUUID();

      const packageJson = JSON.stringify({
        name: catalogFolderName,
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'eventcatalog dev',
          build: 'eventcatalog build',
          start: 'eventcatalog start',
          preview: 'eventcatalog preview',
        },
        dependencies: {
          '@eventcatalog/core': 'latest',
        },
      }, null, 2);

      const configJs = `/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  title: 'EventCatalog',
  tagline: 'Discover, Explore and Document your Event Driven Architectures.',
  organizationName: ${JSON.stringify(organizationName)},
  homepageLink: 'https://eventcatalog.dev/',
  output: 'static',
  trailingSlash: false,
  base: '/',
  navigation: {
    pages: ['list:all'],
  },
  logo: {
    alt: 'EventCatalog Logo',
    src: '/logo.png',
    text: 'EventCatalog',
  },
  cId: '${catalogId}',
};
`;
      const readmeMd = `# ${organizationName} Catalog

Welcome to your generated EventCatalog project.

## Helpful Links

- [Fundamentals of EventCatalog](https://www.eventcatalog.dev/docs/development/getting-started/fundamentals)
- [Documenting your first domain](https://www.eventcatalog.dev/docs/development/guides/domains/creating-domains/adding-domains)
- [Documenting services](https://www.eventcatalog.dev/docs/development/guides/services/introduction)
- [Integrating with OpenAPI and AsyncAPI](https://www.eventcatalog.dev/integrations)
- [Join the Discord community](https://eventcatalog.dev/discord)
`;

      const zipFiles = [
        { name: `${catalogFolderName}/package.json`, content: packageJson },
        { name: `${catalogFolderName}/eventcatalog.config.js`, content: configJs },
        { name: `${catalogFolderName}/README.md`, content: readmeMd },
        ...compiled.map((file) => ({
          name: `${catalogFolderName}/${file.path}`,
          content: file.content,
        })),
      ];

      const blob = createZipBlob(zipFiles);
      downloadBlob(blob, `${catalogFolderName}.zip`);

      setShowCatalogExport(false);
      setExportRecentlyDownloaded(true);
      setTimeout(() => setExportRecentlyDownloaded(false), 2000);
    } catch (err) {
      console.error('Catalog export error:', err);
    } finally {
      setIsCatalogExporting(false);
    }
  }, [catalogOrganizationName, files]);

  useEffect(() => {
    if (!latestExport && !shareUrl && !showCatalogExport) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLatestExport(null);
        setShareUrl(null);
        setShowCatalogExport(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [latestExport, shareUrl, showCatalogExport]);

  // Persist files to localStorage so user work survives page refreshes
  useEffect(() => {
    if (isUserDraft.current) {
      saveDraft(files, activeFile);
    }
  }, [files, activeFile]);

  const handleFileChange = useCallback((value: string) => {
    isUserDraft.current = true;
    setFiles((prev) => ({ ...prev, [activeFile]: value }));
  }, [activeFile]);

  const handleAddFile = useCallback(() => {
    isUserDraft.current = true;
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

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleGoToLine = useCallback((line: number) => {
    editorRef.current?.revealLine(line);
  }, []);

  const handleSwitchFileAndLine = useCallback((filename: string, line: number) => {
    setActiveFile(filename);
    // Wait for editor to update with new file content before revealing line
    requestAnimationFrame(() => {
      editorRef.current?.revealLine(line);
    });
  }, []);

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
        loadedFromUrl={loadedFromUrl}
        onExport={handleExportForImport}
        onExportCatalog={handleOpenCatalogExport}
        exportRecentlyDownloaded={exportRecentlyDownloaded}
        onShare={handleShare}
        vizTheme={vizTheme}
        onToggleVizTheme={toggleVizTheme}
      />
      <div className="main" ref={mainRef}>
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
            ref={editorRef}
            value={files[activeFile] ?? ''}
            onChange={handleFileChange}
            errors={activeFileErrors}
            allFiles={files}
            onFormat={handleFormat}
            onCommandPalette={() => setCmdkOpen(true)}
          />
        </div>
        <div className="resize-handle" onMouseDown={onMouseDown}>
          <div className="resize-handle-line" />
        </div>
        <div className="visualizer-pane" style={{ width: `${100 - splitPct}%` }}>
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
              <Visualizer graph={graph} />
            </>
          )}
        </div>
      </div>
      <StatusBar
        nodes={graph.nodes}
        errorCount={errors.length}
        onCommandPalette={() => setCmdkOpen(true)}
      />
      {shareUrl && <ShareLinkModal shareUrl={shareUrl} onClose={() => setShareUrl(null)} />}
      {latestExport && <ExportHelpModal exportResult={latestExport} onClose={() => setLatestExport(null)} />}
      {showCatalogExport && (
        <CatalogExportModal
          organizationName={catalogOrganizationName}
          onOrganizationNameChange={setCatalogOrganizationName}
          onCreateCatalog={handleExportCatalog}
          isExporting={isCatalogExporting}
          onClose={() => setShowCatalogExport(false)}
        />
      )}
      {showTemplatePicker && <TemplatePicker onSelect={handleTemplateSelect} onBlank={handleBlankStart} />}
      <CommandPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        nodes={graph.nodes}
        files={files}
        activeFile={activeFile}
        onGoToLine={handleGoToLine}
        onSwitchFile={handleSwitchFileAndLine}
      />
    </div>
  );
}
