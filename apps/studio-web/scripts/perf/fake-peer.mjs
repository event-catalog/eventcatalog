#!/usr/bin/env node
// A pretend person in a live session, to measure what someone else's pointer costs a canvas: it joins the room in a
// session link and moves its pointer in circles, sending presence about 30 times a second (as a real canvas sends
// its cursor at most every 50 ms, this is more than a real person sends).
//
//   node scripts/perf/fake-peer.mjs '<session link with #room=id,key>' [seconds] [drag=<node id>@<x>,<y>[@L2] | listen]
//
// drag=… also drags that node in circles around x,y (its position, relative to its container), as someone dragging
// it would show it; listen prints what the others' presence says they're dragging (to check a canvas sends it).
import WebSocket from 'ws';

const [link, seconds = '30', mode = ''] = process.argv.slice(2);
const drag = /^drag=([^@]+)@(-?[\d.]+),(-?[\d.]+)(?:@L([12]))?$/.exec(mode);
const listening = mode === 'listen';
const match = /room=([A-Za-z0-9_-]+),([A-Za-z0-9_-]+)/.exec(link ?? '');
if (!match) throw new Error("Usage: node fake-peer.mjs '<link with #room=id,key>' [seconds]");
const [, roomId, keyText] = match;
const origin = new URL(link).origin;
const PRESENCE = 3;
const BYE = 4;

const fromBase64Url = (text) => Uint8Array.from(Buffer.from(text.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
const key = await crypto.subtle.importKey('raw', fromBase64Url(keyText), 'AES-GCM', false, ['encrypt', 'decrypt']);
const seal = async (type, body) => {
  const plain = new Uint8Array(body.length + 1);
  plain[0] = type;
  plain.set(body, 1);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const frame = new Uint8Array(iv.length + sealed.length);
  frame.set(iv);
  frame.set(sealed, iv.length);
  return frame;
};

const socket = new WebSocket(`${origin.replace(/^http/, 'ws')}/rooms/${roomId}`, { headers: { Origin: origin } });
await new Promise((resolve, reject) => {
  socket.once('open', resolve);
  socket.once('error', reject);
});
const me = { id: crypto.randomUUID(), name: 'Perf Peer', color: '#0ea5e9', cursor: null, at: Date.now() };
// What the others say they're dragging
const heard = { presence: 0, moving: 0, dropped: 0, lastMoving: null };
if (listening)
  socket.on('message', async (data) => {
    const frame = new Uint8Array(data);
    try {
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: frame.slice(0, 12) }, key, frame.slice(12)));
      if (plain[0] !== PRESENCE) return;
      const peer = JSON.parse(new TextDecoder().decode(plain.slice(1)));
      heard.presence++;
      if (peer.moving?.length) (heard.moving++, (heard.lastMoving = peer.moving));
      else if (heard.lastMoving) (heard.dropped++, (heard.lastMoving = null));
    } catch {}
  });
const started = Date.now();
let sent = 0;
const timer = setInterval(async () => {
  const t = (Date.now() - started) / 1000;
  me.cursor = { x: Math.round(400 + Math.cos(t * 2) * 300), y: Math.round(300 + Math.sin(t * 2) * 200) };
  if (drag)
    me.moving = [
      {
        id: drag[1],
        x: Math.round(Number(drag[2]) + Math.cos(t * 3) * 150),
        y: Math.round(Number(drag[3]) + Math.sin(t * 3) * 100),
        ...(drag[4] && { level: Number(drag[4]) }),
      },
    ];
  socket.send(await seal(PRESENCE, new TextEncoder().encode(JSON.stringify(me))));
  sent++;
}, 33);
setTimeout(async () => {
  clearInterval(timer);
  // Dropped (without saving it: it goes back to where it was)
  me.moving = null;
  socket.send(await seal(PRESENCE, new TextEncoder().encode(JSON.stringify(me))));
  socket.send(await seal(BYE, new TextEncoder().encode(JSON.stringify({ id: me.id }))));
  console.log(JSON.stringify({ sent, seconds: Number(seconds), ...(listening && { heard }) }));
  setTimeout(() => process.exit(0), 200);
}, Number(seconds) * 1000);
