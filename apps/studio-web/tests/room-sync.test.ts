/**
 * Live rooms end to end: the browser's RoomConnection (view/collab/room.ts), run in Node against the relay
 * (src/rooms.ts), counting what each connection is sent while people join a room with a large canvas.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NodeWebSocket from 'ws';
import * as Y from 'yjs';
import { attachRooms } from '../src/rooms';
import { newRoom, ROOM_ORIGIN, RoomConnection, type RoomLink } from '../view/collab/room';

const [HELLO, HELLO_BACK, UPDATE, , , , NEED] = [0, 1, 2, 3, 4, 5, 6];
const MB = 1024 * 1024;

let server: Server;
let host: string;
let connections: RoomConnection[] = [];
let rawSockets: NodeWebSocket[] = [];

/** What a socket was sent, and whether the relay dropped it */
type Counted = { bytes: number; dropped: boolean };
const counted: Counted[] = [];
const count = (socket: NodeWebSocket) => {
  const tally: Counted = { bytes: 0, dropped: false };
  counted.push(tally);
  socket.on('message', (data: ArrayBuffer | Buffer) => (tally.bytes += data.byteLength));
  // Closed by the relay (code 1006, no close frame: terminated)
  socket.on('close', (code) => (tally.dropped ||= code === 1006));
  return tally;
};

beforeEach(async () => {
  server = createServer();
  attachRooms(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  host = `localhost:${(server.address() as AddressInfo).port}`;
  // What RoomConnection uses of the browser
  Object.assign(globalThis, {
    location: { protocol: 'http:', host },
    window: { addEventListener() {}, removeEventListener() {} },
    WebSocket: class extends NodeWebSocket {
      constructor(url: string) {
        super(url, { headers: { origin: `http://${host}` } });
        count(this);
      }
    },
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  connections.forEach((connection) => connection.destroy());
  rawSockets.forEach((socket) => socket.terminate());
  connections = [];
  rawSockets = [];
  counted.length = 0;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

/** A canvas of about `bytes` (each node a unique string, as a real canvas's ids and text are) */
const bigCanvas = (bytes: number, prefix = 'node') => {
  const doc = new Y.Doc();
  const nodes = doc.getMap('nodes');
  doc.transact(() => {
    for (let i = 0; i * 1000 < bytes; i++) nodes.set(`${prefix}-${i}`, { id: `${prefix}-${i}`, text: crypto.randomUUID().repeat(27) });
  });
  return doc;
};
const sizeOf = (doc: Y.Doc) => Y.encodeStateAsUpdate(doc).length;

/** Someone in the room, on this page (the current protocol) */
const join = (room: RoomLink, doc = new Y.Doc()) => {
  const connection = new RoomConnection(doc, room, { peers: () => {}, status: () => {} });
  connections.push(connection);
  return { doc, connection, socket: counted[counted.length - 1] };
};

/**
 * Someone on a page from before this protocol (no `?v=2`): sends and receives encrypted messages alone, answers a HELLO
 * with everything it has and a HELLO_BACK, to everyone, as that page did. Or, `silent`, someone on this protocol who
 * says it has everything but never answers when asked
 */
const rawPeer = async (room: RoomLink, doc: Y.Doc, as: 'before' | 'silent', { replyAfterMs = 0 } = {}) => {
  const asked = { needs: 0 };
  const key = await crypto.subtle.importKey('raw', Buffer.from(room.key, 'base64url'), 'AES-GCM', false, ['encrypt', 'decrypt']);
  const socket = new NodeWebSocket(`ws://${host}/rooms/${room.id}${as === 'silent' ? '?v=2' : ''}`, { headers: { origin: `http://${host}` } });
  rawSockets.push(socket);
  const tally = count(socket);
  const send = async (type: number, body: Uint8Array, to = 0) => {
    const plain = Buffer.concat([Buffer.from([type]), body]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = Buffer.from(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
    const to4 = Buffer.alloc(4);
    to4.writeUInt32BE(to);
    socket.send(Buffer.concat([...(as === 'silent' ? [to4] : []), iv, sealed]));
  };
  socket.on('message', async (data: Buffer) => {
    const from = as === 'silent' ? data.readUInt32BE(0) : 0;
    const frame = new Uint8Array(as === 'silent' ? data.subarray(5) : data);
    const plain = Buffer.from(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: frame.slice(0, 12) }, key, frame.slice(12)));
    const [type, body] = [plain[0], plain.subarray(1)];
    if (type === UPDATE) Y.applyUpdate(doc, body);
    if (type === NEED) asked.needs++;
    if (type !== HELLO) return;
    if (replyAfterMs) await new Promise((resolve) => setTimeout(resolve, replyAfterMs));
    if (as === 'silent') return void send(HELLO_BACK, Y.encodeStateVector(doc), from);
    await send(UPDATE, Y.encodeStateAsUpdate(doc, body));
    await send(HELLO_BACK, Y.encodeStateVector(doc));
  });
  await new Promise((resolve) => socket.once('open', resolve));
  // Says hello itself, as the page did on joining
  if (as === 'before') await send(HELLO, Y.encodeStateVector(doc));
  return { doc, socket: tally, asked };
};

const sameAs = (doc: Y.Doc, other: Y.Doc) => Buffer.from(Y.encodeStateVector(doc)).equals(Buffer.from(Y.encodeStateVector(other)));
const until = async (done: () => boolean, ms = 10_000) => {
  const started = Date.now();
  while (!done()) {
    if (Date.now() - started > ms) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/** A room of `people`, the first with the canvas, everyone caught up */
const roomWith = async (canvas: Y.Doc, people: number) => {
  const room = newRoom();
  const everyone = [join(room, canvas)];
  for (let i = 1; i < people; i++) {
    const person = join(room);
    await until(() => sameAs(person.doc, canvas));
    everyone.push(person);
  }
  await settle();
  return { room, everyone };
};
const bytesFrom = (people: { socket: Counted }[]) => {
  const before = people.map(({ socket }) => socket.bytes);
  return () => people.map(({ socket }, index) => socket.bytes - before[index]);
};

describe('joining a live room', () => {
  it('sends a large canvas to whoever joins, once, and nothing of it to everyone already there', async () => {
    const canvas = bigCanvas(2 * MB);
    const { room, everyone } = await roomWith(canvas, 6);
    const sentToEach = bytesFrom(everyone);

    const joiner = join(room);
    await until(() => sameAs(joiner.doc, canvas));
    await settle();

    // Before: the joiner got 6 copies (12 MB) and everyone else 5 (10 MB each)
    expect(joiner.socket.bytes).toBeLessThan(sizeOf(canvas) * 1.05);
    for (const bytes of sentToEach()) expect(bytes).toBeLessThan(10 * 1024);
    expect(counted.some((socket) => socket.dropped)).toBe(false);
  });

  it('catches up several people joining at once, each sent the canvas once', async () => {
    const canvas = bigCanvas(1 * MB);
    const { room, everyone } = await roomWith(canvas, 4);
    const sentToEach = bytesFrom(everyone);

    const joiners = [join(room), join(room), join(room)];
    await until(() => joiners.every((joiner) => sameAs(joiner.doc, canvas)));
    await settle();

    for (const joiner of joiners) expect(joiner.socket.bytes).toBeLessThan(sizeOf(canvas) * 1.1);
    for (const bytes of sentToEach()) expect(bytes).toBeLessThan(20 * 1024);
  });

  it('gets everything when the people there are out of step with each other', async () => {
    const canvas = bigCanvas(200 * 1024);
    const { room, everyone } = await roomWith(canvas, 3);
    // Something only the second person has (as if a change of theirs never reached the others): applied as if from the
    // room, so their connection doesn't send it on
    const only = bigCanvas(50 * 1024, 'only');
    Y.applyUpdate(everyone[1].doc, Y.encodeStateAsUpdate(only), ROOM_ORIGIN);
    expect(sameAs(everyone[0].doc, everyone[1].doc)).toBe(false);

    const joiner = join(room);
    await until(() => sameAs(joiner.doc, everyone[1].doc));
    expect(joiner.doc.getMap('nodes').size).toBe(canvas.getMap('nodes').size + only.getMap('nodes').size);
  });

  it('asks someone else when the person asked never answers', async () => {
    const canvas = bigCanvas(100 * 1024);
    const { room } = await roomWith(canvas, 1);
    // Someone who says they have the canvas (a copy), answering last, then ignores being asked
    const copy = new Y.Doc();
    Y.applyUpdate(copy, Y.encodeStateAsUpdate(canvas));
    const silent = await rawPeer(room, copy, 'silent', { replyAfterMs: 20 });
    await settle();
    // Of the people who have what the joiner needs, the last to say so is asked first: the silent one
    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    const started = Date.now();
    const joiner = join(room);
    await until(() => sameAs(joiner.doc, canvas), 15_000);
    expect(silent.asked.needs).toBe(1);
    // Given up on after ANSWER_WITHIN_MS (8 seconds), then caught up by the other
    expect(Date.now() - started).toBeGreaterThan(7_000);
  }, 20_000);

  it('joins a room with someone on a page from before, who sends everything they have', async () => {
    const canvas = bigCanvas(300 * 1024);
    const room = newRoom();
    const before = await rawPeer(room, canvas, 'before');

    const joiner = join(room);
    await until(() => sameAs(joiner.doc, canvas));
    // And what the joiner adds reaches them
    joiner.doc.getMap('nodes').set('added', { id: 'added' });
    await until(() => before.doc.getMap('nodes').has('added'));
  });

  it('catches up someone joining from a page from before, sending only to them', async () => {
    const canvas = bigCanvas(300 * 1024);
    const { room, everyone } = await roomWith(canvas, 3);
    const sentToEach = bytesFrom(everyone);

    const before = await rawPeer(room, new Y.Doc(), 'before');
    await until(() => sameAs(before.doc, canvas));
    await settle();

    // Everyone here answers it (as its page expects), to it alone
    for (const bytes of sentToEach()) expect(bytes).toBeLessThan(10 * 1024);
  });
});
