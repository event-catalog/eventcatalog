import type { OIDCConfig, OIDCUserConfig } from '@auth/core/providers';
import jwt from 'jsonwebtoken';

// A generic OpenID Connect provider (`providers.oidc` in eventcatalog.auth.js), for identity providers without their
// own entry, such as JumpCloud, Keycloak, PingIdentity or OneLogin. Its id is fixed, so the callback URL to register
// with the provider is always /api/auth/callback/oidc.
export const OIDC_PROVIDER_ID = 'oidc';

const DEFAULT_NAME = 'SSO';
const DEFAULT_SCOPE = 'openid email profile';
const DEFAULT_GROUPS_CLAIM = 'groups';
const DEFAULT_ROLES_CLAIM = 'roles';

// Any other Auth.js OIDC provider option (checks, authorization, client, ...) is passed through. `checks` defaults
// to PKCE and state; a value the catalog sets replaces that. The id is fixed.
export interface OidcProviderOptions extends Omit<OIDCUserConfig<Record<string, any>>, 'id' | 'name' | 'issuer' | 'clientId'> {
  /** Shown on the login button ("Continue with <name>") and in the user menu. Defaults to "SSO". */
  name?: string;
  /** The issuer, exactly as the provider's /.well-known/openid-configuration has it */
  issuer: string;
  clientId: string;
  clientSecret?: string;
  /** Scopes to request. Defaults to "openid email profile". */
  scope?: string;
  /** The claim holding the user's groups. Defaults to "groups". A dotted path (e.g. "realm_access.groups") also works. */
  groupsClaim?: string;
  /** The claim holding the user's roles. Defaults to "roles". A dotted path (e.g. "realm_access.roles") also works. */
  rolesClaim?: string;
}

export const getOidcProviderName = (options?: Pick<OidcProviderOptions, 'name'>) => options?.name || DEFAULT_NAME;

export const createOidcProvider = (options: OidcProviderOptions): OIDCConfig<Record<string, any>> => {
  // `id` and `type` can't be overridden: the login button, the callback URL and the groups and roles in auth.config.ts
  // all rely on the id being "oidc"
  const { name, scope, groupsClaim, rolesClaim, authorization, checks, id, type, ...authJsOptions } =
    options as OidcProviderOptions & {
      id?: unknown;
      type?: unknown;
    };
  // A catalog's own authorization params (e.g. `prompt`) are kept alongside the scope; a scope set there wins
  const authorizationOptions =
    typeof authorization === 'string'
      ? { url: authorization }
      : typeof authorization === 'object' && authorization
        ? authorization
        : {};

  return {
    ...authJsOptions,
    // Auth.js sends only PKCE unless checks are set. Strict identity providers such as JumpCloud reject an
    // authorize request that has no state, so both are sent unless the catalog sets its own checks.
    checks: checks ?? ['pkce', 'state'],
    authorization: {
      ...authorizationOptions,
      params: { scope: scope || DEFAULT_SCOPE, ...authorizationOptions.params },
    },
    id: OIDC_PROVIDER_ID,
    name: getOidcProviderName({ name }),
    type: 'oidc',
  };
};

// A claim by its exact name (namespaced claims such as `https://example.com/groups` contain dots), or else by a
// dotted path into nested claims (Keycloak puts roles in `realm_access.roles`)
const readClaim = (claims: unknown, claim: string): unknown => {
  if (!claims || typeof claims !== 'object') return undefined;
  const record = claims as Record<string, unknown>;
  if (claim in record) return record[claim];

  return claim.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, record);
};

// Providers send a list as an array, or one value as a string. The string isn't split: group names can contain spaces
// ("Platform Admins") and commas (an LDAP DN), and splitting would invent groups that pass `hasGroup` checks
const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
};

const decodeToken = (token?: string) => {
  if (!token) return undefined;
  try {
    return jwt.decode(token) ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * The user's groups and roles, from the claims EventCatalog was told to read. The ID token's claims (the profile) come
 * first. Some providers only put them in the access token, so that's read when the profile has none.
 */
export const getOidcGroupsAndRoles = ({
  options,
  profile,
  accessToken,
}: {
  options: Pick<OidcProviderOptions, 'groupsClaim' | 'rolesClaim'>;
  profile?: unknown;
  accessToken?: string;
}) => {
  const groupsClaim = options.groupsClaim || DEFAULT_GROUPS_CLAIM;
  const rolesClaim = options.rolesClaim || DEFAULT_ROLES_CLAIM;
  const accessTokenClaims = decodeToken(accessToken);

  const fromClaims = (claim: string) => {
    const fromProfile = toList(readClaim(profile, claim));
    return fromProfile.length > 0 ? fromProfile : toList(readClaim(accessTokenClaims, claim));
  };

  return { groups: fromClaims(groupsClaim), roles: fromClaims(rolesClaim) };
};
