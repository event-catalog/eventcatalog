/**
 * Where the agent builds the diagram in front of the user (see choreography.ts): the visualiser's own nodes, with
 * the agent's pointer, what it's doing, its selection and the connection it's dragging. When it's done, the view
 * swaps to the full diagram (levels, search...), laid out the same.
 * Pointer, selection and dragged connection adapted from event-catalog/eventcatalog@v5-beta:
 * packages/core/eventcatalog/src/features/studio/components/Presence.tsx
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow, useStore } from '@xyflow/react';
import { diagramNodeComponents } from '@eventcatalog/visualiser';
import { Bot, FastForward } from 'lucide-react';
import { playDiagram, stageToFlow, type AgentPresence, type StageState } from './choreography';
import { CanvasPortal, TeamNode } from '@eventcatalog/visualiser/studio';

// The visualiser's nodes, and teams (drawn as the canvas draws them)
const NODE_TYPES = { ...diagramNodeComponents, team: TeamNode };

const AGENT_COLOR = 'rgb(var(--ec-accent))';
const NODE_ORIGIN: [number, number] = [0, 0];

type BuildStageProps = {
  from?: StageState;
  to: StageState;
  agentName: string;
  onDone: () => void;
};

export function BuildStage(props: BuildStageProps) {
  return (
    <ReactFlowProvider>
      <Stage {...props} />
    </ReactFlowProvider>
  );
}

function Stage({ from, to, agentName, onDone }: BuildStageProps) {
  const [state, setState] = useState<StageState>(() => from ?? { nodes: new Map(), edges: new Map() });
  const [presence, setPresence] = useState<AgentPresence>({ pointer: null, selection: [] });
  const cancelled = useRef(false);
  const { fitBounds } = useReactFlow();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Frame everything that will be on it (and what's there now), so nodes drop into place without the view moving
  useEffect(() => {
    const all = [...to.nodes.values(), ...(from?.nodes.values() ?? [])];
    if (!all.length) return;
    const left = Math.min(...all.map((n) => n.position.x));
    const top = Math.min(...all.map((n) => n.position.y));
    const right = Math.max(...all.map((n) => n.position.x + n.width));
    const bottom = Math.max(...all.map((n) => n.position.y + n.height));
    const frame = requestAnimationFrame(() => fitBounds({ x: left, y: top, width: right - left, height: bottom - top }, { padding: 0.08 }));
    return () => cancelAnimationFrame(frame);
  }, [from, to, fitBounds]);

  useEffect(() => {
    cancelled.current = false;
    playDiagram({ get: () => state, set: setState, present: setPresence, cancelled: () => cancelled.current }, from, to).then(() =>
      onDoneRef.current()
    );
    return () => {
      cancelled.current = true;
    };
    // Played once for each change of diagram
  }, [from, to]);

  const { nodes, edges } = useMemo(() => stageToFlow(state), [state]);

  const skip = () => {
    cancelled.current = true;
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodeOrigin={NODE_ORIGIN}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.05}
        proOptions={{ hideAttribution: true }}
      >
        <AgentPresenceLayer presence={presence} agentName={agentName} stage={state} />
      </ReactFlow>
      <button type="button" className="ec-mcp-button ec-build-skip" onClick={skip}>
        <FastForward aria-hidden />
        Skip
      </button>
    </div>
  );
}

/** The agent's pointer (with what it's doing), its selection and the connection it's dragging, kept the same size on screen */
export function AgentPresenceLayer({ presence, agentName, stage }: { presence: AgentPresence; agentName: string; stage: StageState }) {
  const zoom = useStore((s) => s.transform[2]);
  const scale = 1 / zoom;
  const { pointer, connecting, selection, activity } = presence;
  return (
    <CanvasPortal>
      <div className="pointer-events-none absolute left-0 top-0" style={{ zIndex: 2000 }}>
        {selection.map((id) => {
          const n = stage.nodes.get(id);
          if (!n) return null;
          const gap = 4 * scale;
          return (
            <div
              key={id}
              className="absolute"
              style={{
                left: n.position.x - gap,
                top: n.position.y - gap,
                width: n.width + gap * 2,
                height: n.height + gap * 2,
                border: `${2 * scale}px solid ${AGENT_COLOR}`,
                borderRadius: 8 * scale,
              }}
            />
          );
        })}
        {pointer && connecting && (
          <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
            <line
              x1={connecting.x}
              y1={connecting.y}
              x2={pointer.x}
              y2={pointer.y}
              stroke={AGENT_COLOR}
              strokeWidth={2 * scale}
              strokeDasharray={`${6 * scale} ${4 * scale}`}
            />
            <circle cx={connecting.x} cy={connecting.y} r={4 * scale} fill={AGENT_COLOR} />
          </svg>
        )}
        {pointer && (
          <div
            className="absolute left-0 top-0 ec-agent-pointer"
            style={{ transform: `translate(${pointer.x}px, ${pointer.y}px) scale(${scale})`, transformOrigin: '0 0' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={AGENT_COLOR} stroke="white" strokeWidth="1.5">
              <path d="M4 2l16 9-7 2-3 7z" />
            </svg>
            <span className="ec-agent-label" style={{ backgroundColor: AGENT_COLOR }}>
              <Bot size={12} aria-hidden />
              {agentName}
              {activity && <span className="ec-agent-activity">· {activity}</span>}
            </span>
          </div>
        )}
      </div>
    </CanvasPortal>
  );
}
