/**
 * A live room: people working on the same canvas (its Yjs document), each in their own browser. What they change,
 * and where their cursors are, is encrypted here with the room's key (AES-GCM, from the link's fragment, which never
 * reaches the server) and sent through the server's relay to everyone else in the room (src/rooms.ts). The server
 * keeps nothing: when someone joins, they ask one of the people already there for what they don't have.
 *
 * Joining a room with a large canvas used to make everyone there send the whole canvas to everyone (a join through the
 * relay was N canvases to each of N people): now the people there tell only the joiner what they have, and the joiner
 * asks one of them for what it's missing, which goes to the joiner alone. The relay passes a message to everyone in the
 * room, or to one of them (`send`'s `to`, the relay's id for them, told with each message they send).
 *
 * Messages, once decrypted: a type byte, then
 * - HELLO: a state vector (what I have), to everyone. Answered with a HELLO_BACK and who they are, to the joiner alone
 * - HELLO_BACK: a state vector. Answered with what they're missing; and if they have what I don't, I ask one of them
 *   (a NEED), one at a time, until I have what everyone said they have
 * - NEED: a state vector, to one person. Answered with a SYNC: what the asker is missing, to them alone
 * - SYNC: a Yjs update answering a NEED
 * - STATE: a digest of my whole document (its state vector and what's been deleted), to everyone, every 10 seconds
 *   while it's still. Answered by anyone whose document differs (and is still too) with a HELLO_BACK, so the two catch
 *   each other up: someone a change never reached (the relay drops what's sent over its limits) isn't left behind
 * - UPDATE: a Yjs update
 * - PRESENCE: who's here and where their cursor is (JSON)
 * - BYE: someone left (JSON, their id)
 * - END: the person who started the session stopped it, for everyone (JSON, their name)
 *
 * Pages open from before (the relay says which) don't send NEED or understand it: a HELLO from one is answered as it
 * expects (with what it's missing, to it alone), and a HELLO from here is answered by them with everything they have.
 */
import * as Y from 'yjs';
import type { Editing, Moving } from '@eventcatalog/visualiser/studio';

const HELLO = 0;
const HELLO_BACK = 1;
const UPDATE = 2;
const PRESENCE = 3;
const BYE = 4;
const END = 5;
const NEED = 6;
const SYNC = 7;
const STATE = 8;

/** The relay's framing (src/rooms.ts): who a message is for (0: everyone), and who one received was from */
const PROTOCOL_VERSION = 2;
const EVERYONE = 0;
const TO_BYTES = 4;
const FROM_BYTES = 5;

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
/**
 * Joining: how long to hear who's there before asking one of them (so people joining together ask different people),
 * and how long to wait for an answer before asking someone else (they may have left, or be slow to send a large canvas)
 */
const ASK_AFTER_MS = 50;
const ANSWER_WITHIN_MS = 8_000;
/**
 * Documents are compared (STATE) only once nothing has changed for this long, here and there: while people are
 * editing, changes on their way make documents differ for a moment without anyone being behind
 */
const STILL_FOR_MS = 2_000;
/** A document's digest (STATE, and before the state vector in a HELLO_BACK): the start of a SHA-256 */
const DIGEST_BYTES = 8;
const sameBytes = (one: Uint8Array, other: Uint8Array) => one.length === other.length && one.every((byte, index) => byte === other[index]);

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
  /** People here who said they have what this browser doesn't (by the relay's id for them), with what they have */
  private ahead = new Map<number, Uint8Array>();
  /** People who have nothing this browser doesn't by their state vector, but whose document differed (their digest) */
  private different = new Map<number, Uint8Array>();
  /** Whoever was asked for what this browser is missing, until they answer (or are given up on) */
  private asking: { from: number; timer: ReturnType<typeof setTimeout> } | null = null;
  private askTimer: ReturnType<typeof setTimeout> | null = null;
  /** When the document last changed (here or from the room), and its digest then (worked out once per change) */
  private changedAt = 0;
  private digested: { at: number; digest: Promise<Uint8Array> } | null = null;

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
      // Still here (and anyone gone quiet is gone), and what my document is, for anyone it differs from
      setInterval(() => {
        this.sendPresence();
        void this.sendState();
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
    this.stopAsking();
    window.removeEventListener('pagehide', this.sayBye);
    this.cursorListeners.clear();
    this.socket?.close();
  }

  private connect() {
    if (this.closed) return;
    this.on.status('connecting');
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/rooms/${this.room.id}?v=${PROTOCOL_VERSION}`;
    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;
    socket.onopen = () => {
      this.retry = 0;
      this.on.status('connected');
      // What I have: the people here say what they have, and I ask one of them for what I'm missing
      void this.send(HELLO, Y.encodeStateVector(this.doc));
      this.sendPresence();
    };
    socket.onmessage = (event) => void this.receive(new Uint8Array(event.data as ArrayBuffer));
    socket.onclose = () => {
      if (this.socket !== socket || this.closed) return;
      this.on.status('offline');
      // The relay's ids are for this connection: who's ahead is asked again on the next
      this.stopAsking();
      // Back soon (e.g. the server was redeployed): then everyone catches each other up again. At slightly different
      // times, so a room isn't joined by everyone in it at once
      const wait = Math.min(10_000, 500 * 2 ** this.retry++) * (0.5 + Math.random());
      setTimeout(() => this.connect(), wait);
    };
  }

  private onLocalUpdate = (update: Uint8Array, origin: unknown) => {
    this.changedAt = Date.now();
    if (origin === ROOM_ORIGIN) return;
    void this.send(UPDATE, update);
  };

  private sendPresence(to = EVERYONE) {
    this.me.at = Date.now();
    void this.send(PRESENCE, new TextEncoder().encode(JSON.stringify(this.me)), to);
  }

  /** Whether someone has what this browser doesn't (any client further along in their state vector than here) */
  private isAhead(theirs: Uint8Array) {
    const mine = Y.decodeStateVector(Y.encodeStateVector(this.doc));
    for (const [client, clock] of Y.decodeStateVector(theirs)) if (clock > (mine.get(client) ?? 0)) return true;
    return false;
  }

  /**
   * Asks one of the people ahead of this browser for what it's missing, one at a time: at random among them (so people
   * joining together don't all ask the same person), and someone else if they don't answer in time. Once nobody's
   * ahead, one of the people whose document still differed (deletions, which state vectors don't show) is asked once;
   * anything still different after that is caught up by the comparisons every 10 seconds (STATE)
   */
  private async askNext() {
    if (this.asking || this.askTimer) return;
    for (const [from, theirs] of this.ahead) if (!this.isAhead(theirs)) this.ahead.delete(from);
    let candidates = [...this.ahead.keys()];
    if (!candidates.length && this.different.size) {
      const mine = await this.digest();
      if (this.asking || this.askTimer) return;
      candidates = [...this.different].filter(([, theirs]) => !sameBytes(theirs, mine)).map(([from]) => from);
      this.different.clear();
    }
    if (!candidates.length) return;
    const from = candidates[Math.floor(Math.random() * candidates.length)];
    const timer = setTimeout(() => {
      this.ahead.delete(from);
      this.asking = null;
      void this.askNext();
    }, ANSWER_WITHIN_MS);
    this.asking = { from, timer };
    void this.send(NEED, Y.encodeStateVector(this.doc), from);
  }

  /** Says what I have, to one person: my document's digest and its state vector (a page from before reads a vector) */
  private async sayWhatIHave(to: number, toBefore = false) {
    const vector = Y.encodeStateVector(this.doc);
    if (toBefore) return void this.send(HELLO_BACK, vector, to);
    const digest = await this.digest();
    const body = new Uint8Array(DIGEST_BYTES + vector.length);
    body.set(digest);
    body.set(vector, DIGEST_BYTES);
    void this.send(HELLO_BACK, body, to);
  }

  private isStill = () => Date.now() - this.changedAt >= STILL_FOR_MS;

  /**
   * A digest of the whole document: its state vector and what's been deleted (deletions don't show in a state vector).
   * The same for everyone with the same document, whatever order its changes arrived in
   */
  private digest() {
    if (this.digested?.at !== this.changedAt) {
      const vector = Y.encodeStateVector(this.doc);
      // What's deleted: an update with nothing in it that the vector doesn't already have, only the deletions
      const deleted = Y.encodeStateAsUpdate(this.doc, vector);
      const both = new Uint8Array(vector.length + deleted.length);
      both.set(vector);
      both.set(deleted, vector.length);
      const digest = crypto.subtle.digest('SHA-256', both).then((hash) => new Uint8Array(hash, 0, DIGEST_BYTES));
      this.digested = { at: this.changedAt, digest };
    }
    return this.digested.digest;
  }

  /** Says what my document is, while it's still (anyone it differs from catches up with me) */
  private async sendState() {
    if (!this.isStill()) return;
    void this.send(STATE, await this.digest());
  }

  private stopAsking() {
    if (this.asking) clearTimeout(this.asking.timer);
    if (this.askTimer) clearTimeout(this.askTimer);
    this.asking = this.askTimer = null;
    this.ahead.clear();
    this.different.clear();
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

  /** Sends a message to everyone in the room, or to one person (the relay's id for them) */
  private async send(type: number, body: Uint8Array, to = EVERYONE) {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const plain = new Uint8Array(body.length + 1);
    plain[0] = type;
    plain.set(body, 1);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.key, plain));
    const frame = new Uint8Array(TO_BYTES + iv.length + sealed.length);
    new DataView(frame.buffer).setUint32(0, to);
    frame.set(iv, TO_BYTES);
    frame.set(sealed, TO_BYTES + iv.length);
    if (socket.readyState === WebSocket.OPEN && socket === this.socket) socket.send(frame);
  }

  private async receive(frame: Uint8Array) {
    // Who sent it (the relay's id for them), and whether they're on a page from before this protocol
    const header = new DataView(frame.buffer, frame.byteOffset, FROM_BYTES);
    const from = header.getUint32(0);
    const fromBefore = header.getUint8(4) < PROTOCOL_VERSION;
    const sealed = frame.subarray(FROM_BYTES);
    let plain: Uint8Array;
    try {
      plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.slice(0, 12) }, await this.key, sealed.slice(12)));
    } catch {
      // Not from someone with this room's key: ignored
      return;
    }
    const type = plain[0];
    const body = plain.subarray(1);
    switch (type) {
      case HELLO:
        // Someone joined: what we have (they ask for what they're missing) and who we are, to them alone. A page from
        // before doesn't ask: it's sent what it's missing
        if (fromBefore) void this.send(UPDATE, Y.encodeStateAsUpdate(this.doc, body), from);
        void this.sayWhatIHave(from, fromBefore);
        this.sendPresence(from);
        break;
      case HELLO_BACK: {
        // Their digest and state vector (a page from before sends just the vector, having sent everything it has)
        const vector = fromBefore ? body : body.subarray(DIGEST_BYTES);
        // What they're missing, to them (an empty update is a couple of bytes; it has my deletions too)
        const missing = Y.encodeStateAsUpdate(this.doc, vector);
        if (missing.length > 2) void this.send(UPDATE, missing, from);
        if (fromBefore) break;
        // What I'm missing: asked for, from one of the people who have it
        if (this.isAhead(vector)) this.ahead.set(from, vector);
        else if (!sameBytes(body.subarray(0, DIGEST_BYTES), await this.digest())) this.different.set(from, body.slice(0, DIGEST_BYTES));
        else break;
        if (!this.asking && !this.askTimer) {
          this.askTimer = setTimeout(() => {
            this.askTimer = null;
            void this.askNext();
          }, ASK_AFTER_MS);
        }
        break;
      }
      case STATE:
        // Their document isn't mine (and neither of us is mid-change): what I have, so we each send what the other's
        // missing (as a HELLO_BACK is answered)
        if (this.isStill() && !sameBytes(body, await this.digest())) void this.sayWhatIHave(from);
        break;
      case NEED:
        void this.send(SYNC, Y.encodeStateAsUpdate(this.doc, body), from);
        break;
      case SYNC:
        Y.applyUpdate(this.doc, body, ROOM_ORIGIN);
        // They've sent everything they had: more than they said they had before
        this.ahead.delete(from);
        this.different.delete(from);
        if (this.asking?.from === from) {
          clearTimeout(this.asking.timer);
          this.asking = null;
        }
        // Anyone else who said they have more (people who were out of step with each other) is asked next
        void this.askNext();
        break;
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
