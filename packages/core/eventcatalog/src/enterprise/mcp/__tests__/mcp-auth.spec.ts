/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  createWwwAuthenticateHeader,
  getMcpProtectedResourceMetadata,
  type McpAuthConfig,
  validateMcpRequest,
} from '../mcp-auth';

const authConfig: McpAuthConfig = {
  enabled: true,
  resource: 'https://catalog.example.com/docs/mcp',
  authorizationServers: ['https://auth.example.com'],
  issuer: 'https://auth.example.com',
  audience: 'https://catalog.example.com/docs/mcp',
  requiredScopes: ['catalog:read'],
  sharedSecret: 'test-secret',
};

const createRequest = (token?: string) =>
  new Request('https://catalog.example.com/docs/mcp', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

const createToken = (overrides: Partial<McpAuthConfig> = {}, payload: Record<string, unknown> = {}) =>
  jwt.sign({ scope: 'catalog:read', ...payload }, authConfig.sharedSecret!, {
    issuer: overrides.issuer ?? authConfig.issuer,
    audience: overrides.audience ?? authConfig.audience,
    expiresIn: '1h',
  });

describe('MCP OAuth protected resource metadata', () => {
  it('returns undefined when MCP auth is disabled', () => {
    const request = createRequest();
    expect(getMcpProtectedResourceMetadata(request, { enabled: false })).toBeUndefined();
  });

  it('returns protected resource metadata for MCP clients', () => {
    const request = createRequest();

    expect(getMcpProtectedResourceMetadata(request, authConfig)).toEqual({
      resource: 'https://catalog.example.com/docs/mcp',
      authorization_servers: ['https://auth.example.com'],
      scopes_supported: ['catalog:read'],
    });
  });
});

describe('MCP Bearer token validation', () => {
  it('allows requests when MCP auth is disabled', async () => {
    const result = await validateMcpRequest(createRequest(), { enabled: false });
    expect(result.ok).toBe(true);
  });

  it('returns a 401 challenge when the Bearer token is missing', async () => {
    const result = await validateMcpRequest(createRequest(), authConfig);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.status).toBe(401);
    expect(createWwwAuthenticateHeader(result)).toContain(
      'resource_metadata="https://catalog.example.com/.well-known/oauth-protected-resource"'
    );
    expect(createWwwAuthenticateHeader(result)).toContain('scope="catalog:read"');
  });

  it('accepts a valid JWT access token', async () => {
    const token = createToken();
    const result = await validateMcpRequest(createRequest(token), authConfig);

    expect(result.ok).toBe(true);
  });

  it('accepts the Bearer scheme regardless of case', async () => {
    const token = createToken();
    const lowercase = new Request('https://catalog.example.com/docs/mcp', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}` },
    });
    const mixedCase = new Request('https://catalog.example.com/docs/mcp', {
      method: 'POST',
      headers: { Authorization: `BeArEr ${token}` },
    });

    expect((await validateMcpRequest(lowercase, authConfig)).ok).toBe(true);
    expect((await validateMcpRequest(mixedCase, authConfig)).ok).toBe(true);
  });

  it('rejects a token with the wrong audience', async () => {
    const token = createToken({ audience: 'https://api.github.com' });
    const result = await validateMcpRequest(createRequest(token), authConfig);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.status).toBe(401);
    expect(result.error).toBe('invalid_token');
  });

  it('returns 403 when the token is valid but missing required scopes', async () => {
    const token = createToken({}, { scope: 'profile:read' });
    const result = await validateMcpRequest(createRequest(token), authConfig);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.status).toBe(403);
    expect(result.error).toBe('insufficient_scope');
  });
});
