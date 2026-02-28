import { useState, useCallback, useRef, useEffect, memo } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { Editor } from "./components/Editor";
import { Visualizer } from "./components/Visualizer";
import { TabBar } from "./components/TabBar";
import { TemplatePicker } from "./components/TemplatePicker";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import type { EditorHandle } from "./components/Editor";
import { useDslParser, compileDsl } from "./hooks/useDslParser";
import { getErrorsForFile } from "./monaco/ec-diagnostics";
import { examples } from "./examples/index";
import { createZipBlob } from "./utils/zip";
import { normalizeCompiledCatalogFiles } from "./utils/catalog-export";
import { NextStepsGuide } from "./components/NextStepsGuide";
import {
  $theme,
  $workspace,
  loadWorkspace,
  saveWorkspace,
  clearWorkspace,
  loadDraft as loadDraftStore,
  saveDraft as saveDraftStore,
  clearDraft as clearDraftStore,
  getSpecFile,
  peekDraft,
  peekWorkspaceFiles,
} from "./stores/workspace";
import {
  ChevronDown,
  AlignLeft,
  Check,
  Download,
  Share2,
  Sun,
  Moon,
  X,
  Copy,
  FolderDown,
} from "lucide-react";
import { formatEc } from "@eventcatalog/language-server";

const MIN_PANEL_PCT = 20;
const MAX_PANEL_PCT = 80;
const DEFAULT_SPLIT = 45;
const EXPORT_EXTRACT_DIR = "./ec-model";

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
  workspaceTitle,
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
  workspaceTitle?: string;
  onExport: () => void;
  onExportCatalog: () => void;
  exportRecentlyDownloaded: boolean;
  onShare: () => void;
  vizTheme: "light" | "dark";
  onToggleVizTheme: () => void;
}) {
  const currentName = workspaceTitle
    ? workspaceTitle
    : loadedFromUrl
      ? "Shared Link"
      : templateUnselected
        ? ""
        : (examples[selectedExample]?.name ?? "");

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [exportOpen]);

  return (
    <header className="header">
      <div className="header-logo">
        <a
          href="/"
          className="header-home-link"
          aria-label="Go to EventCatalog Compass homepage"
        >
          <h1>
            EventCatalog Compass
            {currentName ? (
              <span className="header-template-name"> — {currentName}</span>
            ) : (
              ""
            )}
          </h1>
        </a>
      </div>
      <div className="header-actions">
        <div className="example-select-wrapper">
          <select
            className="example-select"
            value={
              loadedFromUrl ? "url" : templateUnselected ? "" : selectedExample
            }
            onChange={onExampleChange}
          >
            {templateUnselected && (
              <option value="" disabled>
                Select a template
              </option>
            )}
            {loadedFromUrl && <option value="url">Shared Link</option>}
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
          title={
            vizTheme === "light"
              ? "Switch to dark theme"
              : "Switch to light theme"
          }
        >
          {vizTheme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button
          className="header-icon-btn"
          onClick={onShare}
          title="Share model link"
        >
          <Share2 size={15} />
        </button>
        <div className="export-dropdown-wrapper" ref={exportRef}>
          <button
            className="export-btn-header"
            onClick={() => setExportOpen((v) => !v)}
          >
            {exportRecentlyDownloaded ? (
              <Check size={14} />
            ) : (
              <Download size={14} />
            )}
            Export
            <ChevronDown size={12} />
          </button>
          {exportOpen && (
            <div className="export-dropdown">
              <button
                className="export-dropdown-item"
                onClick={() => {
                  setExportOpen(false);
                  onExport();
                }}
              >
                <Download size={14} />
                <div>
                  <span className="export-dropdown-item-title">
                    Download DSL files
                  </span>
                  <span className="export-dropdown-item-desc">
                    Export .ec files for use with the CLI
                  </span>
                </div>
              </button>
              <button
                className="export-dropdown-item"
                onClick={() => {
                  setExportOpen(false);
                  onExportCatalog();
                }}
              >
                <FolderDown size={14} />
                <div>
                  <span className="export-dropdown-item-title">
                    Download as Catalog
                  </span>
                  <span className="export-dropdown-item-desc">
                    Ready-to-run project — just npm install and start
                  </span>
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
      <div
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Share model"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="export-modal-header">
          <h2>Share this model</h2>
          <button
            className="export-modal-close"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="export-modal-lead">
          Share this URL with your team so they can open the same model in
          EventCatalog Compass.
        </p>

        <div className="command-row">
          <code>{shareUrl}</code>
          <button className="command-copy-btn" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="share-modal-note">Data is local and not stored.</p>
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
  const [copiedValue, setCopiedValue] = useState<string>("");
  const hasMultiple = exportResult.isZip;
  const importedFiles = hasMultiple
    ? exportResult.ecFiles
        .map((file) => `${EXPORT_EXTRACT_DIR}/${file}`)
        .join(" ")
    : `./${exportResult.ecFiles[0] ?? "main.ec"}`;
  const unzipCommand = `unzip ${exportResult.fileName} -d ${EXPORT_EXTRACT_DIR}`;
  const createCommand = `npx @eventcatalog/cli --dir ./my-catalog import ${importedFiles}`;
  const updateCommand = `npx @eventcatalog/cli --dir ./existing-catalog import ${importedFiles}`;

  const copy = useCallback((value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(""), 2000);
    });
  }, []);

  return (
    <div className="export-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import into EventCatalog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="export-modal-header">
          <h2>Export downloaded</h2>
          <button
            className="export-modal-close"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <p className="export-modal-lead">
          Your model is saved as <code>{exportResult.fileName}</code>. Run these
          commands to turn it into an EventCatalog project.
        </p>

        {hasMultiple && (
          <div className="command-section">
            <p>1. Unzip the model files</p>
            <div className="command-row">
              <code>{unzipCommand}</code>
              <button
                className="command-copy-btn"
                onClick={() => copy(unzipCommand)}
              >
                {copiedValue === unzipCommand ? (
                  <Check size={13} />
                ) : (
                  <Copy size={13} />
                )}
                Copy
              </button>
            </div>
          </div>
        )}

        <div className="command-section">
          <p>
            {hasMultiple ? "2" : "1"}. Import into a new EventCatalog project
          </p>
          <div className="command-row">
            <code>{createCommand}</code>
            <button
              className="command-copy-btn"
              onClick={() => copy(createCommand)}
            >
              {copiedValue === createCommand ? (
                <Check size={13} />
              ) : (
                <Copy size={13} />
              )}
              Copy
            </button>
          </div>
        </div>

        <div className="command-section">
          <p>
            {hasMultiple ? "3" : "2"}. Import into an existing EventCatalog
            project
          </p>
          <div className="command-row">
            <code>{updateCommand}</code>
            <button
              className="command-copy-btn"
              onClick={() => copy(updateCommand)}
            >
              {copiedValue === updateCommand ? (
                <Check size={13} />
              ) : (
                <Copy size={13} />
              )}
              Copy
            </button>
          </div>
        </div>

        <p className="export-modal-tip">
          Tip: add <code>--dry-run</code> first to preview changes before
          writing files.
        </p>
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
      <div
        className="export-modal export-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-label="Export catalog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="export-modal-header">
          <h2>Customize Your Catalog</h2>
          <button
            className="export-modal-close"
            onClick={onClose}
            title="Close"
          >
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
            {isExporting ? "Creating Zip..." : "Create Catalog Zip"}
          </button>
        </form>
      </div>
    </div>
  );
});

let newFileCounter = 1;

function getCodeFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) return decodeURIComponent(escape(atob(code)));
  } catch {}
  return null;
}

function isNewRoute(): boolean {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path.endsWith("/new");
}

function getBasePathname(): string {
  const basePath = window.location.pathname.replace(/\/new\/?$/, "/");
  return basePath || "/playground";
}

function hasExampleHash(): boolean {
  return /example=\d+/.test(window.location.hash);
}

function shouldShowTemplatePicker(workspaceId?: string): boolean {
  if (workspaceId) return false;
  if (getCodeFromUrl() || hasExampleHash() || peekDraft()) return false;
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

function getInitialState(workspaceId?: string): { files: Record<string, string>; activeFile: string } {
  const defaultState = { files: { "main.ec": "" }, activeFile: "main.ec" };
  if (workspaceId) {
    return peekWorkspaceFiles(workspaceId) ?? defaultState;
  }
  const code = getCodeFromUrl();
  if (code) return { files: { "main.ec": code }, activeFile: "main.ec" };
  if (isNewRoute()) return defaultState;
  const draft = peekDraft();
  if (draft) return draft;
  if (shouldShowTemplatePicker()) return defaultState;
  const source = examples[getInitialExample()].source;
  return { files: { ...source }, activeFile: Object.keys(source)[0] };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function App() {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const ws = useStore($workspace);
  const vizTheme = useStore($theme);

  // Load workspace store on mount (once)
  const wsLoadedRef = useRef(false);
  if (!wsLoadedRef.current && workspaceId) {
    loadWorkspace(workspaceId);
    wsLoadedRef.current = true;
  }

  const [selectedExample, setSelectedExample] = useState(getInitialExample);
  const [loadedFromUrl, setLoadedFromUrl] = useState(
    () => getCodeFromUrl() !== null,
  );
  const [templateUnselected, setTemplateUnselected] = useState(
    () =>
      !shouldShowTemplatePicker(workspaceId) &&
      isNewRoute() &&
      getCodeFromUrl() === null,
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(() =>
    shouldShowTemplatePicker(workspaceId),
  );
  const [initialState] = useState(() => getInitialState(workspaceId));
  const [files, setFiles] = useState<Record<string, string>>(
    initialState.files,
  );
  const [activeFile, setActiveFile] = useState(initialState.activeFile);
  // Track whether the current session is user-authored content that should be saved
  const isUserDraft = useRef(
    !!workspaceId || !!getCodeFromUrl() || isNewRoute() || !!peekDraft(),
  );
  const [activeVisualizer, setActiveVisualizer] = useState<string | undefined>(
    undefined,
  );
  const { graph, errors, fileOffsets } = useDslParser(files, activeVisualizer);
  const [splitPct, setSplitPct] = useState(DEFAULT_SPLIT);

  // Workspace-derived values from the store
  const showGuide = workspaceId ? ws.showGuide : false;
  const workspaceKind = workspaceId ? ws.kind : undefined;
  const workspaceSpecFile = workspaceId ? getSpecFile(ws.files) : "spec.yml";
  const workspaceServiceNames = workspaceId ? ws.services : [];

  // Set data-theme on mount and when theme changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", vizTheme);
  }, [vizTheme]);

  // Set document title based on workspace
  useEffect(() => {
    if (workspaceId && ws.title) {
      document.title = `EventCatalog Compass — ${ws.title}`;
    } else {
      document.title = "EventCatalog Compass";
    }
    return () => {
      document.title = "EventCatalog Compass";
    };
  }, [workspaceId, ws.title]);

  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{
    nodeId: string;
    requestId: number;
  } | null>(null);
  const [fitRequestId, setFitRequestId] = useState(0);
  const editorRef = useRef<EditorHandle>(null);
  const isDragging = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const toggleVizTheme = useCallback(() => {
    const next = $theme.get() === "light" ? "dark" : "light";
    $theme.set(next);
  }, []);

  const loadExample = useCallback(
    (idx: number) => {
      setSelectedExample(idx);
      setTemplateUnselected(false);
      setLoadedFromUrl(false);
      isUserDraft.current = false;
      if (workspaceId) {
        clearWorkspace(workspaceId);
      } else {
        clearDraftStore();
      }
      const url = new URL(window.location.href);
      url.pathname = getBasePathname();
      url.search = "";
      url.hash = `example=${idx}`;
      window.history.replaceState(null, "", url.toString());
      const newFiles = { ...examples[idx].source };
      setFiles(newFiles);
      setActiveFile(Object.keys(newFiles)[0]);
      setActiveVisualizer(undefined);
    },
    [workspaceId],
  );

  const handleExampleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === "" || e.target.value === "url") return;
      loadExample(Number(e.target.value));
    },
    [loadExample],
  );

  const handleTemplateSelect = useCallback(
    (exampleIndex: number) => {
      setShowTemplatePicker(false);
      loadExample(exampleIndex);
    },
    [loadExample],
  );

  const handleBlankStart = useCallback(() => {
    setShowTemplatePicker(false);
    setTemplateUnselected(true);
    isUserDraft.current = true;
    setFiles({ "main.ec": "" });
    setActiveFile("main.ec");
  }, []);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [exportRecentlyDownloaded, setExportRecentlyDownloaded] =
    useState(false);
  const [latestExport, setLatestExport] = useState<ExportResult | null>(null);
  const [showCatalogExport, setShowCatalogExport] = useState(false);
  const [catalogOrganizationName, setCatalogOrganizationName] =
    useState("My Organization");
  const [isCatalogExporting, setIsCatalogExporting] = useState(false);
  const handleShare = useCallback(() => {
    const allContent = Object.values(files).join("\n");
    const encoded = btoa(unescape(encodeURIComponent(allContent)));
    const url = new URL(window.location.href);
    url.pathname = getBasePathname();
    url.search = `?code=${encoded}`;
    url.hash = "";
    setShareUrl(url.toString());
  }, [files]);

  const handleExportForImport = useCallback(() => {
    const ecFiles = Object.entries(files)
      .filter(([filename]) => filename.toLowerCase().endsWith(".ec"))
      .map(([filename, content]) => ({ name: filename, content }));

    const ecFileNames = ecFiles.map((file) => file.name);

    if (ecFiles.length <= 1) {
      const oneFile = ecFiles[0] ?? { name: "main.ec", content: "" };
      const blob = new Blob([oneFile.content], {
        type: "text/plain;charset=utf-8",
      });
      downloadBlob(blob, oneFile.name);
      setLatestExport({
        fileName: oneFile.name,
        isZip: false,
        ecFiles: [oneFile.name],
      });
    } else {
      const zip = createZipBlob(ecFiles);
      downloadBlob(zip, "ec-model.zip");
      setLatestExport({
        fileName: "ec-model.zip",
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
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "my-organization";
    const catalogFolderName = `${organizationSlug}-catalog`;

    setIsCatalogExporting(true);

    try {
      const compiled = normalizeCompiledCatalogFiles(await compileDsl(files));

      if (compiled.length === 0) {
        return;
      }

      const catalogId = crypto.randomUUID();

      const packageJson = JSON.stringify(
        {
          name: catalogFolderName,
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "eventcatalog dev",
            build: "eventcatalog build",
            start: "eventcatalog start",
            preview: "eventcatalog preview",
          },
          dependencies: {
            "@eventcatalog/core": "latest",
          },
        },
        null,
        2,
      );

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
        {
          name: `${catalogFolderName}/eventcatalog.config.js`,
          content: configJs,
        },
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
      console.error("Catalog export error:", err);
    } finally {
      setIsCatalogExporting(false);
    }
  }, [catalogOrganizationName, files]);

  useEffect(() => {
    if (!latestExport && !shareUrl && !showCatalogExport) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLatestExport(null);
        setShareUrl(null);
        setShowCatalogExport(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [latestExport, shareUrl, showCatalogExport]);

  // Persist files to localStorage so user work survives page refreshes
  useEffect(() => {
    if (!isUserDraft.current) return;
    if (workspaceId) {
      $workspace.setKey("files", files);
      $workspace.setKey("activeFile", activeFile);
      saveWorkspace();
    } else {
      saveDraftStore(files, activeFile);
    }
  }, [files, activeFile, workspaceId]);

  const handleFileChange = useCallback(
    (value: string) => {
      isUserDraft.current = true;
      setFiles((prev) => ({ ...prev, [activeFile]: value }));
    },
    [activeFile],
  );

  const handleApplyGuideStep = useCallback(
    (transform: (content: string) => string) => {
      isUserDraft.current = true;
      setFiles((prev) => {
        const mainContent = prev["main.ec"] ?? "";
        return { ...prev, "main.ec": transform(mainContent) };
      });
      setActiveFile("main.ec");
      requestAnimationFrame(() => {
        editorRef.current?.revealLine(99999);
      });
    },
    [],
  );

  const handleDismissGuide = useCallback(() => {
    $workspace.setKey("showGuide", false);
    saveWorkspace();
  }, []);

  const handleAddFile = useCallback(() => {
    isUserDraft.current = true;
    const name = `file${newFileCounter++}.ec`;
    setFiles((prev) => ({ ...prev, [name]: "" }));
    setActiveFile(name);
  }, []);

  const handleCloseFile = useCallback(
    (filename: string) => {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[filename];
        return next;
      });
      if (activeFile === filename) {
        const remaining = Object.keys(files).filter((f) => f !== filename);
        setActiveFile(remaining[0]);
      }
    },
    [activeFile, files],
  );

  const handleFormat = useCallback(() => {
    setFiles((prev) => ({ ...prev, [activeFile]: formatEc(prev[activeFile]) }));
  }, [activeFile]);

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleGoToLine = useCallback((line: number) => {
    editorRef.current?.revealLine(line);
  }, []);

  const handleSwitchFileAndLine = useCallback(
    (filename: string, line: number) => {
      setActiveFile(filename);
      // Wait for editor to update with new file content before revealing line
      requestAnimationFrame(() => {
        editorRef.current?.revealLine(line);
      });
    },
    [],
  );

  const handleFocusResource = useCallback((nodeId: string) => {
    setFocusRequest((prev) => ({
      nodeId,
      requestId: (prev?.requestId ?? 0) + 1,
    }));
  }, []);

  const handleFitScreen = useCallback(() => {
    setFitRequestId((prev) => prev + 1);
  }, []);

  const activeFileErrors = getErrorsForFile(errors, activeFile, fileOffsets);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.classList.add("resizing");
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
        document.body.classList.remove("resizing");
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const fileNames = Object.keys(files);

  const workspaceTitle = workspaceId ? ws.title : undefined;

  return (
    <div className="app">
      <AppHeader
        selectedExample={selectedExample}
        templateUnselected={templateUnselected}
        onExampleChange={handleExampleChange}
        loadedFromUrl={loadedFromUrl}
        workspaceTitle={workspaceTitle}
        onExport={handleExportForImport}
        onExportCatalog={handleOpenCatalogExport}
        exportRecentlyDownloaded={exportRecentlyDownloaded}
        onShare={handleShare}
        vizTheme={vizTheme}
        onToggleVizTheme={toggleVizTheme}
      />
      <div className="main" ref={mainRef}>
        <div
          className="editor-pane"
          style={{ width: `${splitPct}%`, position: "relative" }}
        >
          <div className="pane-header">
            <TabBar
              files={fileNames}
              activeFile={activeFile}
              onSelectFile={setActiveFile}
              onCloseFile={handleCloseFile}
              onAddFile={handleAddFile}
            />
            <button
              className="format-btn"
              onClick={handleFormat}
              title="Format code (Shift+Alt+F)"
            >
              <AlignLeft size={14} />
            </button>
            {errors.length > 0 && (
              <span className="error-count">
                {errors.length} error{errors.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Editor
            ref={editorRef}
            value={files[activeFile] ?? ""}
            onChange={handleFileChange}
            errors={activeFileErrors}
            allFiles={files}
            onFormat={handleFormat}
            onCommandPalette={() => setCmdkOpen(true)}
          />
          {showGuide && workspaceId && workspaceKind && (
            <NextStepsGuide
              specKind={workspaceKind}
              specFile={workspaceSpecFile}
              serviceNames={workspaceServiceNames}
              onApplyStep={handleApplyGuideStep}
              onExportCatalog={handleOpenCatalogExport}
              onDismiss={handleDismissGuide}
            />
          )}
        </div>
        <div className="resize-handle" onMouseDown={onMouseDown}>
          <div className="resize-handle-line" />
        </div>
        <div
          className="visualizer-pane"
          style={{ width: `${100 - splitPct}%` }}
        >
          {graph.empty ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "rgb(var(--ec-page-text-muted))",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <p style={{ fontSize: "16px", fontWeight: 500 }}>
                No visualizer block found
              </p>
              <p style={{ fontSize: "13px" }}>
                Add a <code>visualizer</code> block to see the architecture
                diagram
              </p>
            </div>
          ) : (
            <>
              {graph.visualizers && graph.visualizers.length > 1 && (
                <div
                  style={{
                    padding: "4px 8px",
                    borderBottom: "1px solid rgb(var(--ec-page-border))",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "rgb(var(--ec-page-text-muted))",
                    }}
                  >
                    View:
                  </span>
                  <select
                    value={graph.activeVisualizer || ""}
                    onChange={(e) => setActiveVisualizer(e.target.value)}
                    style={{
                      fontSize: "12px",
                      background: "rgb(var(--ec-card-bg))",
                      color: "rgb(var(--ec-page-text))",
                      border: "1px solid rgb(var(--ec-page-border))",
                      borderRadius: "4px",
                      padding: "2px 6px",
                    }}
                  >
                    {graph.visualizers.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Visualizer
                graph={graph}
                focusNodeId={focusRequest?.nodeId ?? null}
                focusRequestId={focusRequest?.requestId}
                fitRequestId={fitRequestId}
              />
            </>
          )}
        </div>
      </div>
      <StatusBar
        nodes={graph.nodes}
        errorCount={errors.length}
        onCommandPalette={() => setCmdkOpen(true)}
      />
      {shareUrl && (
        <ShareLinkModal shareUrl={shareUrl} onClose={() => setShareUrl(null)} />
      )}
      {latestExport && (
        <ExportHelpModal
          exportResult={latestExport}
          onClose={() => setLatestExport(null)}
        />
      )}
      {showCatalogExport && (
        <CatalogExportModal
          organizationName={catalogOrganizationName}
          onOrganizationNameChange={setCatalogOrganizationName}
          onCreateCatalog={handleExportCatalog}
          isExporting={isCatalogExporting}
          onClose={() => setShowCatalogExport(false)}
        />
      )}
      {showTemplatePicker && (
        <TemplatePicker
          onSelect={handleTemplateSelect}
          onBlank={handleBlankStart}
        />
      )}
      <CommandPalette
        open={cmdkOpen}
        onOpenChange={setCmdkOpen}
        nodes={graph.nodes}
        files={files}
        activeFile={activeFile}
        onGoToLine={handleGoToLine}
        onSwitchFile={handleSwitchFileAndLine}
        onSelectResource={(node) => handleFocusResource(node.id)}
        onFitScreen={handleFitScreen}
      />
    </div>
  );
}
