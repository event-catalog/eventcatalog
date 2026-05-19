/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import jwt, { type Algorithm, type JwtPayload } from 'jsonwebtoken';
import { createPublicKey, type JsonWebKey, type KeyObject } from 'node:crypto';
import config from '../../../eventcatalog.config.js';
import type { Config } from '../../../../src/eventcatalog.config';

type ConfiguredMcpAuth = NonNullable<NonNullable<Config['mcp']>['auth']>;

export type McpAuthConfig = ConfiguredMcpAuth;

type TokenClaims = JwtPayload & {
  scope?: string;
  scp?: string[];
};

type JwksKey = JsonWebKey & {
  kid?: string;
};

type AuthFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
  description: string;
  requiredScopes: string[];
  metadataUrl: string;
};

export type McpAuthResult =
  | {
      ok: true;
      claims?: TokenClaims;
    }
  | AuthFailure;

const jwksCache = new Map<string, { expiresAt: number; keys: JwksKey[] }>();

const quote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export const getMcpAuthConfig = (): McpAuthConfig | undefined => config?.mcp?.auth;

export const isMcpAuthEnabled = (
  authConfig: McpAuthConfig | undefined = getMcpAuthConfig()
): authConfig is McpAuthConfig & { enabled: true } => authConfig?.enabled === true;

export function getMcpResourceUrl(request: Request, authConfig: McpAuthConfig | undefined = getMcpAuthConfig()) {
  if (authConfig?.resource) return authConfig.resource;
  return new URL('/docs/mcp', request.url).href;
}

export function getMcpProtectedResourceMetadataUrl(request: Request, authConfig: McpAuthConfig | undefined = getMcpAuthConfig()) {
  if (authConfig?.protectedResourceMetadataUrl) return authConfig.protectedResourceMetadataUrl;
  return new URL('/.well-known/oauth-protected-resource', request.url).href;
}

export function getMcpRequiredScopes(authConfig: McpAuthConfig | undefined = getMcpAuthConfig()) {
  return authConfig?.requiredScopes ?? [];
}

export function getMcpProtectedResourceMetadata(request: Request, authConfig: McpAuthConfig | undefined = getMcpAuthConfig()) {
  if (!isMcpAuthEnabled(authConfig)) return undefined;

  return {
    resource: getMcpResourceUrl(request, authConfig),
    authorization_servers: authConfig?.authorizationServers ?? [],
    scopes_supported: getMcpRequiredScopes(authConfig),
  };
}

export function createWwwAuthenticateHeader(failure: AuthFailure) {
  const params = [
    `realm=${quote('mcp')}`,
    `resource_metadata=${quote(failure.metadataUrl)}`,
    failure.requiredScopes.length > 0 ? `scope=${quote(failure.requiredScopes.join(' '))}` : undefined,
    failure.error ? `error=${quote(failure.error)}` : undefined,
    failure.description ? `error_description=${quote(failure.description)}` : undefined,
  ].filter(Boolean);

  return `Bearer ${params.join(', ')}`;
}

export function createMcpAuthErrorResponse(failure: AuthFailure) {
  return new Response(JSON.stringify({ error: failure.error, message: failure.description }), {
    status: failure.status,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': createWwwAuthenticateHeader(failure),
    },
  });
}

export async function validateMcpRequest(
  request: Request,
  authConfig: McpAuthConfig | undefined = getMcpAuthConfig()
): Promise<McpAuthResult> {
  if (!isMcpAuthEnabled(authConfig)) return { ok: true };

  const metadataUrl = getMcpProtectedResourceMetadataUrl(request, authConfig);
  const requiredScopes = getMcpRequiredScopes(authConfig);
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      error: 'invalid_token',
      description: 'Missing Bearer access token',
      requiredScopes,
      metadataUrl,
    };
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'invalid_token',
      description: 'Missing Bearer access token',
      requiredScopes,
      metadataUrl,
    };
  }

  try {
    const claims = await verifyAccessToken(token, request, authConfig);
    const missingScopes = getMissingScopes(claims, requiredScopes);

    if (missingScopes.length > 0) {
      return {
        ok: false,
        status: 403,
        error: 'insufficient_scope',
        description: `Missing required scope${missingScopes.length > 1 ? 's' : ''}: ${missingScopes.join(' ')}`,
        requiredScopes,
        metadataUrl,
      };
    }

    return { ok: true, claims };
  } catch {
    return {
      ok: false,
      status: 401,
      error: 'invalid_token',
      description: 'Invalid or expired Bearer access token',
      requiredScopes,
      metadataUrl,
    };
  }
}

async function verifyAccessToken(token: string, request: Request, authConfig: McpAuthConfig): Promise<TokenClaims> {
  const decoded = jwt.decode(token, { complete: true });
  const algorithm = decoded && typeof decoded === 'object' ? (decoded.header.alg as Algorithm | undefined) : undefined;

  if (!algorithm || algorithm === 'none') {
    throw new Error('Unsupported JWT algorithm');
  }

  const key = await getVerificationKey(token, authConfig);
  const audience = getJwtAudience(authConfig.audience ?? getMcpResourceUrl(request, authConfig));

  const payload = jwt.verify(token, key, {
    audience,
    issuer: authConfig.issuer,
    algorithms: [algorithm],
    clockTolerance: 5,
  });

  if (!payload || typeof payload === 'string') {
    throw new Error('Invalid JWT payload');
  }

  return payload as TokenClaims;
}

async function getVerificationKey(token: string, authConfig: McpAuthConfig): Promise<string | Buffer | KeyObject> {
  const sharedSecret = getConfiguredValue(authConfig.sharedSecret, authConfig.sharedSecretEnvVar);
  if (sharedSecret) return sharedSecret;

  const publicKey = getConfiguredValue(authConfig.publicKey, authConfig.publicKeyEnvVar);
  if (publicKey) return publicKey;

  if (authConfig.jwksUri) {
    return getJwksVerificationKey(token, authConfig.jwksUri);
  }

  throw new Error('MCP auth requires jwksUri, publicKey, publicKeyEnvVar, sharedSecret, or sharedSecretEnvVar');
}

function getConfiguredValue(value: string | undefined, envVar: string | undefined) {
  if (value) return value;
  if (envVar) return process.env[envVar];
  return undefined;
}

async function getJwksVerificationKey(token: string, jwksUri: string) {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded && typeof decoded === 'object' ? decoded.header.kid : undefined;
  const keys = await getJwksKeys(jwksUri);
  const jwk = keys.find((key) => (kid ? key.kid === kid : keys.length === 1));

  if (!jwk) {
    throw new Error('No matching JWKS key found for token');
  }

  return createPublicKey({ key: jwk, format: 'jwk' });
}

function getJwtAudience(audience: string | string[]) {
  if (Array.isArray(audience)) {
    if (audience.length === 0) return undefined;
    return audience as [string, ...string[]];
  }

  return audience;
}

async function getJwksKeys(jwksUri: string): Promise<JwksKey[]> {
  const cached = jwksCache.get(jwksUri);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const response = await fetch(jwksUri, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  const body = (await response.json()) as { keys?: JwksKey[] };
  const keys = body.keys ?? [];
  jwksCache.set(jwksUri, { keys, expiresAt: Date.now() + 5 * 60 * 1000 });
  return keys;
}

function getMissingScopes(claims: TokenClaims, requiredScopes: string[]) {
  if (requiredScopes.length === 0) return [];

  const scopes = new Set<string>();

  if (typeof claims.scope === 'string') {
    for (const scope of claims.scope.split(/\s+/)) {
      if (scope) scopes.add(scope);
    }
  }

  if (Array.isArray(claims.scp)) {
    for (const scope of claims.scp) {
      scopes.add(scope);
    }
  }

  return requiredScopes.filter((scope) => !scopes.has(scope));
}
