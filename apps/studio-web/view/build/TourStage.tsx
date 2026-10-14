/**
 * The agent at the canvas (show_on_diagram): it plays its scenes like someone walking you through a whiteboard. It
 * switches level, zooms into a service or an area, highlights what matters and fades the rest, writes notes next to
 * resources (typed out as it writes them) and pins code, e.g. an event's schema. The user steps through the scenes
 * (or lets them play), and can keep any note.
 * Drawn with the visualiser's nodes, as the build stage is; the pointer is Studio's (see BuildStage).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node } from '@xyflow/react';
import { diagramNodeComponents } from '@eventcatalog/visualiser';
import { Bot, Check, Copy, Pin } from 'lucide-react';
import { Walkthrough } from '../Walkthrough';
import { type Level, type Model, type Note, type Scene } from '@eventcatalog/visualiser/model';
import type { ArchitectureGraph } from '../../src/model/to-graph';
import { candidateNodeIds } from '../focus';
import { AgentPresenceLayer } from './BuildStage';
import { stageToFlow, toStage, type StageNode, type StageState } from './choreography';
import { CanvasPortal, TeamNode } from '@eventcatalog/visualiser/studio';

// The visualiser's nodes, and teams (drawn as the canvas draws them)
const NODE_TYPES = { ...diagramNodeComponents, team: TeamNode };

const NODE_ORIGIN: [number, number] = [0, 0];
const CARD_WIDTH = 300;
const CARD_GAP = 28;
// What isn't highlighted fades back
const FADED = 0.15;

type TourStageProps = {
  graph: ArchitectureGraph;
  model: Model;
  tour: Scene[];
  agentName: string;
  onExit: () => void;
  onKeepNote: (note: Note) => void;
  onScene?: (index: number) => void;
};

export function TourStage(props: TourStageProps) {
  return (
    <ReactFlowProvider>
      <Tour {...props} />
    </ReactFlowProvider>
  );
}

/** How long a scene shows before the next (when playing): time to read what's in it */
const sceneDuration = (scene: Scene) => {
  const words = [scene.caption, ...(scene.notes ?? []).map((n) => n.text)].join(' ').split(/\s+/).length;
  return Math.min(16000, Math.max(3500, 1500 + words * 260 + (scene.code?.length ?? 0) * 4000));
};

function Tour({ graph, model, tour, agentName, onExit, onKeepNote, onScene }: TourStageProps) {
  const stages = useMemo<Record<Level, StageState | undefined>>(
    () => ({ overview: graph.overview && toStage(graph.overview), services: toStage(graph.hiddenMessages), messages: toStage(graph) }),
    [graph]
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const scene = tour[index];

  // Each scene keeps the level the last one chose (or the most detailed)
  const level = useMemo(() => {
    for (let i = index; i >= 0; i--) {
      const chosen = tour[i].level;
      if (chosen && stages[chosen]) return chosen;
    }
    return 'messages' as Level;
  }, [index, tour, stages]);
  const stage = stages[level]!;

  /** The node a resource is drawn as on this level (or what contains it) */
  const nodeFor = useCallback(
    (resourceId: string): StageNode | undefined => {
      for (const id of candidateNodeIds(resourceId, model)) {
        const node = stage.nodes.get(id);
        if (node) return node;
      }
      return undefined;
    },
    [model, stage]
  );

  // Highlighted: what the scene says (or zooms to), and the boxes they're in. Nothing highlighted: nothing fades
  const highlighted = useMemo(() => {
    const ids = scene.highlight ?? scene.focus ?? [];
    const nodes = new Set(ids.map(nodeFor).filter(Boolean).map((n) => n!.node.id));
    for (const id of [...nodes]) {
      for (let n = stage.nodes.get(id); n?.parentId; n = stage.nodes.get(n.parentId)) nodes.add(n.parentId);
    }
    return nodes;
  }, [scene, nodeFor, stage]);

  const { nodes, edges } = useMemo(() => {
    const flow = stageToFlow(stage);
    if (!highlighted.size) return flow;
    const fade = (id: string) => (highlighted.has(id) ? 1 : FADED);
    return {
      nodes: flow.nodes.map((node): Node => ({ ...node, style: { ...node.style, opacity: fade(node.id), transition: 'opacity 400ms' } })),
      edges: flow.edges.map(
        (edge): Edge => ({
          ...edge,
          style: { ...edge.style, opacity: highlighted.has(edge.source) && highlighted.has(edge.target) ? 1 : FADED, transition: 'opacity 400ms' },
        })
      ),
    };
  }, [stage, highlighted]);

  // The scene's notes and code, grouped by the node they're next to
  const cards = useMemo(() => {
    const byNode = new Map<string, { node: StageNode; notes: { text: string; resource: string }[]; code: NonNullable<Scene['code']> }>();
    const at = (resourceId: string) => {
      const node = nodeFor(resourceId);
      if (!node) return undefined;
      const entry = byNode.get(node.node.id) ?? { node, notes: [], code: [] };
      byNode.set(node.node.id, entry);
      return entry;
    };
    (scene.notes ?? []).forEach((note) => at(note.resource)?.notes.push(note));
    (scene.code ?? []).forEach((code) => at(code.resource)?.code.push(code));
    return [...byNode.values()];
  }, [scene, nodeFor]);

  // The camera: the resources zoomed to and the cards next to them, or everything on the first scene
  const { fitBounds } = useReactFlow();
  useEffect(() => {
    const focused = (scene.focus ?? []).map(nodeFor).filter(Boolean) as StageNode[];
    const rects = (focused.length ? focused : index === 0 ? [...stage.nodes.values()] : []).map((n) => ({ ...n.position, width: n.width, height: n.height }));
    if (!rects.length) return;
    for (const card of cards) {
      if (!focused.includes(card.node) && focused.length) continue;
      const height = card.notes.length * 110 + card.code.length * 300;
      rects.push({ x: card.node.position.x + card.node.width + CARD_GAP, y: card.node.position.y, width: CARD_WIDTH, height });
    }
    const left = Math.min(...rects.map((r) => r.x));
    const top = Math.min(...rects.map((r) => r.y));
    const right = Math.max(...rects.map((r) => r.x + r.width));
    const bottom = Math.max(...rects.map((r) => r.y + r.height));
    const frame = requestAnimationFrame(() =>
      fitBounds({ x: left, y: top, width: right - left, height: bottom - top }, { padding: focused.length === 1 ? 0.25 : 0.12, duration: 700 })
    );
    return () => cancelAnimationFrame(frame);
  }, [index, level, scene, cards, nodeFor, stage, fitBounds]);

  // The agent's pointer goes to what it's writing about (or what it's showing)
  const pointerTarget = cards[0]?.node ?? (scene.focus?.[0] ? nodeFor(scene.focus[0]) : undefined);
  const presence = {
    // Just under the node, so its label doesn't cover the notes and code beside it
    pointer: pointerTarget ? { x: pointerTarget.position.x + 24, y: pointerTarget.position.y + pointerTarget.height + 10 } : null,
    selection: [],
    activity: scene.code?.length ? 'Showing the code' : scene.notes?.length ? 'Writing a note' : scene.caption ? 'Explaining' : undefined,
  };

  // Playing: on to the next scene once there's been time to read this one
  useEffect(() => {
    onScene?.(index);
    if (!playing || index >= tour.length - 1) return;
    const timeout = setTimeout(() => setIndex((i) => Math.min(i + 1, tour.length - 1)), sceneDuration(scene));
    return () => clearTimeout(timeout);
  }, [index, playing, tour.length, scene]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest?.('input, textarea')) return;
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, tour.length - 1));
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
      if (event.key === 'Escape') onExit();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [tour.length, onExit]);

  const go = (next: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(next, tour.length - 1)));
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
        maxZoom={1.15}
        proOptions={{ hideAttribution: true }}
      >
        <CanvasPortal>
          <div className="absolute left-0 top-0" style={{ zIndex: 1500 }}>
            {cards.map(({ node, notes, code }) => (
              <div
                key={`${index}-${node.node.id}`}
                className="ec-tour-cards"
                style={{ transform: `translate(${node.position.x + node.width + CARD_GAP}px, ${node.position.y}px)`, width: CARD_WIDTH }}
              >
                {notes.map((note, i) => (
                  <TourNote key={i} text={note.text} agentName={agentName} onKeep={() => onKeepNote({ resource: note.resource, text: note.text, author: agentName })} />
                ))}
                {code.map((snippet, i) => (
                  <CodeCard key={i} {...snippet} />
                ))}
              </div>
            ))}
          </div>
        </CanvasPortal>
        <AgentPresenceLayer presence={presence} agentName={agentName} stage={stage} />
      </ReactFlow>

      <Walkthrough
        kicker={
          <>
            <Bot aria-hidden className="ec-inline-icon" /> {agentName} is walking you through it
          </>
        }
        title={tour.length > 1 ? `Walkthrough · ${tour.length} scenes` : 'Walkthrough'}
        body={scene.caption ?? 'This part of the diagram'}
        index={index}
        count={tour.length}
        onStep={go}
        onClose={onExit}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
      />
    </div>
  );
}

/** A note the agent writes on the canvas, typed out as it writes it */
function TourNote({ text, agentName, onKeep }: { text: string; agentName: string; onKeep: () => void }) {
  const [shown, setShown] = useState(0);
  const [kept, setKept] = useState(false);
  useEffect(() => {
    const step = Math.max(1, Math.ceil(text.length / 45));
    const interval = setInterval(() => setShown((n) => (n >= text.length ? (clearInterval(interval), n) : n + step)), 22);
    return () => clearInterval(interval);
  }, [text]);
  return (
    <div className="ec-tour-note">
      <div className="ec-tour-note-meta">
        <Bot aria-hidden /> {agentName}
        <button
          type="button"
          className="ec-tour-keep"
          disabled={kept}
          onClick={() => {
            onKeep();
            setKept(true);
          }}
        >
          {kept ? <Check aria-hidden /> : <Pin aria-hidden />} {kept ? 'Kept' : 'Keep as note'}
        </button>
      </div>
      <p>
        {text.slice(0, shown)}
        {shown < text.length && <span className="ec-tour-caret" />}
      </p>
    </div>
  );
}

/** Code the agent pinned next to a resource, e.g. an event's schema */
function CodeCard({ title, language, code }: NonNullable<Scene['code']>[number]) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Sandboxed views may block the clipboard: select it to copy instead
      const range = document.createRange();
      if (preRef.current) range.selectNodeContents(preRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  };
  return (
    <div className="ec-tour-code">
      <div className="ec-tour-code-header">
        <span className="ec-tour-code-title">{title ?? 'Code'}</span>
        {language && <span className="ec-tour-code-language">{language}</span>}
        <button type="button" className="ec-tour-keep" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* Rendered as text: code comes from the agent and is never run or parsed as markup */}
      <pre ref={preRef}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
