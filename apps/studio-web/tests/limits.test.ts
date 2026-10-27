import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMcpRateLimits } from '../src/lib/limits';

describe("the MCP endpoint's rate limits", () => {
  afterEach(() => vi.useRealTimers());

  it('allow a caller 60 requests a minute, unless the server is started with more (the browser tests)', () => {
    const count = (limits: ReturnType<typeof createMcpRateLimits>) =>
      Array.from({ length: 100 }, () => limits({ ip: '10.0.0.9', client: 'curl' })).filter((refused) => !refused).length;
    expect(count(createMcpRateLimits())).toBe(60);
    vi.stubEnv('MCP_REQUESTS_PER_MINUTE', '80');
    try {
      expect(count(createMcpRateLimits())).toBe(80);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('count per address: a different user agent never gets another quota', () => {
    const limited = createMcpRateLimits();
    for (let i = 0; i < 60; i++) expect(limited({ ip: '203.0.113.7', client: `agent-${i}` })).toBeUndefined();
    expect(limited({ ip: '203.0.113.7', client: 'yet-another' })).toMatch(/Rate limit/);
    // Another address has its own
    expect(limited({ ip: '198.51.100.1', client: 'agent-0' })).toBeUndefined();
  });

  it("give a chat host's requests their own, higher limits, still per address", () => {
    const limited = createMcpRateLimits();
    for (let i = 0; i < 60; i++) limited({ ip: '203.0.113.7', client: 'curl' });
    expect(limited({ ip: '203.0.113.7', client: 'curl' })).toMatch(/Rate limit/);
    for (let i = 0; i < 600; i++) expect(limited({ ip: '203.0.113.7', client: 'openai-mcp' })).toBeUndefined();
    expect(limited({ ip: '203.0.113.7', client: 'openai-mcp' })).toMatch(/Rate limit/);
  });

  it("count an open diagram's waits per diagram, never against its address", () => {
    vi.useFakeTimers({ now: new Date('2026-10-21T10:00:00Z') });
    const limited = createMcpRateLimits();
    // A day of waits from many diagrams, through one host's address: none turned down
    for (let diagram = 0; diagram < 50; diagram++)
      for (let i = 0; i < 100; i++) expect(limited({ ip: '203.0.113.7', client: 'openai-mcp', waitingOn: `d${diagram}` })).toBeUndefined();
    // Nor do they count against what that address can do otherwise
    expect(limited({ ip: '203.0.113.7', client: 'openai-mcp' })).toBeUndefined();
    // One diagram waiting far more often than a view does is turned down
    for (let i = 0; i < 20; i++) limited({ ip: '203.0.113.7', client: 'openai-mcp', waitingOn: 'd0' });
    expect(limited({ ip: '203.0.113.7', client: 'openai-mcp', waitingOn: 'd0' })).toMatch(/Rate limit/);
  });

  it("keep the waits from one address under a ceiling, however many diagrams they're for", () => {
    vi.useFakeTimers({ now: new Date('2026-10-21T10:00:00Z') });
    const limited = createMcpRateLimits();
    for (let i = 0; i < 6_000; i++) expect(limited({ ip: '203.0.113.7', client: 'curl', waitingOn: `d${i}` })).toBeUndefined();
    expect(limited({ ip: '203.0.113.7', client: 'curl', waitingOn: 'another' })).toMatch(/Rate limit/);
    // Another address has its own
    expect(limited({ ip: '198.51.100.1', client: 'curl', waitingOn: 'another' })).toBeUndefined();
  });
});
