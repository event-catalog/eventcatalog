import { afterEach, describe, it, expect, vi } from 'vitest';
import * as feature from '@utils/feature';
import { getStudioRuntime } from '../server/runtime';
import { getSignedInUser } from '../server/sign-in';

vi.mock('@utils/auth-astro/server', () => ({ getSession: vi.fn() }));

const RUNTIME_KEY = Symbol.for('eventcatalog.studio.runtime');
afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
});

describe('Studio sign-in', () => {
  it('shows you by the name you signed in with, or your email when there is none', () => {
    expect(getSignedInUser({})).toBeUndefined();
    expect(getSignedInUser({ user: { name: 'Sam Doe', email: 'sam@example.com' } })).toEqual({ name: 'Sam Doe' });
    expect(getSignedInUser({ user: { email: 'sam@example.com' } })).toEqual({ name: 'sam@example.com' });
  });

  it("uses the provider's picture (Auth.js calls it image), over HTTPS only", () => {
    expect(getSignedInUser({ user: { name: 'Sam', picture: 'https://cdn.example.com/sam.png' } })).toEqual({
      name: 'Sam',
      picture: 'https://cdn.example.com/sam.png',
    });
    expect(getSignedInUser({ user: { name: 'Sam', raw: { user: { image: 'https://cdn.example.com/sam.png' } } } })).toEqual({
      name: 'Sam',
      picture: 'https://cdn.example.com/sam.png',
    });
    expect(getSignedInUser({ user: { name: 'Sam', picture: 'http://cdn.example.com/sam.png' } })).toEqual({ name: 'Sam' });
    expect(getSignedInUser({ user: { name: 'Sam', picture: 'javascript:alert(1)' } })).toEqual({ name: 'Sam' });
  });

  describe('the collaboration connection', () => {
    const connect = (cookie?: string) =>
      getStudioRuntime().server.hocuspocus.hooks('onConnect', {
        request: new Request('http://localhost/_eventcatalog/studio', { headers: cookie ? { cookie } : {} }),
      } as never);

    it('lets anyone connect when sign-in is off', async () => {
      vi.spyOn(feature, 'isAuthEnabled').mockReturnValue(false);
      await expect(connect()).resolves.not.toThrow();
    });

    it('with sign-in on, lets in only signed-in people', async () => {
      vi.spyOn(feature, 'isAuthEnabled').mockReturnValue(true);
      getStudioRuntime().useSignIn(async (request) => request.headers.get('cookie') === 'session=yes');
      await expect(connect('session=yes')).resolves.not.toThrow();
      await expect(connect()).rejects.toThrow(/Sign in/);
    });

    it('with sign-in on, refuses everyone until the pages have said how to tell who is signed in', async () => {
      vi.spyOn(feature, 'isAuthEnabled').mockReturnValue(true);
      await expect(connect('session=yes')).rejects.toThrow(/Sign in/);
    });

    it('refuses a connection when checking the session fails', async () => {
      vi.spyOn(feature, 'isAuthEnabled').mockReturnValue(true);
      getStudioRuntime().useSignIn(() => Promise.reject(new Error('Auth.js is down')));
      await expect(connect('session=yes')).rejects.toThrow(/Sign in/);
    });
  });
});
