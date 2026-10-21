/**
 * The diagram built up in front of the user while the agent is still writing it (hosts that stream the tool's
 * arguments, see draft.ts): what it's written so far is laid out a few times a second and played on the build stage,
 * each time from what's already there. When the tool's result arrives, the diagram's own build carries on from
 * where this one got to (Diagram's `builtBefore`), rather than starting again.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildDraftGraph } from '../../src/model/to-graph';
import { BuildStage } from './BuildStage';
import { toStage, type StageState } from './choreography';
import { draftKey, draftModel } from './draft';

// Laid out again at most this often (each layout of a growing diagram takes a moment)
const LAYOUT_EVERY_MS = 400;
// Too much to watch being built one node at a time (as Diagram's MAX_ANIMATED_NODES): counted instead
const MAX_DRAFT_NODES = 120;

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** The draft from the streamed arguments: the stage to build up to, and how far the agent's got */
export function useDraftDiagram() {
  const [target, setTarget] = useState<StageState>();
  const [progress, setProgress] = useState<{ title: string; resources: number }>();
  const drafting = useRef({ key: '', latest: undefined as ReturnType<typeof draftModel>, laying: false, lastAt: 0, steps: 0, stopped: false });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const layOut = useCallback(async () => {
    const draft = drafting.current;
    timer.current = undefined;
    if (draft.laying || !draft.latest || draft.stopped) return;
    const model = draft.latest;
    draft.latest = undefined;
    draft.laying = true;
    draft.lastAt = Date.now();
    try {
      const graph = await buildDraftGraph(model);
      if (!draft.stopped) {
        setTarget(toStage(graph));
        draft.steps++;
      }
    } catch {
      // Half-written diagrams that can't be laid out yet: the next update tries again
    } finally {
      draft.laying = false;
    }
    if (draft.latest && !draft.stopped) timer.current = setTimeout(layOut, LAYOUT_EVERY_MS);
  }, []);

  const onPartial = useCallback(
    (args: Record<string, unknown>) => {
      const draft = drafting.current;
      if (draft.stopped) return;
      const model = draftModel(args);
      if (!model) return;
      const key = draftKey(model);
      if (key === draft.key) return;
      draft.key = key;
      setProgress({ title: model.title, resources: model.resources.length });
      if (model.resources.length > MAX_DRAFT_NODES || prefersReducedMotion()) return;
      draft.latest = model;
      if (draft.laying || timer.current) return;
      timer.current = setTimeout(layOut, Math.max(0, draft.lastAt + LAYOUT_EVERY_MS - Date.now()));
    },
    [layOut]
  );

  /** No more drafts (the result arrived, or the tool was cancelled): how many were played */
  const stop = useCallback(() => {
    drafting.current.stopped = true;
    clearTimeout(timer.current);
    return drafting.current.steps;
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return { target, progress, onPartial, stop };
}

type DraftStageProps = {
  /** The latest draft, laid out */
  target: StageState;
  agentName: string;
  /** Each draft as it starts playing: where the diagram's own build starts from, if the result arrives now */
  onPlaying: (stage: StageState) => void;
};

/** Plays each draft from the last: one at a time, then straight on to the latest (drafts in between are skipped) */
export function DraftStage({ target, agentName, onPlaying }: DraftStageProps) {
  const [playing, setPlaying] = useState<{ from?: StageState; to: StageState }>({ to: target });
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const busy = useRef(true);
  const latest = useRef(target);
  latest.current = target;
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;

  useEffect(() => onPlayingRef.current(playing.to), [playing]);
  useEffect(() => {
    if (busy.current || target === playing.to) return;
    busy.current = true;
    setPlaying({ from: playing.to, to: target });
  }, [target]);

  const done = useCallback(() => {
    const current = playingRef.current;
    if (latest.current === current.to) {
      busy.current = false;
      return;
    }
    setPlaying({ from: current.to, to: latest.current });
  }, []);

  return <BuildStage from={playing.from} to={playing.to} agentName={agentName} onDone={done} />;
}
