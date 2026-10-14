/**
 * Live rooms: a relay for people working on the same canvas. Each browser encrypts what it sends (canvas changes,
 * cursors) with the room's key, which is in the link's fragment and never reaches this server; here, messages are
 * passed from each person in a room to everyone else in it, or to one of them, as they are. Nothing is stored: a room
 * is only the people connected to it, and they catch each other up when someone joins (see view/collab/room.ts).
 *
 * Each connection has a random id in its room. Browsers connecting with `?v=2` address what they send and are told who
 * sent what they receive, so a join is answered to the joiner alone (one canvas, not one from everyone to everyone):
 * - what they send: who it's for (4 bytes, big-endian; 0 for everyone in the room), then the encrypted message
 * - what they receive: who sent it (4 bytes) and the version that person connected with (1 byte), then the message
 * Pages open from before (no `?v=2`) send and receive the encrypted messages alone, to and from everyone.
 */
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import crypto from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { capture } from './analytics';
import { durationBucket, sizeBucket } from './lib/stats';

/** Rooms are reached at /rooms/<id>: a random id from the browser that made the room */
const ROOM_PATH = /^\/rooms\/([A-Za-z0-9_-]{16,64})$/;
/** The biggest message: a whole canvas, sent to someone joining (encrypted, so it doesn't compress) */
const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;
/** Who a message is for, before it (from browsers on version 2) */
const TO_BYTES = 4;
/** Who sent a message and the version they're on, before it (to browsers on version 2) */
const FROM_BYTES = 5;
const MAX_PEOPLE_PER_ROOM = 50;
const MAX_ROOMS = 5_000;
/** Messages a person can send a second (cursors are sent as they move, a few times a second) */
const MAX_MESSAGES_PER_SECOND = 60;
/** Someone can't keep up (a slow connection): what's waiting to be sent to them before they're dropped */
const MAX_BUFFERED_BYTES = 16 * 1024 * 1024;
/** Pinged this often, so idle connections aren't closed by proxies (Fly's closes them after a minute) */
const HEARTBEAT_MS = 25_000;

/**
 * What one address (an IP) and one connection can use, so nobody can take the relay's memory or bandwidth: the
 * origin check only stops other sites' pages, not a script. Connections from one address: a workshop behind one
 * office network fits. Bytes a connection sends: a burst (a whole canvas, to someone joining, is at most
 * MAX_MESSAGE_BYTES), then a steady rate; more is dropped, as messages over the rate are.
 */
export type RelayLimits = { connectionsPerAddress: number; burstBytes: number; bytesPerSecond: number };
const LIMITS: RelayLimits = { connectionsPerAddress: 30, burstBytes: 16 * 1024 * 1024, bytesPerSecond: 2 * 1024 * 1024 };

type Person = WebSocket & {
  /** Who they are in their room (random, never 0: that's everyone) */
  id: number;
  /** 2: addresses what it sends and is told who sent what it gets; 1: pages open from before */
  version: 1 | 2;
  alive?: boolean;
  sent?: { second: number; count: number };
  /** Bytes it can still send now (refilled at bytesPerSecond, up to burstBytes), and when that was worked out */
  budget?: { bytes: number; at: number };
};

/**
 * A room's life, for analytics: how long it lasted, the most people in it at once, how much they sent, and how many
 * messages were dropped (over the rate limit). Under a random id of its own: never the room's (nor anything in it)
 */
type RoomStats = { analyticsId: string; opened: number; peak: number; messages: number; dropped: number };
const roomClosed = ({ analyticsId, opened, peak, messages, dropped }: RoomStats) => {
  const ms = Date.now() - opened;
  capture('live_room_closed', analyticsId, {
    surface: 'relay',
    peak_people: peak,
    duration_ms: ms,
    duration_bucket: durationBucket(ms),
    messages: sizeBucket(messages),
    dropped_messages: sizeBucket(dropped),
  });
};
const refused = (reason: string) => capture('live_room_refused', crypto.randomUUID(), { surface: 'relay', reason });

const refuse = (socket: Duplex, status: number, reason: string) => {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
};

/** The browser page connecting is this server's own (the view), not another site using it as a relay */
const isOwnPage = (request: IncomingMessage) => {
  const origin = request.headers.origin;
  if (!origin) return false;
  try {
    const host = new URL(origin).host;
    const forwarded = request.headers['x-forwarded-host'];
    return host === request.headers.host || host === forwarded || (process.env.PUBLIC_URL && host === new URL(process.env.PUBLIC_URL).host);
  } catch {
    return false;
  }
};

/** Where a connection comes from: the visitor's address behind Fly's proxy, else the socket's */
const addressOf = (request: IncomingMessage) => {
  const fly = request.headers['fly-client-ip'];
  return (Array.isArray(fly) ? fly[0] : fly) ?? request.socket.remoteAddress ?? 'unknown';
};

export function attachRooms(server: Server, limits: RelayLimits = LIMITS) {
  const relay = new WebSocketServer({ noServer: true, maxPayload: TO_BYTES + MAX_MESSAGE_BYTES, perMessageDeflate: false });
  const rooms = new Map<string, Map<number, Person>>();
  const roomStats = new Map<string, RoomStats>();
  const connections = new Map<string, number>();

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const id = ROOM_PATH.exec(url.pathname)?.[1];
    if (!id) return refuse(socket, 404, 'Not Found');
    if (!isOwnPage(request)) return (refused('other_site'), refuse(socket, 403, 'Forbidden'));
    const room = rooms.get(id);
    if (!room && rooms.size >= MAX_ROOMS) return (refused('too_many_rooms'), refuse(socket, 503, 'Service Unavailable'));
    if (room && room.size >= MAX_PEOPLE_PER_ROOM) return (refused('room_full'), refuse(socket, 503, 'Service Unavailable'));
    const address = addressOf(request);
    if ((connections.get(address) ?? 0) >= limits.connectionsPerAddress) return (refused('too_many_connections'), refuse(socket, 429, 'Too Many Requests'));
    // Counted once it's open (a handshake that fails never is)
    relay.handleUpgrade(request, socket, head, (connection) => {
      const person = Object.assign(connection, { id: 0, version: url.searchParams.get('v') === '2' ? 2 : 1 }) as Person;
      connections.set(address, (connections.get(address) ?? 0) + 1);
      person.on('close', () => {
        const left = (connections.get(address) ?? 1) - 1;
        if (left > 0) connections.set(address, left);
        else connections.delete(address);
      });
      join(id, person);
    });
  });

  /** Whether a person can send this many bytes now (and takes them from their budget if so) */
  const spend = (person: Person, bytes: number) => {
    const now = Date.now();
    const budget = person.budget ?? { bytes: limits.burstBytes, at: now };
    budget.bytes = Math.min(limits.burstBytes, budget.bytes + ((now - budget.at) / 1000) * limits.bytesPerSecond);
    budget.at = now;
    person.budget = budget;
    if (budget.bytes < bytes) return false;
    budget.bytes -= bytes;
    return true;
  };

  /** Sends to one person, unless they can't keep up (then they're dropped, and reconnect to catch up) */
  const deliver = (person: Person, data: Buffer) => {
    if (person.readyState !== person.OPEN) return;
    if (person.bufferedAmount > MAX_BUFFERED_BYTES) person.terminate();
    else person.send(data, { binary: true });
  };

  const join = (id: string, person: Person) => {
    const room = rooms.get(id) ?? new Map<number, Person>();
    rooms.set(id, room);
    do person.id = crypto.randomInt(1, 2 ** 32);
    while (room.has(person.id));
    room.set(person.id, person);
    let stats = roomStats.get(id);
    if (!stats) roomStats.set(id, (stats = { analyticsId: crypto.randomUUID(), opened: Date.now(), peak: 0, messages: 0, dropped: 0 }));
    stats.peak = Math.max(stats.peak, room.size);
    person.alive = true;
    person.on('pong', () => (person.alive = true));

    person.on('message', (data, isBinary) => {
      // Only the browsers' encrypted messages, at a person's pace
      if (!isBinary) return;
      const second = Math.floor(Date.now() / 1000);
      const sent = person.sent?.second === second ? person.sent : (person.sent = { second, count: 0 });
      if (++sent.count > MAX_MESSAGES_PER_SECOND) return void stats.dropped++;
      const frame = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (!spend(person, frame.length)) return void stats.dropped++;
      // Who it's for (version 2 says; 0 is everyone), and the message itself
      if (person.version === 2 && frame.length < TO_BYTES) return void stats.dropped++;
      const to = person.version === 2 ? frame.readUInt32BE(0) : 0;
      const message = person.version === 2 ? frame.subarray(TO_BYTES) : frame;
      stats.messages++;
      // As version 2 receives it: who sent it first (made once, whoever it goes to)
      let withSender: Buffer | undefined;
      const send = (other: Person) => {
        if (other.version === 1) return deliver(other, message);
        if (!withSender) {
          withSender = Buffer.allocUnsafe(FROM_BYTES + message.length);
          withSender.writeUInt32BE(person.id, 0);
          withSender.writeUInt8(person.version, 4);
          message.copy(withSender, FROM_BYTES);
        }
        deliver(other, withSender);
      };
      if (to) {
        // Someone who's left (or never was) gets nothing
        const other = room.get(to);
        if (other && other !== person) send(other);
        return;
      }
      for (const other of room.values()) if (other !== person) send(other);
    });

    person.on('close', () => {
      room.delete(person.id);
      if (room.size) return;
      rooms.delete(id);
      roomClosed(stats);
      roomStats.delete(id);
    });
    person.on('error', () => person.terminate());
  };

  // Connections that stopped answering are closed; the rest are kept open through proxies
  const heartbeat = setInterval(() => {
    for (const person of relay.clients as Set<Person>) {
      if (!person.alive) {
        person.terminate();
        continue;
      }
      person.alive = false;
      person.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  // How busy it is, never what's in it
  const stats = setInterval(() => {
    if (rooms.size) console.log(JSON.stringify({ at: 'rooms', rooms: rooms.size, people: relay.clients.size }));
  }, 300_000);
  stats.unref();

  return { rooms };
}
