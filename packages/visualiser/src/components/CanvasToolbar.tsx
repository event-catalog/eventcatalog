import { memo, type ReactNode } from "react";
import { Panel } from "@xyflow/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Map, Maximize2, Zap } from "lucide-react";
import { usePortalContainer } from "../context/PortalContainerContext";

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

const ToolbarButton = ({
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
  const portalContainer = usePortalContainer();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          // Not `disabled`, which would stop the tooltip explaining why showing
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : onClick}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
            disabled
              ? "opacity-40 cursor-not-allowed text-[rgb(var(--ec-page-text-muted))]"
              : active
                ? "bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.15)] text-[rgb(var(--ec-catalog-accent,79_70_229))] hover:bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.22)]"
                : "text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.08)] hover:text-[rgb(var(--ec-page-text))]"
          }`}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal container={portalContainer}>
        <Tooltip.Content
          side="top"
          sideOffset={8}
          className="z-50 max-w-[240px] rounded-md bg-[rgb(var(--ec-page-text))] px-2 py-1 text-xs text-[rgb(var(--ec-page-bg))] shadow-md"
        >
          {label}
          {hint && <div className="mt-0.5 opacity-70">{hint}</div>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

const Divider = () => (
  <div className="w-px h-5 mx-1 bg-[rgb(var(--ec-page-border))]" />
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
  return (
    <Panel position="bottom-center">
      <Tooltip.Provider delayDuration={300}>
        <div className="flex items-center gap-0.5 p-1 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-md">
          {levels.length > 0 && (
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
          )}
          {tools.length > 0 && (
            <>
              {levels.length > 0 && <Divider />}
              {tools.map((tool) => (
                <ToolbarButton
                  key={tool.label}
                  label={tool.label}
                  active={tool.active}
                  onClick={tool.onClick}
                >
                  {tool.icon}
                </ToolbarButton>
              ))}
            </>
          )}
          {(levels.length > 0 || tools.length > 0) && !hideAnimateMessages && (
            <Divider />
          )}
          {!hideAnimateMessages && (
            <ToolbarButton
              label="Simulate messages"
              active={animateMessages}
              onClick={toggleAnimateMessages}
            >
              <Zap className="w-4 h-4" />
            </ToolbarButton>
          )}
          {(levels.length > 0 || tools.length > 0 || !hideAnimateMessages) && (
            <Divider />
          )}
          <ToolbarButton
            label={showMinimap ? "Hide minimap" : "Show minimap"}
            active={showMinimap}
            onClick={() => setShowMinimap(!showMinimap)}
          >
            <Map className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Fit to view" onClick={handleFitView}>
            <Maximize2 className="w-4 h-4" />
          </ToolbarButton>
        </div>
      </Tooltip.Provider>
    </Panel>
  );
});

export default CanvasToolbar;
