import { memo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Maximize, MessageCircle, Redo, SendToBack, StickyNote, Undo, ZoomIn, ZoomOut } from 'lucide-react';
import { DIAGRAM_FIT_VIEW_OPTIONS, Toolbar, ToolbarButton, ToolbarDivider, ZoomLevel } from '@eventcatalog/visualiser';
import { LEVELS, type Level } from '../levels';

// The canvas's bottom bar: layout, view, levels of detail, undo, comments and notes. Built from the visualiser's
// toolbar, so it looks and works like a diagram's bar (in the same places: the view on the left, then the levels).

// Fitted like the visualiser fits a diagram
export const FIT_VIEW_OPTIONS = DIAGRAM_FIT_VIEW_OPTIONS;

// Why comments can't be added on L1 or L2 (they're pinned to the canvas, L3)
const EDIT_IN_L3 = 'Only on L3, where comments are pinned';

function LevelSwitch({
  level,
  onChange,
  unavailable,
}: {
  level: Level;
  onChange: (level: Level) => void;
  unavailable: Partial<Record<Level, string | undefined>>;
}) {
  return (
    <div role="group" aria-label="Level of detail" className="flex items-center gap-0.5">
      {LEVELS.map(({ level: value, description }) => (
        <ToolbarButton
          key={value}
          label={`Level ${value}: ${description}`}
          hint={unavailable[value]}
          active={value === level}
          disabled={!!unavailable[value]}
          onClick={() => onChange(value)}
        >
          <span className="text-xs font-semibold">L{value}</span>
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
  onReorder,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  commentMode,
  onToggleCommentMode,
  onAddNote,
}: {
  level: Level;
  onLevelChange: (level: Level) => void;
  unavailableLevels: Partial<Record<Level, string | undefined>>;
  /** L3, the canvas itself (comments are there; L1 and L2 are arranged on their own) */
  editable: boolean;
  onReorder: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  commentMode: boolean;
  onToggleCommentMode: () => void;
  onAddNote: () => void;
}) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  return (
    // Where the visualiser's bar is (React Flow's bottom-center panel)
    <div className="absolute bottom-[15px] left-1/2 z-10 -translate-x-1/2">
      <Toolbar>
        <ToolbarButton
          label={editable ? "Reorder diagram (the visualiser's layout)" : `Reorder L${level} (the visualiser's layout)`}
          onClick={onReorder}
        >
          <SendToBack className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Fit view" onClick={() => void fitView({ ...FIT_VIEW_OPTIONS, duration: 500 })}>
          <Maximize className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Zoom out" onClick={() => void zoomOut({ duration: 200 })}>
          <ZoomOut className="h-4 w-4" />
        </ToolbarButton>
        <ZoomLevel />
        <ToolbarButton label="Zoom in" onClick={() => void zoomIn({ duration: 200 })}>
          <ZoomIn className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <LevelSwitch level={level} onChange={onLevelChange} unavailable={unavailableLevels} />
        <ToolbarDivider />
        <ToolbarButton label="Undo (⌘Z)" hint={canUndo ? undefined : 'Nothing to undo'} disabled={!canUndo} onClick={onUndo}>
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Redo (⇧⌘Z)" hint={canRedo ? undefined : 'Nothing to redo'} disabled={!canRedo} onClick={onRedo}>
          <Redo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label="Comment (C)"
          hint={editable ? undefined : EDIT_IN_L3}
          active={commentMode}
          disabled={!editable}
          onClick={onToggleCommentMode}
        >
          <MessageCircle className="h-4 w-4" />
        </ToolbarButton>
        {/* Notes can be added on every level, and are shown on the level they're added on */}
        <ToolbarButton label={editable ? 'Add sticky note' : `Add sticky note to L${level}`} onClick={onAddNote}>
          <StickyNote className="h-4 w-4 text-yellow-500" />
        </ToolbarButton>
      </Toolbar>
    </div>
  );
});
