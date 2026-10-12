import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { attachRooms, type RelayLimits } from '../src/rooms';

const ROOM = 'abcdefghijklmnopqrstuv';
let server: Server;
let port: number;
let sockets: WebSocket[] = [];

const start = async (limits: RelayLimits) => {
  server = createServer();
  attachRooms(server, limits);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  port = (server.address() as AddressInfo).port;
};

/** Someone opening the room from the page (its origin), from an address (as Fly passes it on) */
const connect = (address = '203.0.113.7') =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${port}/rooms/${ROOM}`, {
      headers: { origin: `http://localhost:${port}`, 'fly-client-ip': address },
    });
    sockets.push(socket);
    socket.once('open', () => resolve(socket));
    socket.once('unexpected-response', (_, response) => reject(new Error(String(response.statusCode))));
    socket.once('error', reject);
  });

/** What one person receives, in bytes, after the others have sent */
const received = (socket: WebSocket) => {
  let bytes = 0;
  socket.on('message', (data: Buffer) => (bytes += data.length));
  return () => bytes;
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

beforeEach(() => {
  sockets = [];
});
afterEach(async () => {
  // (One still connecting, e.g. refused, says so as it's closed)
  sockets.forEach((socket) => socket.on('error', () => {}).terminate());
  await new Promise((resolve) => server.close(resolve));
});

describe('the live rooms relay', () => {
  it('passes what one person sends to the others in the room', async () => {
    await start({ connectionsPerAddress: 10, burstBytes: 1024 * 1024, bytesPerSecond: 1024 * 1024 });
    const [alice, bob] = [await connect(), await connect('198.51.100.2')];
    const bobGot = received(bob);
    alice.send(Buffer.alloc(100));
    await settle();
    expect(bobGot()).toBe(100);
  });

  it('refuses another connection from an address that has too many open, and takes one when one closes', async () => {
    await start({ connectionsPerAddress: 2, burstBytes: 1024, bytesPerSecond: 1024 });
    const first = await connect();
    await connect();
    await expect(connect()).rejects.toThrow('429');
    // Someone else is still let in
    await expect(connect('198.51.100.2')).resolves.toBeTruthy();
    first.close();
    await settle();
    await expect(connect()).resolves.toBeTruthy();
  });

  it("drops what a connection sends over its byte budget, and lets it send again as the budget refills", async () => {
    await start({ connectionsPerAddress: 10, burstBytes: 1000, bytesPerSecond: 1000 });
    const [sender, other] = [await connect(), await connect('198.51.100.2')];
    const otherGot = received(other);
    for (let i = 0; i < 5; i++) sender.send(Buffer.alloc(400));
    await settle();
    // 1000 bytes of burst: two 400-byte messages get through (and a little has refilled meanwhile)
    expect(otherGot()).toBe(800);
    await new Promise((resolve) => setTimeout(resolve, 600));
    sender.send(Buffer.alloc(400));
    await settle();
    expect(otherGot()).toBe(1200);
  });

  it('refuses pages from other sites', async () => {
    await start({ connectionsPerAddress: 10, burstBytes: 1024, bytesPerSecond: 1024 });
    const elsewhere = new WebSocket(`ws://localhost:${port}/rooms/${ROOM}`, { headers: { origin: 'https://example.com' } });
    sockets.push(elsewhere);
    await expect(
      new Promise((resolve, reject) => {
        elsewhere.once('open', resolve);
        elsewhere.once('unexpected-response', (_, response) => reject(new Error(String(response.statusCode))));
      })
    ).rejects.toThrow('403');
  });
});
