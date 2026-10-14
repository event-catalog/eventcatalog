/**
 * Live rooms: a relay for people working on the same canvas. Each browser encrypts what it sends (canvas changes,
 * cursors) with the room's key, which is in the link's fragment and never reaches this server; here, messages are
 * passed from each person in a room to everyone else in it, as they are. Nothing is stored: a room is only the people
 * connected to it, and they catch each other up when someone joins (see view/collab/room.ts).
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
  const relay = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES, perMessageDeflate: false });
  const rooms = new Map<string, Set<Person>>();
  const roomStats = new Map<string, RoomStats>();
  const connections = new Map<string, number>();

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const id = ROOM_PATH.exec(new URL(request.url ?? '/', 'http://localhost').pathname)?.[1];
    if (!id) return refuse(socket, 404, 'Not Found');
    if (!isOwnPage(request)) return (refused('other_site'), refuse(socket, 403, 'Forbidden'));
    const room = rooms.get(id);
    if (!room && rooms.size >= MAX_ROOMS) return (refused('too_many_rooms'), refuse(socket, 503, 'Service Unavailable'));
    if (room && room.size >= MAX_PEOPLE_PER_ROOM) return (refused('room_full'), refuse(socket, 503, 'Service Unavailable'));
    const address = addressOf(request);
    if ((connections.get(address) ?? 0) >= limits.connectionsPerAddress) return (refused('too_many_connections'), refuse(socket, 429, 'Too Many Requests'));
    // Counted once it's open (a handshake that fails never is)
    relay.handleUpgrade(request, socket, head, (person: Person) => {
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

  const join = (id: string, person: Person) => {
    const room = rooms.get(id) ?? new Set<Person>();
    rooms.set(id, room);
    room.add(person);
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
      const bytes = Array.isArray(data) ? data.reduce((sum, part) => sum + part.length, 0) : (data as Buffer | ArrayBuffer).byteLength;
      if (!spend(person, bytes)) return void stats.dropped++;
      stats.messages++;
      for (const other of room) {
        if (other === person || other.readyState !== other.OPEN) continue;
        if (other.bufferedAmount > MAX_BUFFERED_BYTES) other.terminate();
        else other.send(data, { binary: true });
      }
    });

    person.on('close', () => {
      room.delete(person);
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
