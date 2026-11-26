import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { createOidcProvider, getOidcGroupsAndRoles, getOidcProviderName, OIDC_PROVIDER_ID } from '../oidc';

const accessTokenWith = (claims: Record<string, unknown>) => jwt.sign(claims, 'test-secret');

describe('Generic OpenID Connect provider', () => {
  describe('createOidcProvider', () => {
    it('creates an Auth.js OIDC provider with the id "oidc", so its callback URL is always /api/auth/callback/oidc', () => {
      const provider = createOidcProvider({
        name: 'JumpCloud',
        issuer: 'https://oauth.id.jumpcloud.com/',
        clientId: 'client-id',
        clientSecret: 'client-secret',
      });

      expect(provider).toEqual({
        id: OIDC_PROVIDER_ID,
        name: 'JumpCloud',
        type: 'oidc',
        issuer: 'https://oauth.id.jumpcloud.com/',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authorization: { params: { scope: 'openid email profile' } },
      });
    });

    it('requests the scopes the catalog configures, in place of the default ones', () => {
      const provider = createOidcProvider({ issuer: 'https://idp.example.com', clientId: 'id', scope: 'openid email groups' });

      expect(provider.authorization).toEqual({ params: { scope: 'openid email groups' } });
    });

    it('does not pass the EventCatalog-only options (scope and the group and role claims) on to Auth.js', () => {
      const provider = createOidcProvider({
        issuer: 'https://idp.example.com',
        clientId: 'id',
        scope: 'openid',
        groupsClaim: 'memberOf',
        rolesClaim: 'realm_access.roles',
      });

      expect(provider).not.toHaveProperty('scope');
      expect(provider).not.toHaveProperty('groupsClaim');
      expect(provider).not.toHaveProperty('rolesClaim');
    });

    it('keeps the id "oidc" and the type "oidc" even when the catalog sets its own, so the login button and callback URL still match', () => {
      const provider = createOidcProvider({
        issuer: 'https://idp.example.com',
        clientId: 'id',
        ...({ id: 'jumpcloud', type: 'oauth' } as Record<string, unknown>),
      });

      expect(provider.id).toBe(OIDC_PROVIDER_ID);
      expect(provider.type).toBe('oidc');
    });

    it('keeps the catalog’s own authorization params alongside the configured scope', () => {
      const provider = createOidcProvider({
        issuer: 'https://idp.example.com',
        clientId: 'id',
        scope: 'openid groups',
        authorization: { params: { prompt: 'login' } },
      });

      expect(provider.authorization).toEqual({ params: { scope: 'openid groups', prompt: 'login' } });
    });

    it('uses a scope set in the authorization params over the scope option', () => {
      const provider = createOidcProvider({
        issuer: 'https://idp.example.com',
        clientId: 'id',
        scope: 'openid',
        authorization: { params: { scope: 'openid email groups' } },
      });

      expect(provider.authorization).toEqual({ params: { scope: 'openid email groups' } });
    });

    it('keeps an authorization URL the catalog sets, with the scope added to it', () => {
      const provider = createOidcProvider({
        issuer: 'https://idp.example.com',
        clientId: 'id',
        authorization: 'https://idp.example.com/authorize',
      });

      expect(provider.authorization).toEqual({
        url: 'https://idp.example.com/authorize',
        params: { scope: 'openid email profile' },
      });
    });

    it('passes any other Auth.js provider option through unchanged, so a catalog can override the defaults', () => {
      const provider = createOidcProvider({ issuer: 'https://idp.example.com', clientId: 'id', checks: ['pkce', 'state'] });

      expect(provider.checks).toEqual(['pkce', 'state']);
    });
  });

  describe('getOidcProviderName', () => {
    it('uses the name the catalog gives the provider', () => {
      expect(getOidcProviderName({ name: 'JumpCloud' })).toBe('JumpCloud');
    });

    it('falls back to "SSO" when the catalog gives the provider no name, so the button reads "Continue with SSO"', () => {
      expect(getOidcProviderName({})).toBe('SSO');
      expect(getOidcProviderName()).toBe('SSO');
    });
  });

  describe('getOidcGroupsAndRoles', () => {
    it('reads groups and roles from the "groups" and "roles" claims of the ID token by default', () => {
      const result = getOidcGroupsAndRoles({
        options: {},
        profile: { sub: 'user-1', groups: ['engineering', 'architects'], roles: ['admin'] },
      });

      expect(result).toEqual({ groups: ['engineering', 'architects'], roles: ['admin'] });
    });

    it('reads groups and roles from the claims the catalog names, such as "memberOf"', () => {
      const result = getOidcGroupsAndRoles({
        options: { groupsClaim: 'memberOf', rolesClaim: 'appRoles' },
        profile: { groups: ['ignored'], memberOf: ['engineering'], appRoles: ['editor'] },
      });

      expect(result).toEqual({ groups: ['engineering'], roles: ['editor'] });
    });

    it('reads nested claims by a dotted path, such as Keycloak’s "realm_access.roles"', () => {
      const result = getOidcGroupsAndRoles({
        options: { rolesClaim: 'realm_access.roles' },
        profile: { realm_access: { roles: ['catalog-admin'] } },
      });

      expect(result.roles).toEqual(['catalog-admin']);
    });

    it('reads a claim whose name contains dots by its exact name before treating it as a path', () => {
      const result = getOidcGroupsAndRoles({
        options: { groupsClaim: 'https://example.com/groups' },
        profile: { 'https://example.com/groups': ['payments'] },
      });

      expect(result.groups).toEqual(['payments']);
    });

    it('reads groups and roles from the access token when the ID token has none', () => {
      const result = getOidcGroupsAndRoles({
        options: {},
        profile: { sub: 'user-1' },
        accessToken: accessTokenWith({ groups: ['engineering'], roles: ['viewer'] }),
      });

      expect(result).toEqual({ groups: ['engineering'], roles: ['viewer'] });
    });

    it('prefers the ID token’s claims over the access token’s when both have them', () => {
      const result = getOidcGroupsAndRoles({
        options: {},
        profile: { groups: ['from-id-token'] },
        accessToken: accessTokenWith({ groups: ['from-access-token'] }),
      });

      expect(result.groups).toEqual(['from-id-token']);
    });

    it('treats a claim sent as one string as a single group or role, without splitting names that contain spaces or commas', () => {
      const result = getOidcGroupsAndRoles({
        options: { groupsClaim: 'memberOf' },
        profile: { memberOf: 'CN=Eng,OU=Groups,DC=example', roles: 'Platform Admins' },
      });

      expect(result).toEqual({ groups: ['CN=Eng,OU=Groups,DC=example'], roles: ['Platform Admins'] });
    });

    it('gives the user no groups or roles when neither token has the claims, or the access token is not a JWT', () => {
      const result = getOidcGroupsAndRoles({ options: {}, profile: { sub: 'user-1' }, accessToken: 'opaque-token' });

      expect(result).toEqual({ groups: [], roles: [] });
    });
  });
});
