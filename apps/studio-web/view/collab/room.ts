/**
 * A live room: people working on the same canvas (its Yjs document), each in their own browser. What they change,
 * and where their cursors are, is encrypted here with the room's key (AES-GCM, from the link's fragment, which never
 * reaches the server) and sent through the server's relay to everyone else in the room (src/rooms.ts). The server
 * keeps nothing: when someone joins, the people already there send them what they don't have.
 *
 * Messages, once decrypted: a type byte, then
 * - HELLO: a state vector (what I have). Answered with what they're missing, and a HELLO_BACK with ours
 * - HELLO_BACK: a state vector. Answered with what they're missing (not with another hello)
 * - UPDATE: a Yjs update
 * - PRESENCE: who's here and where their cursor is (JSON)
 * - BYE: someone left (JSON, their id)
 * - END: the person who started the session stopped it, for everyone (JSON, their name)
 */
import * as Y from 'yjs';
import type { Editing, Moving } from '@eventcatalog/visualiser/studio';

const HELLO = 0;
const HELLO_BACK = 1;
const UPDATE = 2;
const PRESENCE = 3;
const BYE = 4;
const END = 5;

/** Changes that came from the room (so they're not sent back to it, nor undone here) */
export const ROOM_ORIGIN = Symbol('room');

export type RoomLink = { id: string; key: string };
// What the others are dragging and changing, as the shared canvas shows it (see the visualiser's studio/presence.ts)
export type { Editing, Moving } from '@eventcatalog/visualiser/studio';
export type Peer = {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  /** What they're dragging, while they drag (the drop itself arrives in the document) */
  moving?: Moving[] | null;
  /**
   * A note or text they're changing, as they change it: what's written as they type, a text's size as they scale it
   * and its angle as they turn it (what they end up with arrives in the document when they're done)
   */
  editing?: Editing | null;
  at: number;
};

/**
 * Where everyone's cursor is, for what draws them: read now, and told on every move, outside React. Cursors move
 * many times a second; putting them in React state re-rendered the whole page on every move (~70 renders a frame
 * with one person moving their pointer)
 */
export type CursorSource = {
  current: () => ReadonlyMap<string, Peer>;
  subscribe: (listener: (peers: ReadonlyMap<string, Peer>) => void) => () => void;
};
export type RoomStatus = 'connecting' | 'connected' | 'offline';

const PRESENCE_EVERY_MS = 10_000;
const PRESENCE_EXPIRES_MS = 30_000;
const CURSOR_EVERY_MS = 50;
// While dragging, a little more often: what's dragged moves smoothly for the others
const DRAG_EVERY_MS = 33;

// ---- The link: #room=<id>,<key> ----

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));

/** The room in a link's fragment, if it has one */
export function parseRoomFragment(hash: string): RoomLink | undefined {
  const match = /(?:^#|&)room=([A-Za-z0-9_-]{16,64}),([A-Za-z0-9_-]{16,64})/.exec(hash);
  return match ? { id: match[1], key: match[2] } : undefined;
}

/** A new room: a random id (where it's relayed) and key (what it's encrypted with; only in the link) */
export function newRoom(): RoomLink {
  return { id: toBase64Url(crypto.getRandomValues(new Uint8Array(16))), key: toBase64Url(crypto.getRandomValues(new Uint8Array(16))) };
}

export const roomFragment = (room: RoomLink) => `#room=${room.id},${room.key}`;

// The rooms started in this browser: whoever started a session can stop it, for everyone
const STARTED_KEY = 'eventcatalog-studio-started-rooms';
const startedRooms = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STARTED_KEY) ?? '[]');
  } catch {
    return [];
  }
};
export const markRoomStarted = (id: string) => {
  try {
    localStorage.setItem(STARTED_KEY, JSON.stringify([...startedRooms().filter((other) => other !== id), id].slice(-50)));
  } catch {}
};
export const isRoomStarter = (id: string) => startedRooms().includes(id);

// The rooms joined in this browser: whoever joins one is asked their name and colour the first time
const JOINED_KEY = 'eventcatalog-studio-joined-rooms';
export const hasJoinedRoom = (id: string) => {
  try {
    return (JSON.parse(localStorage.getItem(JOINED_KEY) ?? '[]') as string[]).includes(id);
  } catch {
    return false;
  }
};
export const markRoomJoined = (id: string) => {
  try {
    const joined = JSON.parse(localStorage.getItem(JOINED_KEY) ?? '[]') as string[];
    localStorage.setItem(JOINED_KEY, JSON.stringify([...joined.filter((other) => other !== id), id].slice(-50)));
  } catch {}
};

// ---- Who I am, in rooms (remembered in this browser) ----

const NAMES = ['Otter', 'Falcon', 'Badger', 'Heron', 'Lynx', 'Puffin', 'Fox', 'Koala', 'Orca', 'Wren', 'Panda', 'Gecko'];
const ADJECTIVES = ['Curious', 'Bright', 'Calm', 'Swift', 'Clever', 'Bold', 'Kind', 'Keen'];
/** The colours people pick from (their cursor, name tag and avatar) */
export const PERSON_COLORS = ['#e11d48', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#c026d3'];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Saves the name and colour they go by in rooms (in this browser) */
export function setMyIdentity(change: { name?: string; color?: string }): { name: string; color: string } {
  const current = myIdentity();
  const me = {
    name: change.name?.trim().slice(0, 40) || current.name,
    color: change.color && PERSON_COLORS.includes(change.color) ? change.color : current.color,
  };
  try {
    localStorage.setItem('eventcatalog-studio-me', JSON.stringify(me));
  } catch {}
  return me;
}

export function myIdentity(): { name: string; color: string } {
  try {
    const saved = JSON.parse(localStorage.getItem('eventcatalog-studio-me') ?? 'null');
    if (saved?.name && saved?.color) return saved;
  } catch {}
  const me = { name: `${pick(ADJECTIVES)} ${pick(NAMES)}`, color: pick(PERSON_COLORS) };
  try {
    localStorage.setItem('eventcatalog-studio-me', JSON.stringify(me));
  } catch {}
  return me;
}

// ---- The connection ----

export class RoomConnection implements CursorSource {
  readonly me: Peer;
  private cursorListeners = new Set<(peers: ReadonlyMap<string, Peer>) => void>();
  // Who's here, as last told (id, name and colour): `on.peers` hears only when that changes, not when cursors move
  private peopleKey = '';
  private socket: WebSocket | null = null;
  private key: Promise<CryptoKey>;
  private peers = new Map<string, Peer>();
  private retry = 0;
  private closed = false;
  private timers: ReturnType<typeof setInterval>[] = [];
  private cursorTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly doc: Y.Doc,
    private readonly room: RoomLink,
    private readonly on: { peers: (peers: Peer[]) => void; status: (status: RoomStatus) => void; ended?: (by: string) => void }
  ) {
    this.me = { id: crypto.randomUUID(), ...myIdentity(), cursor: null, at: Date.now() };
    this.key = crypto.subtle.importKey('raw', fromBase64Url(room.key), 'AES-GCM', false, ['encrypt', 'decrypt']);
    doc.on('update', this.onLocalUpdate);
    this.connect();
    this.timers.push(
      // Still here (and anyone gone quiet is gone)
      setInterval(() => {
        this.sendPresence();
        const now = Date.now();
        let changed = false;
        this.peers.forEach((peer, id) => {
          if (now - peer.at > PRESENCE_EXPIRES_MS) this.peers.delete(id), (changed = true);
        });
        if (changed) this.emitPeers();
      }, PRESENCE_EVERY_MS)
    );
    window.addEventListener('pagehide', this.sayBye);
  }

  /** Where my cursor is on the canvas (in its coordinates), or off it: sent a few times a second at most */
  moveCursor(at: { x: number; y: number } | null) {
    this.me.cursor = at && { x: Math.round(at.x), y: Math.round(at.y) };
    this.schedulePresence();
  }

  /**
   * What I'm dragging, where it is now (sent with my cursor, so the others see it move), or nothing (dropped: sent
   * straight away; the drop itself goes in the document)
   */
  moveNodes(moving: Moving[] | null) {
    this.me.moving = moving && moving.map(({ id, x, y, level, kind }) => ({
      id,
      x: Math.round(x),
      y: Math.round(y),
      ...(level && { level }),
      ...(kind && { kind }),
    }));
    if (moving) return this.schedulePresence();
    if (this.cursorTimer) clearTimeout(this.cursorTimer), (this.cursorTimer = null);
    this.sendPresence();
  }

  /**
   * The note or text I'm changing, as I write, scale or turn it (sent with my cursor), or nothing (done: sent straight
   * away)
   */
  editNode(editing: Editing | null) {
    this.me.editing = editing && { ...editing, ...(editing.text !== undefined && { text: editing.text.slice(0, 2000) }) };
    if (editing) return this.schedulePresence();
    if (this.cursorTimer) clearTimeout(this.cursorTimer), (this.cursorTimer = null);
    this.sendPresence();
  }

  private schedulePresence() {
    if (this.cursorTimer) return;
    this.cursorTimer = setTimeout(
      () => {
        this.cursorTimer = null;
        this.sendPresence();
      },
      this.me.moving || this.me.editing ? DRAG_EVERY_MS : CURSOR_EVERY_MS
    );
  }

  /** A new name or colour for me: the others see it straight away */
  updateMe(me: { name: string; color: string }) {
    Object.assign(this.me, me);
    this.sendPresence();
  }

  /** Stops the session for everyone (they're told, and leave it), then leaves it */
  async end() {
    await this.send(END, new TextEncoder().encode(JSON.stringify({ by: this.me.name })));
    this.destroy();
  }

  /** Leaves the room (this browser keeps its copy of the canvas) */
  destroy() {
    this.closed = true;
    this.sayBye();
    this.doc.off('update', this.onLocalUpdate);
    this.timers.forEach(clearInterval);
    if (this.cursorTimer) clearTimeout(this.cursorTimer);
    window.removeEventListener('pagehide', this.sayBye);
    this.cursorListeners.clear();
    this.socket?.close();
  }

  private connect() {
    if (this.closed) return;
    this.on.status('connecting');
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/rooms/${this.room.id}`;
    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;
    socket.onopen = () => {
      this.retry = 0;
      this.on.status('connected');
      // What I have: the people here send what I'm missing, and ask for what they're missing
      void this.send(HELLO, Y.encodeStateVector(this.doc));
      this.sendPresence();
    };
    socket.onmessage = (event) => void this.receive(new Uint8Array(event.data as ArrayBuffer));
    socket.onclose = () => {
      if (this.socket !== socket || this.closed) return;
      this.on.status('offline');
      // Back soon (e.g. the server was redeployed): then everyone catches each other up again
      const wait = Math.min(10_000, 500 * 2 ** this.retry++);
      setTimeout(() => this.connect(), wait);
    };
  }

  private onLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === ROOM_ORIGIN) return;
    void this.send(UPDATE, update);
  };

  private sendPresence() {
    this.me.at = Date.now();
    void this.send(PRESENCE, new TextEncoder().encode(JSON.stringify(this.me)));
  }

  private sayBye = () => void this.send(BYE, new TextEncoder().encode(JSON.stringify({ id: this.me.id })));

  private emitPeers() {
    this.cursorListeners.forEach((listener) => listener(this.peers));
    const people = [...this.peers.values()];
    const key = people.map((peer) => `${peer.id}:${peer.name}:${peer.color}`).join('|');
    if (key === this.peopleKey) return;
    this.peopleKey = key;
    this.on.peers(people);
  }

  current = () => this.peers as ReadonlyMap<string, Peer>;

  subscribe = (listener: (peers: ReadonlyMap<string, Peer>) => void) => {
    this.cursorListeners.add(listener);
    return () => void this.cursorListeners.delete(listener);
  };

  private async send(type: number, body: Uint8Array) {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const plain = new Uint8Array(body.length + 1);
    plain[0] = type;
    plain.set(body, 1);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.key, plain));
    const frame = new Uint8Array(iv.length + sealed.length);
    frame.set(iv);
    frame.set(sealed, iv.length);
    if (socket.readyState === WebSocket.OPEN) socket.send(frame);
  }

  private async receive(frame: Uint8Array) {
    let plain: Uint8Array;
    try {
      plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: frame.slice(0, 12) }, await this.key, frame.slice(12)));
    } catch {
      // Not from someone with this room's key: ignored
      return;
    }
    const type = plain[0];
    const body = plain.subarray(1);
    switch (type) {
      case HELLO:
        // Someone joined: what they're missing, what we have (so they send what we're missing), and who we are
        void this.send(UPDATE, Y.encodeStateAsUpdate(this.doc, body));
        void this.send(HELLO_BACK, Y.encodeStateVector(this.doc));
        this.sendPresence();
        break;
      case HELLO_BACK: {
        const missing = Y.encodeStateAsUpdate(this.doc, body);
        // (an empty update is a couple of bytes)
        if (missing.length > 2) void this.send(UPDATE, missing);
        break;
      }
      case UPDATE:
        Y.applyUpdate(this.doc, body, ROOM_ORIGIN);
        break;
      case PRESENCE: {
        const peer = JSON.parse(new TextDecoder().decode(body)) as Peer;
        if (!peer?.id || peer.id === this.me.id) break;
        this.peers.set(peer.id, { ...peer, at: Date.now() });
        this.emitPeers();
        break;
      }
      case END: {
        // Stopped by whoever started it: this browser leaves too (and isn't reconnected)
        const { by } = JSON.parse(new TextDecoder().decode(body)) as { by: string };
        this.destroy();
        this.on.status('offline');
        this.on.ended?.(by || 'someone');
        break;
      }
      case BYE: {
        const { id } = JSON.parse(new TextDecoder().decode(body)) as { id: string };
        if (this.peers.delete(id)) this.emitPeers();
        break;
      }
    }
  }
}
