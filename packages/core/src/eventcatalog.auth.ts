// types/auth.ts
import type { OAuthUserConfig, OIDCUserConfig } from '@auth/core/providers';
import type { GitHubProfile } from '@auth/core/providers/github';
import type { OktaProfile } from '@auth/core/providers/okta';
import type { Auth0Profile } from '@auth/core/providers/auth0';
import type { MicrosoftEntraIDProfile } from '@auth/core/providers/microsoft-entra-id';
import type { GoogleProfile } from '@auth/core/providers/google';

// Any OpenID Connect provider without its own entry (JumpCloud, Keycloak, PingIdentity, OneLogin, ...).
// Register /api/auth/callback/oidc as the redirect URI with the provider. Other Auth.js OIDC options (checks,
// authorization, client, ...) are passed through; the provider's id is always "oidc".
export interface EventCatalogOidcProviderConfig
  extends Omit<OIDCUserConfig<Record<string, any>>, 'id' | 'name' | 'issuer' | 'clientId'> {
  /** Shown on the login button ("Continue with <name>") and in the user menu. Defaults to "SSO". */
  name?: string;
  /** The issuer, exactly as the provider's /.well-known/openid-configuration has it */
  issuer: string;
  clientId: string;
  clientSecret?: string;
  /** Scopes to request. Defaults to "openid email profile". */
  scope?: string;
  /** The claim holding the user's groups (`locals.user.groups`). Defaults to "groups". Dotted paths work too. */
  groupsClaim?: string;
  /** The claim holding the user's roles (`locals.user.roles`). Defaults to "roles". Dotted paths work too. */
  rolesClaim?: string;
}

export interface EventCatalogAuthConfig {
  providers?: {
    github?: OAuthUserConfig<GitHubProfile>;
    google?: OAuthUserConfig<GoogleProfile>;
    okta?: OAuthUserConfig<OktaProfile>;
    auth0?: OAuthUserConfig<Auth0Profile>;
    entra?: OAuthUserConfig<MicrosoftEntraIDProfile>;
    oidc?: EventCatalogOidcProviderConfig;
  };
  // Custom providers
  customAuthConfig?: string;
  customMiddleware?: string;
  // Session configuration
  session?: {
    maxAge?: number;
    updateAge?: number;
  };
}
