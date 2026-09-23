/**
 * Adapted from auth-astro 4.2.0 (MIT, https://github.com/nowaythatworked/auth-astro).
 *
 * Kept in Core so every Auth.js import resolves to Core's own `@auth/core`. The
 * auth-astro package pins an older `@auth/core` peer range, which makes npm install
 * a second, vulnerable copy in user projects.
 */
import type { AuthConfig } from '@auth/core/types';

export interface AstroAuthConfig {
  /**
   * Base path for the auth routes.
   * @default '/api/auth'
   */
  prefix?: string;
}

export interface FullAuthConfig extends AstroAuthConfig, Omit<AuthConfig, 'raw'> {}

export const defineConfig = (config: FullAuthConfig) => {
  config.prefix ??= '/api/auth';
  config.basePath = config.prefix;
  return config;
};
