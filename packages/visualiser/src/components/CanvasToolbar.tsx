import { Fragment, memo, type ReactNode } from "react";
import { Panel, useReactFlow, useStore } from "@xyflow/react";
import { Map, Maximize, Zap, ZoomIn, ZoomOut } from "lucide-react";
import { Tip, TipProvider } from "./Tip";

export type CanvasLevel = {
  description: string;
  active: boolean;
  /** Why the level is greyed out (e.g. the diagram doesn't have it), shown on hover */
  disabledReason?: string;
  onSelect: () => void;
};

/** A tool for the kind of resource shown (e.g. a domain's) */
export type CanvasTool = {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
};

interface CanvasToolbarProps {
  /** Levels of detail, shown as L1, L2, ... */
  levels: CanvasLevel[];
  /** Tools for the resource shown, between the levels and the canvas tools */
  tools?: CanvasTool[];
  animateMessages: boolean;
  toggleAnimateMessages: () => void;
  /** Hide the "Simulate messages" action (e.g. on the Context Diagram). */
  hideAnimateMessages?: boolean;
  showMinimap: boolean;
  setShowMinimap: (value: boolean) => void;
  handleFitView: () => void;
}

// A toolbar button's colours: muted, highlighted with the catalog's accent when selected, greyed out when it can't
// be used
const toolbarButtonColors = ({
  active = false,
  disabled = false,
}: {
  active?: boolean;
  disabled?: boolean;
}) =>
  disabled
    ? "opacity-40 cursor-not-allowed text-[rgb(var(--ec-page-text-muted))]"
    : active
      ? "bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.15)] text-[rgb(var(--ec-catalog-accent,79_70_229))] hover:bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.22)]"
      : "text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.08)] hover:text-[rgb(var(--ec-page-text))]";

/** A button in a toolbar, with its tooltip (what it does, and why it can't be used when it can't) */
export const ToolbarButton = ({
  label,
  hint,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  /** Shown under the label on hover */
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => {
  return (
    <Tip label={label} hint={hint}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        // Not `disabled`, which would stop the tooltip explaining why showing
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${toolbarButtonColors(
          { active, disabled },
        )}`}
      >
        {children}
      </button>
    </Tip>
  );
};

/**
 * How far the canvas is zoomed in, as a percentage. Isolated, so what it's in only re-renders when the zoom changes
 * (not on every pan). Studio's bar shows it too.
 */
export const ZoomLevel = memo(function ZoomLevel({
  className = "",
}: {
  className?: string;
}) {
  const zoom = useStore((state) => Math.round(state.transform[2] * 100));
  return (
    <div
      className={`w-12 text-center text-xs font-medium tabular-nums text-[rgb(var(--ec-page-text-muted))] ${className}`}
    >
      {zoom}%
    </div>
  );
});

export const ToolbarDivider = () => (
  <div className="w-px h-5 mx-1 bg-[rgb(var(--ec-page-border))]" />
);

/** The frame of a toolbar (e.g. the bar at the bottom of a diagram, or of a Studio canvas), with tooltips */
export const Toolbar = ({ children }: { children: ReactNode }) => (
  <TipProvider>
    <div className="flex items-center gap-0.5 p-1 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-md">
      {children}
    </div>
  </TipProvider>
);

/**
 * Floating action bar at the bottom of the canvas for quick view actions.
 */
const CanvasToolbar = memo(function CanvasToolbar({
  levels,
  tools = [],
  animateMessages,
  toggleAnimateMessages,
  hideAnimateMessages = false,
  showMinimap,
  setShowMinimap,
  handleFitView,
}: CanvasToolbarProps) {
  const { zoomIn, zoomOut } = useReactFlow();
  // In the same places as Studio's bar: the view on the left, then the levels, then the rest
  const groups = [
    <>
      <ToolbarButton label="Fit view" onClick={handleFitView}>
        <Maximize className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Zoom out"
        onClick={() => void zoomOut({ duration: 200 })}
      >
        <ZoomOut className="w-4 h-4" />
      </ToolbarButton>
      <ZoomLevel />
      <ToolbarButton
        label="Zoom in"
        onClick={() => void zoomIn({ duration: 200 })}
      >
        <ZoomIn className="w-4 h-4" />
      </ToolbarButton>
    </>,
    levels.length > 0 && (
      <div
        role="group"
        aria-label="Level of detail"
        className="flex items-center gap-0.5"
      >
        {levels.map((level, index) => (
          <ToolbarButton
            key={level.description}
            label={`Level ${index + 1}: ${level.description}`}
            hint={level.disabledReason}
            active={level.active}
            disabled={!!level.disabledReason}
            onClick={level.onSelect}
          >
            <span className="text-xs font-semibold">L{index + 1}</span>
          </ToolbarButton>
        ))}
      </div>
    ),
    tools.length > 0 &&
      tools.map((tool) => (
        <ToolbarButton
          key={tool.label}
          label={tool.label}
          active={tool.active}
          onClick={tool.onClick}
        >
          {tool.icon}
        </ToolbarButton>
      )),
    <>
      {!hideAnimateMessages && (
        <ToolbarButton
          label="Simulate messages"
          active={animateMessages}
          onClick={toggleAnimateMessages}
        >
          <Zap className="w-4 h-4" />
        </ToolbarButton>
      )}
      <ToolbarButton
        label={showMinimap ? "Hide minimap" : "Show minimap"}
        active={showMinimap}
        onClick={() => setShowMinimap(!showMinimap)}
      >
        <Map className="w-4 h-4" />
      </ToolbarButton>
    </>,
  ].filter(Boolean);
  return (
    <Panel position="bottom-center">
      <Toolbar>
        {groups.map((group, index) => (
          <Fragment key={index}>
            {index > 0 && <ToolbarDivider />}
            {group}
          </Fragment>
        ))}
      </Toolbar>
    </Panel>
  );
});

export default CanvasToolbar;
