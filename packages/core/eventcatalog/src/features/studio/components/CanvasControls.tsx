import { memo, type ReactNode } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Maximize, MessageCircle, Redo, SendToBack, StickyNote, Undo, ZoomIn, ZoomOut } from 'lucide-react';
import { LEVELS, type Level } from '../levels';

// The canvas's bottom bar: layout, view, levels of detail, undo, comments and notes

export const FIT_VIEW_OPTIONS = { padding: { top: '80px', right: '60px', bottom: '100px', left: '60px' } } as const;

function ControlButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full p-2 transition-colors ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : active
            ? 'bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]'
            : 'text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)] hover:text-[rgb(var(--ec-icon-hover))]'
      }`}
    >
      {children}
    </button>
  );
}

/** Isolated, so the bar only re-renders when the zoom changes (not on every pan) */
function ZoomLevel() {
  const zoom = useStore((state) => Math.round(state.transform[2] * 100));
  return <div className="w-12 text-center text-xs font-medium tabular-nums text-[rgb(var(--ec-page-text-muted))]">{zoom}%</div>;
}

const Divider = () => <div className="mx-1 h-6 w-px bg-[rgb(var(--ec-page-border))]" />;

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
      {LEVELS.map(({ level: value, description }) => {
        const reason = unavailable[value];
        const active = value === level;
        return (
          <button
            key={value}
            title={`Level ${value}: ${description}${reason ? `. ${reason}` : ''}`}
            // Stays focusable when unavailable, so its title can say why
            aria-disabled={!!reason}
            aria-pressed={active}
            onClick={() => !reason && onChange(value)}
            className={`h-8 min-w-8 rounded-full px-2 text-xs font-semibold tabular-nums transition-colors ${
              reason
                ? 'cursor-not-allowed opacity-40'
                : active
                  ? 'bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]'
                  : 'text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-border)/0.5)]'
            }`}
          >
            L{value}
          </button>
        );
      })}
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
  /** L1 and L2 are read only views of the canvas */
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
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border px-2 py-1 shadow-lg bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))]">
        <ControlButton label="Reorder diagram (the visualiser's layout)" onClick={onReorder} disabled={!editable}>
          <SendToBack className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Fit view" onClick={() => void fitView({ ...FIT_VIEW_OPTIONS, duration: 500 })}>
          <Maximize className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Zoom out" onClick={() => void zoomOut({ duration: 200 })}>
          <ZoomOut className="h-4 w-4" />
        </ControlButton>
        <ZoomLevel />
        <ControlButton label="Zoom in" onClick={() => void zoomIn({ duration: 200 })}>
          <ZoomIn className="h-4 w-4" />
        </ControlButton>
        <Divider />
        <LevelSwitch level={level} onChange={onLevelChange} unavailable={unavailableLevels} />
        <Divider />
        <ControlButton label="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Redo (⇧⌘Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo className="h-4 w-4" />
        </ControlButton>
        <Divider />
        <ControlButton label="Comment (C)" onClick={onToggleCommentMode} active={commentMode} disabled={!editable}>
          <MessageCircle className="h-4 w-4" />
        </ControlButton>
        {/* Notes can be added on every level, and are shown on the level they're added on */}
        <ControlButton label={editable ? 'Add sticky note' : `Add sticky note to L${level}`} onClick={onAddNote}>
          <StickyNote className="h-4 w-4 text-yellow-500" />
        </ControlButton>
      </div>
    </div>
  );
});
