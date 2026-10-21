import { describe, expect, it } from 'vitest';
import { createMcpRateLimits } from '../src/lib/limits';

describe("the MCP endpoint's rate limits", () => {
  it('count per address: a different user agent never gets another quota', () => {
    const limited = createMcpRateLimits();
    for (let i = 0; i < 60; i++) expect(limited({ ip: '203.0.113.7', client: `agent-${i}`, waiting: false })).toBeUndefined();
    expect(limited({ ip: '203.0.113.7', client: 'yet-another', waiting: false })).toMatch(/Rate limit/);
    // Another address has its own
    expect(limited({ ip: '198.51.100.1', client: 'agent-0', waiting: false })).toBeUndefined();
  });

  it("give a chat host's requests their own, higher limits, still per address", () => {
    const limited = createMcpRateLimits();
    for (let i = 0; i < 60; i++) limited({ ip: '203.0.113.7', client: 'curl', waiting: false });
    expect(limited({ ip: '203.0.113.7', client: 'curl', waiting: false })).toMatch(/Rate limit/);
    for (let i = 0; i < 600; i++) expect(limited({ ip: '203.0.113.7', client: 'openai-mcp', waiting: false })).toBeUndefined();
    expect(limited({ ip: '203.0.113.7', client: 'openai-mcp', waiting: false })).toMatch(/Rate limit/);
  });
});
