import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({
  output: 'server' as 'server' | 'static',
  mcp: {} as { enabled?: boolean },
}));

vi.mock('../../../eventcatalog.config.js', () => ({ default: config }));

import { isEventCatalogMCPEnabled } from '../feature';

const originalScale = process.env.EVENTCATALOG_SCALE;

describe('MCP feature configuration', () => {
  beforeEach(() => {
    process.env.EVENTCATALOG_SCALE = 'true';
    config.output = 'server';
    config.mcp = {};
  });

  afterAll(() => {
    if (originalScale === undefined) {
      delete process.env.EVENTCATALOG_SCALE;
    } else {
      process.env.EVENTCATALOG_SCALE = originalScale;
    }
  });

  it('enables MCP by default in server mode with EventCatalog Scale', () => {
    expect(isEventCatalogMCPEnabled()).toBe(true);
  });

  it('disables MCP when mcp.enabled is false', () => {
    config.mcp.enabled = false;

    expect(isEventCatalogMCPEnabled()).toBe(false);
  });

  it('enables MCP when mcp.enabled is true', () => {
    config.mcp.enabled = true;

    expect(isEventCatalogMCPEnabled()).toBe(true);
  });

  it('does not enable MCP outside server mode', () => {
    config.output = 'static';

    expect(isEventCatalogMCPEnabled()).toBe(false);
  });

  it('does not enable MCP without EventCatalog Scale', () => {
    process.env.EVENTCATALOG_SCALE = 'false';

    expect(isEventCatalogMCPEnabled()).toBe(false);
  });
});
