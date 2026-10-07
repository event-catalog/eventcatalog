import { useSyncExternalStore } from 'react';
import type { XYPosition } from '@xyflow/react';
import type { Awareness } from 'y-protocols/awareness';

export type Peer = {
  clientId: number;
  name: string;
  color: string;
  /** An AI agent (joined over MCP, or working through this tab with WebMCP), rather than a person */
  agent?: boolean;
  /** What an agent is doing, e.g. "Adding OrderService" */
  activity?: string;
  pointer: XYPosition | null;
  selection: string[];
  /** What they're looking at: the canvas position in the middle of their screen, and their zoom */
  viewport?: { x: number; y: number; zoom: number };
  /** Where a connection they're dragging starts (agents show theirs) */
  connecting?: XYPosition | null;
};

type Listener = () => void;

/**
 * Who's on a canvas and what they're doing (pointers, selections, views), from Yjs awareness, kept out of React
 * state: only the components that draw presence subscribe, so a pointer moving doesn't re-render the canvas.
 * Our own pointer, selection and view are sent to others but don't notify here (nothing here draws them).
 */
export type PresenceStore = {
  subscribe: (listener: Listener) => () => void;
  /** Everyone, including us and an agent working through this tab. Changes whenever anyone does anything. */
  getPeers: () => Peer[];
  /**
   * Everyone, for lists of who's here: changes only when people join, leave or rename, or agents change what
   * they're doing (pointers and views in it may be out of date: read getPeers() for those)
   */
  getPeople: () => Peer[];
  /** Show an agent working through this tab (WebMCP), which only this tab sees */
  setLocalAgent: (agent: Peer | null) => void;
  destroy: () => void;
};

const EMPTY: Peer[] = [];

const toPeers = (awareness: Awareness): Peer[] => {
  const peers: Peer[] = [];
  awareness.getStates().forEach((state, clientId) => {
    if (!state.user) return;
    peers.push({
      clientId,
      ...state.user,
      activity: state.activity,
      pointer: state.pointer ?? null,
      selection: state.selection ?? [],
      viewport: state.viewport,
      connecting: state.connecting,
    });
  });
  return peers;
};

// What getPeople() changes on: who people are, what agents are doing, and whether they're on the canvas (a pointer)
const identity = (peer: Peer) =>
  [peer.clientId, peer.name, peer.color, peer.agent ? 1 : 0, peer.activity ?? '', peer.pointer ? 1 : 0].join('|');

export function createPresenceStore(awareness: Awareness): PresenceStore {
  const listeners = new Set<Listener>();
  let remote = toPeers(awareness);
  let localAgent: Peer | null = null;
  let peers = remote;
  let people = remote;
  let ownUser = JSON.stringify(awareness.getLocalState()?.user ?? null);

  const update = () => {
    peers = localAgent ? [...remote, localAgent] : remote;
    const nextPeople = peers.length ? peers : EMPTY;
    if (nextPeople.map(identity).join() !== people.map(identity).join()) people = nextPeople;
    listeners.forEach((listener) => listener());
  };

  const onChange = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    const others = [...added, ...updated, ...removed].some((id) => id !== awareness.clientID);
    const user = JSON.stringify(awareness.getLocalState()?.user ?? null);
    // Only our own pointer, selection or view changed: nothing shown here changed
    if (!others && user === ownUser) return;
    ownUser = user;
    remote = toPeers(awareness);
    update();
  };
  awareness.on('change', onChange);

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getPeers: () => peers,
    getPeople: () => people,
    setLocalAgent: (agent) => {
      localAgent = agent;
      update();
    },
    destroy: () => {
      awareness.off('change', onChange);
      listeners.clear();
    },
  };
}

const noStore = { subscribe: () => () => {}, getPeers: () => EMPTY, getPeople: () => EMPTY };

/** Everyone on the canvas, re-rendering only when people join, leave, rename or start or stop working */
export const usePeople = (store: PresenceStore | null) => {
  const source = store ?? noStore;
  return useSyncExternalStore(source.subscribe, source.getPeople);
};
