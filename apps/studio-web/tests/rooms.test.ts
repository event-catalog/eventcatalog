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

/** Someone opening the room from the page (its origin), from an address (as Fly passes it on), on a protocol version */
const connect = (address = '203.0.113.7', version: 1 | 2 = 1) =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${port}/rooms/${ROOM}${version === 2 ? '?v=2' : ''}`, {
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

  describe('addressed messages (version 2)', () => {
    const LIMITS = { connectionsPerAddress: 10, burstBytes: 1024 * 1024, bytesPerSecond: 1024 * 1024 };
    /** A message as version 2 sends it: who it's for (0: everyone), then the message */
    const to = (id: number, message: Buffer) => {
      const header = Buffer.alloc(4);
      header.writeUInt32BE(id);
      return Buffer.concat([header, message]);
    };
    /** Everything a socket receives */
    const inbox = (socket: WebSocket) => {
      const messages: Buffer[] = [];
      socket.on('message', (data: Buffer) => messages.push(data));
      return messages;
    };

    it('tells version 2 who sent a message (and their version), and version 1 just the message', async () => {
      await start(LIMITS);
      const [alice, bob, before] = [await connect('203.0.113.1', 2), await connect('203.0.113.2', 2), await connect('203.0.113.3', 1)];
      const [bobGot, beforeGot] = [inbox(bob), inbox(before)];
      alice.send(to(0, Buffer.from('hello')));
      await settle();

      expect(bobGot).toHaveLength(1);
      expect(bobGot[0].readUInt32BE(0)).toBeGreaterThan(0);
      expect(bobGot[0][4]).toBe(2);
      expect(bobGot[0].subarray(5).toString()).toBe('hello');
      expect(beforeGot.map(String)).toEqual(['hello']);
    });

    it('passes a message for one person to them alone', async () => {
      await start(LIMITS);
      const [alice, bob, carol] = [await connect('203.0.113.1', 2), await connect('203.0.113.2', 2), await connect('203.0.113.3', 2)];
      const [aliceGot, carolGot] = [inbox(alice), inbox(carol)];
      // Bob says hello to everyone: Alice learns his id from it
      bob.send(to(0, Buffer.from('hello')));
      await settle();
      const bobId = aliceGot[0].readUInt32BE(0);
      carolGot.length = 0;

      alice.send(to(bobId, Buffer.from('just for bob')));
      const bobGot = inbox(bob);
      await settle();
      expect(bobGot.map((message) => message.subarray(5).toString())).toEqual(['just for bob']);
      expect(carolGot).toHaveLength(0);
    });

    it('sends a message for someone who has left (or never was) to nobody', async () => {
      await start(LIMITS);
      const [alice, bob] = [await connect('203.0.113.1', 2), await connect('203.0.113.2', 2)];
      const bobGot = inbox(bob);
      alice.send(to(12345, Buffer.from('anyone?')));
      await settle();
      expect(bobGot).toHaveLength(0);
    });

    it('passes version 1 messages to version 2 as from version 1', async () => {
      await start(LIMITS);
      const [before, alice] = [await connect('203.0.113.1', 1), await connect('203.0.113.2', 2)];
      const aliceGot = inbox(alice);
      before.send(Buffer.from('from before'));
      await settle();
      expect(aliceGot[0][4]).toBe(1);
      expect(aliceGot[0].subarray(5).toString()).toBe('from before');
    });
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
