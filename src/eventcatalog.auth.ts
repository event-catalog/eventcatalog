// types/auth.ts
import type { OAuthUserConfig } from '@auth/core/providers';
import type { GitHubProfile } from '@auth/core/providers/github';
import type { OktaProfile } from '@auth/core/providers/okta';

export interface EventCatalogAuthConfig {
  providers?: {
    github?: OAuthUserConfig<GitHubProfile>;
    okta?: OAuthUserConfig<OktaProfile>;
  };
  // Enterprise only features
  customAuthConfig?: string;
  customMiddleware?: string;
  // Session configuration
  session?: {
    maxAge?: number;
    updateAge?: number;
  };
}
