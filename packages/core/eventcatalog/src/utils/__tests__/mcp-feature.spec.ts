import { beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({
  output: 'server' as 'server' | 'static',
  mcp: {} as { enabled?: boolean },
}));

vi.mock('../eventcatalog-config/source', () => ({ default: config }));

import { isEventCatalogMCPEnabled } from '../feature';

describe('MCP feature configuration', () => {
  beforeEach(() => {
    config.output = 'server';
    config.mcp = {};
  });

  it('enables MCP by default in server mode', () => {
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
});
