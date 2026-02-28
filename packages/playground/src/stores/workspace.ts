import { atom, map } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";

// ---------------------------------------------------------------------------
// Global (non-workspace) stores
// ---------------------------------------------------------------------------

/** Visualizer theme — persisted to localStorage and synced across tabs. */
export const $theme = persistentAtom<"light" | "dark">(
  "ec-playground-theme",
  "light",
);

// ---------------------------------------------------------------------------
// Workspace state
// ---------------------------------------------------------------------------

export type SpecKind = "openapi" | "asyncapi";

export interface WorkspaceState {
  /** Short hash identifying this workspace (from the URL). */
  id: string;
  files: Record<string, string>;
  activeFile: string;
  title?: string;
  kind?: SpecKind;
  services: string[];
  showGuide: boolean;
  guideDone: string[];
}

const EMPTY_WORKSPACE: WorkspaceState = {
  id: "",
  files: { "main.ec": "" },
  activeFile: "main.ec",
  title: undefined,
  kind: undefined,
  services: [],
  showGuide: false,
  guideDone: [],
};

/** Reactive store holding the current workspace data. */
export const $workspace = map<WorkspaceState>({ ...EMPTY_WORKSPACE });

// ---------------------------------------------------------------------------
// localStorage key helpers
// ---------------------------------------------------------------------------

function wsKey(id: string, suffix: string) {
  return `ec-workspace-${id}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Load / save / clear — workspace
// ---------------------------------------------------------------------------

/** Load workspace state from localStorage into $workspace. Returns true if data existed. */
export function loadWorkspace(id: string): boolean {
  try {
    const raw = localStorage.getItem(wsKey(id, "files"));
    if (!raw) return false;
    const files = JSON.parse(raw);
    if (!files || typeof files !== "object" || Object.keys(files).length === 0)
      return false;

    const activeFile =
      localStorage.getItem(wsKey(id, "active")) ?? Object.keys(files)[0];
    const title = localStorage.getItem(wsKey(id, "title")) ?? undefined;
    const kind =
      (localStorage.getItem(wsKey(id, "kind")) as SpecKind | null) ?? undefined;
    const services = jsonParse<string[]>(
      localStorage.getItem(wsKey(id, "services")),
      [],
    );
    const showGuide = localStorage.getItem(wsKey(id, "guide")) === "true";
    const guideDone = jsonParse<string[]>(
      localStorage.getItem(wsKey(id, "guide-done")),
      [],
    );

    $workspace.set({
      id,
      files,
      activeFile,
      title,
      kind,
      services,
      showGuide,
      guideDone,
    });
    return true;
  } catch {
    return false;
  }
}

/** Persist the current $workspace snapshot to localStorage. */
export function saveWorkspace(): void {
  const ws = $workspace.get();
  if (!ws.id) return;
  try {
    localStorage.setItem(wsKey(ws.id, "files"), JSON.stringify(ws.files));
    localStorage.setItem(wsKey(ws.id, "active"), ws.activeFile);
    if (ws.title) localStorage.setItem(wsKey(ws.id, "title"), ws.title);
    if (ws.kind) localStorage.setItem(wsKey(ws.id, "kind"), ws.kind);
    localStorage.setItem(wsKey(ws.id, "services"), JSON.stringify(ws.services));
    localStorage.setItem(
      wsKey(ws.id, "guide"),
      ws.showGuide ? "true" : "false",
    );
    localStorage.setItem(
      wsKey(ws.id, "guide-done"),
      JSON.stringify(ws.guideDone),
    );
  } catch {}
}

/** Remove all localStorage entries for a workspace. */
export function clearWorkspace(id: string): void {
  try {
    for (const suffix of [
      "files",
      "active",
      "title",
      "kind",
      "services",
      "guide",
      "guide-done",
    ]) {
      localStorage.removeItem(wsKey(id, suffix));
    }
  } catch {}
  if ($workspace.get().id === id) {
    $workspace.set({ ...EMPTY_WORKSPACE });
  }
}

/**
 * Bootstrap a brand-new workspace from an import (called from Landing page).
 * Writes directly to localStorage and sets $workspace.
 */
export function createWorkspace(opts: {
  id: string;
  files: Record<string, string>;
  activeFile: string;
  title: string;
  kind: SpecKind;
  services: string[];
}): void {
  const ws: WorkspaceState = {
    id: opts.id,
    files: opts.files,
    activeFile: opts.activeFile,
    title: opts.title,
    kind: opts.kind,
    services: opts.services,
    showGuide: true,
    guideDone: [],
  };
  $workspace.set(ws);
  saveWorkspace();
}

// ---------------------------------------------------------------------------
// Draft state (non-workspace sessions)
// ---------------------------------------------------------------------------

const DRAFT_KEY = "ec-compass-draft";
const DRAFT_ACTIVE_KEY = "ec-compass-draft-active";
const LEGACY_DRAFT_KEY = "ec-canvas-draft";
const LEGACY_ACTIVE_KEY = "ec-canvas-draft-active";

export interface DraftState {
  files: Record<string, string>;
  activeFile: string;
}

export const $draft = atom<DraftState | null>(null);

/** Load a non-workspace draft from localStorage. Returns true if found. */
export function loadDraft(): boolean {
  try {
    const raw =
      localStorage.getItem(DRAFT_KEY) ?? localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!raw) return false;
    const files = JSON.parse(raw);
    if (!files || typeof files !== "object" || Object.keys(files).length === 0)
      return false;

    const activeFile =
      localStorage.getItem(DRAFT_ACTIVE_KEY) ??
      localStorage.getItem(LEGACY_ACTIVE_KEY) ??
      Object.keys(files)[0];

    // Migrate legacy keys
    localStorage.setItem(DRAFT_KEY, JSON.stringify(files));
    localStorage.setItem(DRAFT_ACTIVE_KEY, activeFile);

    $draft.set({ files, activeFile });
    return true;
  } catch {
    return false;
  }
}

/** Persist draft to localStorage. */
export function saveDraft(
  files: Record<string, string>,
  activeFile: string,
): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(files));
    localStorage.setItem(DRAFT_ACTIVE_KEY, activeFile);
    $draft.set({ files, activeFile });
  } catch {}
}

/** Remove draft from localStorage. */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_ACTIVE_KEY);
    localStorage.removeItem(LEGACY_DRAFT_KEY);
    localStorage.removeItem(LEGACY_ACTIVE_KEY);
  } catch {}
  $draft.set(null);
}

// ---------------------------------------------------------------------------
// Peek helpers (read from localStorage without updating stores)
// ---------------------------------------------------------------------------

/** Read draft files+activeFile from localStorage without updating the $draft store. */
export function peekDraft(): DraftState | null {
  try {
    const raw =
      localStorage.getItem(DRAFT_KEY) ?? localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!raw) return null;
    const files = JSON.parse(raw);
    if (!files || typeof files !== "object" || Object.keys(files).length === 0)
      return null;
    const activeFile =
      localStorage.getItem(DRAFT_ACTIVE_KEY) ??
      localStorage.getItem(LEGACY_ACTIVE_KEY) ??
      Object.keys(files)[0];
    return { files, activeFile };
  } catch {
    return null;
  }
}

/** Read workspace files+activeFile from localStorage without updating the $workspace store. */
export function peekWorkspaceFiles(
  id: string,
): { files: Record<string, string>; activeFile: string } | null {
  try {
    const raw = localStorage.getItem(wsKey(id, "files"));
    if (!raw) return null;
    const files = JSON.parse(raw);
    if (!files || typeof files !== "object" || Object.keys(files).length === 0)
      return null;
    const activeFile =
      localStorage.getItem(wsKey(id, "active")) ?? Object.keys(files)[0];
    return { files, activeFile };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Derive the first non-.ec filename from workspace files (the spec file). */
export function getSpecFile(files: Record<string, string>): string {
  const specFiles = Object.keys(files).filter((f) => !f.endsWith(".ec"));
  return specFiles[0] ?? "spec.yml";
}
