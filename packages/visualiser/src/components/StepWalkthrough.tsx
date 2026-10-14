import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import type { Edge } from "@xyflow/react";
import { buildUrl } from "../utils/url-builder";
import { isTyping } from "../utils/keyboard";
import {
  getNodeDocUrl,
  NODE_COLOR_CLASSES,
  NODE_TYPE_LABELS,
} from "./FocusMode/utils";

type Resource = {
  summary?: string;
  data?: { summary?: string };
};

// A type (not an interface) so it's a record of node data, as React Flow's are
type NodeData = {
  summary?: string;
  step?: {
    title?: string;
    summary?: string;
  };
  service?: Resource;
  message?: Resource;
  agent?: Resource;
  flow?: Resource;
  container?: Resource;
  dataProduct?: Resource;
  custom?: {
    type?: string;
    summary?: string;
    url?: string;
  };
  externalSystem?: {
    url?: string;
  };
};

interface CustomNode {
  id: string;
  type?: string;
  data: NodeData;
}

interface StepWalkthroughProps {
  nodes: CustomNode[];
  edges: Edge[];
  isFlowVisualization: boolean;
  /**
   * Called when the step changes: the step (null when the walkthrough ends),
   * whether to zoom out to the whole flow, and the steps walked so far, in
   * order (ending with this one)
   */
  onStepChange: (
    nodeId: string | null,
    shouldZoomOut?: boolean,
    trail?: string[],
  ) => void;
  mode?: "full" | "simple";
}

interface PathOption {
  targetId: string;
  label?: string;
  targetNode: CustomNode;
}

/** What the walkthrough shows for a step */
const getStepInfo = (node: CustomNode) => {
  const { data } = node;
  const type = node.type ?? "step";
  // What the step points at (its service, message...), for its summary
  const resource =
    data.service ??
    data.message ??
    data.agent ??
    data.flow ??
    data.container ??
    data.dataProduct;
  // The flow's own words for the step first, then what the resource is
  const stepSummary = data.step?.summary;
  const resourceSummary =
    resource?.summary ||
    resource?.data?.summary ||
    data.custom?.summary ||
    data.summary;
  const docsPath = getNodeDocUrl(node);
  return {
    // The catalog names every step (after what it points at, if untitled)
    title: data.step?.title || node.id,
    typeLabel: data.custom?.type || NODE_TYPE_LABELS[type] || "Step",
    colorClass: NODE_COLOR_CLASSES[type] ?? NODE_COLOR_CLASSES.step,
    summary: stepSummary || resourceSummary,
    detail:
      stepSummary && resourceSummary && resourceSummary !== stepSummary
        ? resourceSummary
        : undefined,
    docsUrl: docsPath
      ? buildUrl(docsPath)
      : data.custom?.url || data.externalSystem?.url,
  };
};

// Small, as the walkthrough sits over the flow
const BUTTON =
  "flex items-center justify-center gap-1 h-7 text-xs rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ec-accent))] transition-colors";
const PRIMARY_BUTTON = `${BUTTON} px-2.5 font-semibold text-white bg-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-hover))]`;
const QUIET_BUTTON = `${BUTTON} px-2 font-medium text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-page-border)/0.4)]`;
const ICON_BUTTON =
  "flex items-center justify-center w-6 h-6 rounded text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-page-border)/0.4)]";

export default memo(function StepWalkthrough({
  nodes,
  edges,
  isFlowVisualization,
  onStepChange,
}: StepWalkthroughProps) {
  // The steps walked so far, in order (empty before the walkthrough starts)
  const [trail, setTrail] = useState<string[]>([]);
  const currentNodeId = trail[trail.length - 1] ?? null;
  const [startNodeId, setStartNodeId] = useState<string | null>(null);

  // Stable structural keys — only change when nodes/edges are added/removed,
  // not when positions change during drag.
  const nodeIdsKeyRef = useRef("");
  const computedNodeIdsKey = nodes.map((n) => n.id).join(",");
  if (computedNodeIdsKey !== nodeIdsKeyRef.current) {
    nodeIdsKeyRef.current = computedNodeIdsKey;
  }
  const nodeIdsKey = nodeIdsKeyRef.current;

  const edgeKeyRef = useRef("");
  const computedEdgeKey = edges.map((e) => `${e.source}-${e.target}`).join(",");
  if (computedEdgeKey !== edgeKeyRef.current) {
    edgeKeyRef.current = computedEdgeKey;
  }
  const edgeKey = edgeKeyRef.current;

  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodeIdsKey],
  );

  useEffect(() => {
    if (!isFlowVisualization || nodes.length === 0) return;
    // The flow starts at the first step with no edges into it. Worked out
    // again when the cached one no longer exists (e.g. a sub-flow expanded)
    const targets = new Set(edges.map((edge) => edge.target));
    const start = nodes.find((node) => !targets.has(node.id));
    if (start && !(startNodeId && nodesById.has(startNodeId))) {
      setStartNodeId(start.id);
    }
  }, [nodeIdsKey, edgeKey, isFlowVisualization, startNodeId]);

  // The current step no longer exists (e.g. the sub-flow it was in was
  // collapsed): start again
  useEffect(() => {
    if (currentNodeId && !nodesById.has(currentNodeId)) setTrail([]);
  }, [currentNodeId, nodesById]);

  const pathsFrom = useCallback(
    (nodeId: string | null): PathOption[] =>
      nodeId
        ? edges
            .filter((edge) => edge.source === nodeId)
            .map((edge) => ({
              targetId: edge.target,
              label: edge.label as string | undefined,
              targetNode: nodesById.get(edge.target)!,
            }))
            .filter((path) => !!path.targetNode)
        : [],
    [edgeKey, nodesById],
  );
  const availablePaths = useMemo(
    () => pathsFrom(currentNodeId),
    [pathsFrom, currentNodeId],
  );

  // How many steps the flow has on the way it's being walked: those walked,
  // then the first way on from each step until it ends (or loops)
  const stepsAfter = useCallback(
    (nodeId: string, walked: string[]) => {
      const seen = new Set(walked);
      let steps = 0;
      let next = pathsFrom(nodeId)[0]?.targetId;
      while (next && !seen.has(next)) {
        seen.add(next);
        steps++;
        next = pathsFrom(next)[0]?.targetId;
      }
      return steps;
    },
    [pathsFrom],
  );
  const totalSteps = useMemo(
    () => (currentNodeId ? trail.length + stepsAfter(currentNodeId, trail) : 0),
    [trail, currentNodeId, stepsAfter],
  );
  // The same, before starting
  const startSteps = useMemo(
    () => (startNodeId ? 1 + stepsAfter(startNodeId, [startNodeId]) : 0),
    [startNodeId, stepsAfter],
  );

  const goTo = useCallback(
    (nextTrail: string[]) => {
      setTrail(nextTrail);
      const nodeId = nextTrail[nextTrail.length - 1];
      if (!nodeId) {
        onStepChange(null);
        return;
      }
      onStepChange(nodeId, false, nextTrail);
    },
    [onStepChange],
  );

  const start = useCallback(() => {
    if (startNodeId) goTo([startNodeId]);
  }, [startNodeId, goTo]);
  // At a branch, the way on picked in the dropdown (the first to start with)
  const [selectedPath, setSelectedPath] = useState(0);
  useEffect(() => setSelectedPath(0), [currentNodeId]);
  const next = useCallback(
    (index = selectedPath) => {
      const path = availablePaths[index];
      if (path) goTo([...trail, path.targetId]);
    },
    [availablePaths, selectedPath, trail, goTo],
  );
  const previous = useCallback(() => goTo(trail.slice(0, -1)), [trail, goTo]);
  const finish = useCallback(() => {
    setTrail([]);
    onStepChange(null, true); // Zoom out to the whole flow again
  }, [onStepChange]);

  // ←/→ to step through, 1–9 to pick a way on, Esc to stop
  const isWalking = trail.length > 0;
  useEffect(() => {
    if (!isWalking) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") previous();
      else if (event.key === "Escape") finish();
      else if (/^[1-9]$/.test(event.key) && availablePaths.length > 1)
        next(Number(event.key) - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isWalking, availablePaths, next, previous, finish]);

  const currentNode = currentNodeId ? nodesById.get(currentNodeId) : undefined;
  const info = useMemo(
    () => (currentNode ? getStepInfo(currentNode) : undefined),
    [currentNode],
  );

  // Long text is cut short (the title to a line, the summary to two), and
  // can be expanded to read in full. Collapsed again on each step.
  const [expanded, setExpanded] = useState(false);
  const [isCut, setIsCut] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => setExpanded(false), [currentNodeId]);
  useLayoutEffect(() => {
    if (expanded) return;
    const title = titleRef.current;
    const summary = summaryRef.current;
    setIsCut(
      !!info?.detail ||
        (!!title && title.scrollWidth > title.clientWidth) ||
        (!!summary && summary.scrollHeight > summary.clientHeight + 1),
    );
  }, [info, expanded]);

  const startInfo = useMemo(() => {
    const startNode = startNodeId ? nodesById.get(startNodeId) : undefined;
    return startNode ? getStepInfo(startNode) : undefined;
  }, [startNodeId, nodesById]);

  if (!isFlowVisualization || nodes.length === 0) {
    return null;
  }

  // Before starting: the same card as while walking (so starting doesn't
  // change its size), naming the step the flow starts with
  if (!isWalking || !info) {
    return (
      <div className="ml-12 w-[360px] rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-lg overflow-hidden">
        <div className="h-0.5 bg-[rgb(var(--ec-page-border)/0.5)]" />
        <div className="px-3 pt-2 pb-2">
          {/* As tall as the step's title row (its icon buttons) */}
          <div className="flex items-center gap-2 min-w-0 h-6">
            <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-[rgb(var(--ec-accent))] text-white">
              <Play className="w-2.5 h-2.5 fill-current" />
            </span>
            <h3 className="flex-1 min-w-0 truncate text-sm font-semibold text-[rgb(var(--ec-page-text))]">
              Walk through this flow
            </h3>
          </div>
          <p className="mt-1 text-xs leading-snug text-[rgb(var(--ec-page-text-muted))] line-clamp-2">
            Step through it one hop at a time
            {startInfo ? `, starting at ${startInfo.title}.` : "."}
          </p>
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="px-2 text-xs text-[rgb(var(--ec-page-text-muted))]">
              {startSteps > 0 && `${startSteps} steps`}
            </span>
            <button
              type="button"
              onClick={start}
              title="Start walking through the flow"
              className={PRIMARY_BUTTON}
            >
              Start
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepNumber = trail.length;
  const atEnd = availablePaths.length === 0;
  const isBranch = availablePaths.length > 1;

  return (
    <div className="ml-12 w-[360px] rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-lg overflow-hidden">
      {/* Progress through the flow, on the way it's being walked */}
      <div className="h-0.5 bg-[rgb(var(--ec-page-border)/0.5)]">
        <div
          className="h-full bg-[rgb(var(--ec-accent))] transition-[width] duration-300"
          style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
        />
      </div>

      <div className="px-3 pt-2 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[rgb(var(--ec-page-text-muted))]">
            {stepNumber}/{totalSteps}
          </span>
          <span
            className={`shrink-0 px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wide text-white ${info.colorClass}`}
          >
            {info.typeLabel}
          </span>
          <h3
            ref={titleRef}
            className={`flex-1 min-w-0 text-sm font-semibold text-[rgb(var(--ec-page-text))] ${
              expanded ? "break-words" : "truncate"
            }`}
            title={expanded ? undefined : info.title}
          >
            {info.title}
          </h3>
          {info.docsUrl && (
            <a
              href={info.docsUrl}
              aria-label={`Open the docs for ${info.title}`}
              title="Open docs"
              className={ICON_BUTTON}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={finish}
            aria-label="Stop walking through the flow"
            title="Stop (Esc)"
            className={`${ICON_BUTTON} -mr-1`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {info.summary && (
          <p
            ref={summaryRef}
            onClick={isCut ? () => setExpanded(!expanded) : undefined}
            className={`mt-1 text-xs leading-snug text-[rgb(var(--ec-page-text-muted))] ${
              expanded ? "max-h-40 overflow-y-auto" : "line-clamp-2"
            } ${isCut ? "cursor-pointer" : ""}`}
          >
            {info.summary}
          </p>
        )}
        {expanded && info.detail && (
          <p className="mt-1.5 pt-1.5 border-t border-[rgb(var(--ec-page-border)/0.6)] text-xs leading-snug text-[rgb(var(--ec-page-text-muted))] max-h-32 overflow-y-auto">
            {info.detail}
          </p>
        )}
        {isCut && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="mt-0.5 text-[11px] font-medium text-[rgb(var(--ec-accent))] hover:underline"
          >
            {expanded ? "Less" : "More"}
          </button>
        )}

        <div className="flex items-center justify-between gap-2 mt-2">
          <button
            type="button"
            onClick={previous}
            title="Back (←)"
            className={QUIET_BUTTON}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
          {atEnd ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={start}
                title="Walk through again"
                className={QUIET_BUTTON}
              >
                <RotateCcw className="w-3 h-3" />
                Restart
              </button>
              <button type="button" onClick={finish} className={PRIMARY_BUTTON}>
                Finish
              </button>
            </div>
          ) : isBranch ? (
            // A branch: pick the way on (or press its number), then Next
            <div className="flex items-center justify-end gap-1 flex-1 min-w-0">
              <select
                value={selectedPath}
                onChange={(event) =>
                  setSelectedPath(Number(event.target.value))
                }
                aria-label="Which way the flow goes next"
                title="Which way next (or press its number)"
                className="min-w-0 flex-1 max-w-[210px] h-7 pl-2 pr-6 text-xs truncate rounded-md border border-[rgb(var(--ec-input-border))] bg-[rgb(var(--ec-input-bg))] text-[rgb(var(--ec-input-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ec-accent))]"
              >
                {availablePaths.map((path, index) => {
                  const target = getStepInfo(path.targetNode).title;
                  return (
                    <option key={path.targetId} value={index}>
                      {index + 1}.{" "}
                      {path.label ? `${path.label} → ${target}` : target}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={() => next()}
                title="Next (→)"
                className={PRIMARY_BUTTON}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => next()}
              title="Next (→)"
              className={PRIMARY_BUTTON}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
