#!/usr/bin/env node
// A pretend team on one canvas, to measure what a busy session costs the people in it: N people moving their
// pointers, some of them dragging nodes, and everyone dropping a node now and then (a document change). Works with
// both Studios:
//
//   node fake-team.mjs '<Studio on the web session link, with #room=id,key>' [options]
//   node fake-team.mjs 'http://localhost:3000/studio/<canvas id>' [options]          (EventCatalog's Studio)
//
//   --people 7        how many (others: with you on the canvas, 8 is a team of 8)
//   --dragging 3      how many of them drag a node in circles the whole time
//   --drop-every 4000 each person moves a node in the document this often (ms; 0 for never)
//   --seconds 60      how long they stay
//
// They send what a real canvas sends, at its pace: pointers every 50 ms (the web) or 33 ms (EventCatalog), drags
// every 33 ms. Prints, at the end, what each person sent and received (messages and bytes), so the relay's or the
// collaboration server's fan-out can be checked too.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const fromWeb = createRequire(path.join(root, 'apps/studio-web/package.json'));
const fromCore = createRequire(path.join(root, 'packages/core/package.json'));

const [link, ...rest] = process.argv.slice(2);
if (!link)
  throw new Error(
    "Usage: node fake-team.mjs '<session link or Studio canvas URL>' [--people 7] [--dragging 3] [--drop-every 4000] [--seconds 60]"
  );
const option = (name, fallback) => {
  const at = rest.indexOf(`--${name}`);
  return at === -1 ? fallback : Number(rest[at + 1]);
};
const PEOPLE = option('people', 7);
const DRAGGING = option('dragging', 3);
const DROP_EVERY = option('drop-every', 4000);
const SECONDS = option('seconds', 60);
const COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#ec4899', '#6366f1'];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const room = /room=([A-Za-z0-9_-]+),([A-Za-z0-9_-]+)/.exec(link);
const canvasId = /\/studio\/([0-9a-f-]{36})/.exec(link)?.[1];
if (!room && !canvasId) throw new Error('Give a session link (#room=id,key) or a Studio canvas URL (/studio/<id>)');

// ---- Studio on the web: the encrypted relay (see apps/studio-web/view/collab/room.ts) ----
const webPerson = async (index) => {
  const WebSocket = fromWeb('ws');
  const Y = fromWeb('yjs');
  const [, roomId, keyText] = room;
  const origin = new URL(link).origin;
  const [HELLO, HELLO_BACK, UPDATE, PRESENCE, BYE] = [0, 1, 2, 3, 4];
  const key = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(Buffer.from(keyText.replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
  const doc = new Y.Doc();
  const counts = {
    sent: 0,
    sentBytes: 0,
    received: 0,
    receivedBytes: 0,
    drops: 0,
  };
  const socket = new WebSocket(`${origin.replace(/^http/, 'ws')}/rooms/${roomId}`, { headers: { Origin: origin } });
  const send = async (type, body) => {
    const plain = new Uint8Array(body.length + 1);
    plain[0] = type;
    plain.set(body, 1);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
    const frame = Buffer.concat([iv, sealed]);
    if (socket.readyState !== socket.OPEN) return;
    socket.send(frame);
    counts.sent++;
    counts.sentBytes += frame.length;
  };
  socket.on('message', async (data) => {
    const frame = new Uint8Array(data);
    counts.received++;
    counts.receivedBytes += frame.length;
    let plain;
    try {
      plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: frame.slice(0, 12) }, key, frame.slice(12)));
    } catch {
      return;
    }
    const body = plain.subarray(1);
    if (plain[0] === HELLO) void send(UPDATE, Y.encodeStateAsUpdate(doc, body));
    if (plain[0] === UPDATE) Y.applyUpdate(doc, body, 'room');
  });
  doc.on('update', (update, origin) => origin !== 'room' && void send(UPDATE, update));
  await new Promise((resolve, reject) => (socket.once('open', resolve), socket.once('error', reject)));
  const me = {
    id: crypto.randomUUID(),
    name: `Peer ${index + 1}`,
    color: COLORS[index % COLORS.length],
    cursor: null,
    at: Date.now(),
  };
  // Catch up: whoever's here sends the canvas
  await send(HELLO, Y.encodeStateVector(doc));
  const presence = () => ((me.at = Date.now()), send(PRESENCE, new TextEncoder().encode(JSON.stringify(me))));
  await presence();
  return {
    counts,
    doc,
    nodes: () => doc.getMap('nodes'),
    pointerEvery: 50,
    move: (pointer, moving) => {
      me.cursor = pointer;
      me.moving = moving && moving.map(({ id, x, y }) => ({ id, x, y }));
      return presence();
    },
    leave: async () => {
      me.moving = null;
      await presence();
      await send(BYE, new TextEncoder().encode(JSON.stringify({ id: me.id })));
      await wait(100);
      socket.close();
    },
  };
};

// ---- EventCatalog's Studio: Hocuspocus, presence over Yjs awareness (see features/studio/hooks/use-studio-flow.ts) ----
const corePerson = async (index) => {
  const { HocuspocusProvider } = fromCore('@hocuspocus/provider');
  const Y = fromCore('yjs');
  const doc = new Y.Doc();
  const counts = {
    sent: 0,
    sentBytes: 0,
    received: 0,
    receivedBytes: 0,
    drops: 0,
  };
  const origin = new URL(link).origin;
  // Count what goes over the socket (Hocuspocus multiplexes documents on one; there's one here)
  class CountingSocket extends WebSocket {
    constructor(url, protocols) {
      super(url, protocols);
      this.addEventListener('message', ({ data }) => {
        counts.received++;
        counts.receivedBytes += data.byteLength ?? data.size ?? data.length ?? 0;
      });
    }
    send(data) {
      counts.sent++;
      counts.sentBytes += data.byteLength ?? data.length ?? 0;
      super.send(data);
    }
  }
  const provider = new HocuspocusProvider({
    url: `${origin.replace(/^http/, 'ws')}/_eventcatalog/studio`,
    name: `design:${canvasId}`,
    document: doc,
    WebSocketPolyfill: CountingSocket,
  });
  await new Promise((resolve, reject) => {
    provider.on('synced', resolve);
    setTimeout(() => reject(new Error('Not synced in 10s (is sign-in on?)')), 10_000);
  });
  const { awareness } = provider;
  awareness.setLocalStateField('user', {
    name: `Peer ${index + 1}`,
    color: COLORS[index % COLORS.length],
  });
  return {
    counts,
    doc,
    nodes: () => doc.getMap('nodes'),
    pointerEvery: 33,
    move: (pointer, moving) => {
      awareness.setLocalState({
        ...awareness.getLocalState(),
        pointer,
        moving: moving ? Object.fromEntries(moving.map(({ id, x, y }) => [id, { x, y }])) : null,
        selection: moving ? moving.map(({ id }) => id) : [],
      });
    },
    leave: async () => {
      provider.destroy();
    },
  };
};

const people = [];
for (let i = 0; i < PEOPLE; i++) {
  people.push(await (room ? webPerson(i) : corePerson(i)));
  await wait(150);
}
await wait(1500);
const nodeIds = [...people[0].nodes().keys()].filter((id) => !['note', 'text'].includes(people[0].nodes().get(id)?.type));
if (!nodeIds.length) throw new Error('No nodes on the canvas (did the canvas sync?)');
console.error(
  `${PEOPLE} people on a canvas of ${nodeIds.length} nodes; ${DRAGGING} dragging, each dropping a node every ${DROP_EVERY || '∞'} ms`
);

const started = Date.now();
const timers = people.map((person, index) => {
  // Each drags their own node (from the middle of the list), and drops others now and then
  const dragged = index < DRAGGING ? nodeIds[Math.floor(nodeIds.length / 2) + index] : null;
  const home = dragged && { ...person.nodes().get(dragged).position };
  const phase = (index / PEOPLE) * Math.PI * 2;
  const tick = setInterval(() => {
    const t = (Date.now() - started) / 1000 + phase;
    const pointer = {
      x: Math.round(800 + Math.cos(t * 1.3) * 600),
      y: Math.round(600 + Math.sin(t * 1.7) * 400),
    };
    const moving = dragged && [
      {
        id: dragged,
        x: Math.round(home.x + Math.cos(t * 3) * 150),
        y: Math.round(home.y + Math.sin(t * 3) * 100),
      },
    ];
    void person.move(moving ? { x: moving[0].x + 40, y: moving[0].y + 20 } : pointer, moving);
  }, person.pointerEvery);
  const drop =
    DROP_EVERY > 0 &&
    setInterval(
      () => {
        const map = person.nodes();
        const id = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        if (id === dragged) return;
        const node = map.get(id);
        if (!node) return;
        person.doc.transact(() =>
          map.set(id, {
            ...node,
            position: {
              x: node.position.x + (Math.random() > 0.5 ? 20 : -20),
              y: node.position.y,
            },
          })
        );
        person.counts.drops++;
      },
      DROP_EVERY + index * 97
    );
  return [tick, drop];
});

await wait(SECONDS * 1000);
timers.flat().forEach((timer) => timer && clearInterval(timer));
// The dragged nodes go back where they were (dropping them where they are would be a change nobody made)
await Promise.all(people.map((person) => person.move(null, null)));
await wait(300);
const total = people.reduce(
  (sum, { counts }) => Object.fromEntries(Object.keys(counts).map((key) => [key, (sum[key] ?? 0) + counts[key]])),
  {}
);
const perPersonPerSecond = Object.fromEntries(
  Object.entries(total).map(([key, value]) => [key, Math.round(value / PEOPLE / SECONDS)])
);
console.log(
  JSON.stringify({
    people: PEOPLE,
    dragging: DRAGGING,
    dropEvery: DROP_EVERY,
    seconds: SECONDS,
    total,
    perPersonPerSecond,
  })
);
await Promise.all(people.map((person) => person.leave()));
setTimeout(() => process.exit(0), 300);
