import { memo, type ReactNode } from "react";
import { useReactFlow, type FitViewOptions } from "@xyflow/react";
import {
  Hand,
  Lock,
  LockOpen,
  Maximize,
  MessageCircle,
  MessageSquareText,
  MousePointer2,
  Type,
  Redo,
  SendToBack,
  StickyNote,
  TriangleAlert,
  Undo,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  DIAGRAM_FIT_VIEW_OPTIONS,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  ZoomLevel,
} from "../../index";
import { LEVELS, type Level } from "../levels";
import type { HotspotSeverity } from "../canvas-doc";
import { SEVERITIES } from "./Hotspots";

// The canvas's bar at the top (lock, select and hand, the levels of detail, notes, text, comments and hotspots),
// and its controls at the bottom left (zoom, undo, fit and reorder, comments and hotspots). Built from the visualiser's toolbar, so they
// look and work like a diagram's bar.

// Fitted like the visualiser fits a diagram
export const FIT_VIEW_OPTIONS = DIAGRAM_FIT_VIEW_OPTIONS;

/** A tool's icon with its key in the corner, as Excalidraw's tools show theirs */
function WithKey({
  shortcut,
  children,
}: {
  shortcut: string;
  children: ReactNode;
}) {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center">
      <span className="-translate-x-[3px] -translate-y-[2px]">{children}</span>
      <span
        aria-hidden
        className="absolute bottom-[2px] right-[4px] text-[9px] font-medium leading-none text-[rgb(var(--ec-page-text-muted))] opacity-60"
      >
        {shortcut}
      </span>
    </span>
  );
}

/** What to do with the tool picked, under the bar (as Excalidraw says) */
const TOOL_HINTS = {
  note: "Click anywhere to put a sticky note there",
  text: "Click anywhere to start typing",
  comment: "Click anywhere, or on a node, to comment there",
  hotspot: "Click a node, or anywhere, to flag a hotspot there",
};

/** The levels of detail: each can always be gone to (one with nothing on it yet is where those things are added) */
function LevelSwitch({
  level,
  onChange,
  unavailable,
}: {
  level: Level;
  onChange: (level: Level) => void;
  /** Levels this canvas can't show, and why (EventCatalog's Studio: as its diagrams do) */
  unavailable?: Partial<Record<Level, string | undefined>>;
}) {
  return (
    <div
      role="group"
      aria-label="Level of detail"
      className="flex items-center gap-0.5"
    >
      {LEVELS.map(({ level: value, description }) => (
        <ToolbarButton
          key={value}
          label={`Level ${value}: ${description} (${value})`}
          hint={unavailable?.[value]}
          active={value === level}
          disabled={!!unavailable?.[value]}
          onClick={() => onChange(value)}
        >
          <WithKey shortcut={String(value)}>
            <span className="text-xs font-semibold">L{value}</span>
          </WithKey>
        </ToolbarButton>
      ))}
    </div>
  );
}

export default memo(function CanvasControls({
  level,
  onLevelChange,
  unavailableLevels,
  editable,
  locked,
  onToggleLock,
  lockedBy,
  selectMode,
  onSelectMode,
  handMode,
  onHandMode,
  noteMode,
  onToggleNoteMode,
  textMode,
  onToggleTextMode,
  commentMode,
  onToggleCommentMode,
  hotspotMode,
  onToggleHotspotMode,
  extras,
}: {
  level: Level;
  onLevelChange: (level: Level) => void;
  /** Levels this canvas can't show, and why (greyed out, with the reason) */
  unavailableLevels?: Partial<Record<Level, string | undefined>>;
  /** L3, the canvas itself (comments are there; L1 and L2 are arranged on their own) */
  editable: boolean;
  /** Nothing on the canvas can be changed (until it's unlocked) */
  locked: boolean;
  onToggleLock: () => void;
  /** Who locked it (it's locked for everyone on it) */
  lockedBy?: string | null;
  /** Selecting and moving what's on the canvas (no tool picked) */
  selectMode: boolean;
  onSelectMode: () => void;
  /** The hand: dragging moves around the canvas (nothing on it is picked up) */
  handMode: boolean;
  onHandMode: () => void;
  /** The sticky note tool, on: a click on the canvas puts a note there */
  noteMode: boolean;
  onToggleNoteMode: () => void;
  /** The comment tool, on: a click on the canvas (or a node) pins a comment there */
  commentMode: boolean;
  onToggleCommentMode: () => void;
  /** The hotspot tool, on: a click on a node (or the canvas) flags a hotspot there */
  hotspotMode: boolean;
  onToggleHotspotMode: () => void;
  /** The text tool, on: a click on the canvas writes there */
  textMode: boolean;
  onToggleTextMode: () => void;
  /** More buttons at the end of the bar (e.g. replaying the agent's walkthrough) */
  extras?: ReactNode;
}) {
  return (
    // At the top, as drawing tools have their tools
    <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
      <Toolbar>
        {/* First, as on Excalidraw: locking it, then selecting and moving around */}
        <ToolbarButton
          label={
            locked
              ? `Locked${lockedBy ? ` by ${lockedBy}` : ""}: unlock it to change it (for everyone on it)`
              : "Lock the canvas (it can be looked at, not changed, by everyone on it)"
          }
          active={locked}
          onClick={onToggleLock}
        >
          {locked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <LockOpen className="h-4 w-4" />
          )}
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label="Select (V)"
          active={selectMode}
          onClick={onSelectMode}
        >
          <WithKey shortcut="V">
            <MousePointer2 className="h-4 w-4" />
          </WithKey>
        </ToolbarButton>
        <ToolbarButton
          label="Hand (H): drag to move around"
          active={handMode}
          onClick={onHandMode}
        >
          <WithKey shortcut="H">
            <Hand className="h-4 w-4" />
          </WithKey>
        </ToolbarButton>
        <ToolbarDivider />
        <LevelSwitch
          level={level}
          onChange={onLevelChange}
          unavailable={unavailableLevels}
        />
        <ToolbarDivider />
        {/* Notes can be added on every level, and are shown on the level they're added on */}
        <ToolbarButton
          label={
            editable
              ? "Sticky note (N): click where it goes"
              : `Sticky note (N): on L${level}, where it's clicked`
          }
          active={noteMode}
          disabled={locked}
          hint={locked ? "The canvas is locked" : undefined}
          onClick={onToggleNoteMode}
        >
          <WithKey shortcut="N">
            <StickyNote className="h-4 w-4 text-yellow-500" />
          </WithKey>
        </ToolbarButton>
        {/* Excalidraw's text tool: click anywhere and type */}
        <ToolbarButton
          label={
            editable
              ? "Text (T): click anywhere and type"
              : `Text (T): on L${level}, where it's clicked`
          }
          active={textMode}
          disabled={locked}
          hint={locked ? "The canvas is locked" : undefined}
          onClick={onToggleTextMode}
        >
          <WithKey shortcut="T">
            <Type className="h-4 w-4" />
          </WithKey>
        </ToolbarButton>
        {/* Studio's comments: pinned to the canvas or a node, replied to and resolved */}
        <ToolbarButton
          label="Comment (C): click where it goes, or on a node"
          active={commentMode}
          onClick={onToggleCommentMode}
        >
          <WithKey shortcut="C">
            <MessageCircle className="h-4 w-4" />
          </WithKey>
        </ToolbarButton>
        {/* Hotspots: what people should know about (risks, problems, the key parts), hard to miss */}
        <ToolbarButton
          label="Hotspot (A): click a node, or anywhere, to flag it"
          active={hotspotMode}
          disabled={locked}
          hint={locked ? "The canvas is locked" : undefined}
          onClick={onToggleHotspotMode}
        >
          <WithKey shortcut="A">
            <TriangleAlert className="h-4 w-4 text-amber-600" />
          </WithKey>
        </ToolbarButton>
        {extras}
      </Toolbar>
      {(noteMode || textMode || commentMode || hotspotMode) && (
        <p className="pointer-events-none mt-2 text-center text-xs text-[rgb(var(--ec-page-text-muted))]">
          {
            TOOL_HINTS[
              noteMode
                ? "note"
                : commentMode
                  ? "comment"
                  : hotspotMode
                    ? "hotspot"
                    : "text"
            ]
          }{" "}
          ·{" "}
          <kbd className="rounded border border-[rgb(var(--ec-page-border))] px-1 font-sans text-[11px]">
            Esc
          </kbd>{" "}
          to cancel
        </p>
      )}
    </div>
  );
});

/** The bottom-left controls, as Excalidraw's: zooming, undo and redo, then fitting it to the view and laying it out again */
export const ViewControls = memo(function ViewControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReorder,
  reorderLabel,
  locked,
  fitOptions = FIT_VIEW_OPTIONS,
  comments,
  hotspots,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Lays it out again with the visualiser's layout */
  onReorder: () => void;
  reorderLabel: string;
  locked: boolean;
  /** How the canvas is fitted to the view (clear of what's over it, e.g. the palette) */
  fitOptions?: FitViewOptions;
  /** The comments: how many are open, and showing them all */
  comments?: { open: number; active: boolean; onToggle: () => void };
  /** The hotspots: how many, the most important's severity, and listing them all */
  hotspots?: {
    count: number;
    severity?: HotspotSeverity;
    active: boolean;
    onToggle: () => void;
  };
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <>
      <Toolbar>
        <ToolbarButton
          label="Zoom out"
          onClick={() => void zoomOut({ duration: 200 })}
        >
          <ZoomOut className="h-4 w-4" />
        </ToolbarButton>
        <ZoomLevel />
        <ToolbarButton
          label="Zoom in"
          onClick={() => void zoomIn({ duration: 200 })}
        >
          <ZoomIn className="h-4 w-4" />
        </ToolbarButton>
      </Toolbar>
      <Toolbar>
        <ToolbarButton
          label="Undo (⌘Z)"
          hint={canUndo ? undefined : "Nothing to undo"}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo (⇧⌘Z)"
          hint={canRedo ? undefined : "Nothing to redo"}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </Toolbar>
      <Toolbar>
        <ToolbarButton
          label="Fit view (⇧1)"
          onClick={() => void fitView({ ...fitOptions, duration: 500 })}
        >
          <Maximize className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={reorderLabel}
          hint={locked ? "The canvas is locked" : undefined}
          disabled={locked}
          onClick={onReorder}
        >
          <SendToBack className="h-4 w-4" />
        </ToolbarButton>
      </Toolbar>
      {comments && (
        <Toolbar>
          <ToolbarButton
            label={
              comments.open ? `Comments (${comments.open} open)` : "Comments"
            }
            active={comments.active}
            onClick={comments.onToggle}
          >
            <span className="relative">
              <MessageSquareText className="h-4 w-4" />
              {comments.open > 0 && (
                <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-[rgb(var(--ec-accent))] px-1 text-center text-[9px] font-semibold leading-4 text-white">
                  {comments.open}
                </span>
              )}
            </span>
          </ToolbarButton>
          {hotspots && (
            <ToolbarButton
              label={
                hotspots.count ? `Hotspots (${hotspots.count})` : "Hotspots"
              }
              active={hotspots.active}
              onClick={hotspots.onToggle}
            >
              <span className="relative">
                <TriangleAlert className="h-4 w-4" />
                {hotspots.count > 0 && (
                  <span
                    className="absolute -right-2 -top-2 min-w-4 rounded-full px-1 text-center text-[9px] font-semibold leading-4 text-white"
                    style={{
                      background:
                        SEVERITIES[hotspots.severity ?? "warning"].color,
                    }}
                  >
                    {hotspots.count}
                  </span>
                )}
              </span>
            </ToolbarButton>
          )}
        </Toolbar>
      )}
    </>
  );
});
