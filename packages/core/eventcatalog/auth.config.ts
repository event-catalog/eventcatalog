import { defineConfig } from 'auth-astro';
import { join } from 'node:path';
import GitHub from '@auth/core/providers/github';
import Okta from '@auth/core/providers/okta';
import type { Account, Profile, User, Session } from '@auth/core/types';
import { isAuthEnabled, isSSR } from '@utils/feature';
import Google from '@auth/core/providers/google';
import Auth0 from '@auth/core/providers/auth0';
import Entra from '@auth/core/providers/microsoft-entra-id';
import jwt from 'jsonwebtoken';

// Need to try and read the eventcatalog.auth.js file and get the auth providers from there
const catalogDirectory = process.env.PROJECT_DIR || process.cwd();

const getAuthProviders = async () => {
  try {
    const config = await import(/* @vite-ignore */ join(catalogDirectory, 'eventcatalog.auth.js'));
    const authConfig = config.default;

    const providers = [];

    // GitHub provider
    if (authConfig.providers?.github) {
      const githubConfig = authConfig.providers.github;
      providers.push(
        GitHub({
          ...githubConfig,
        })
      );
      console.log('✅ GitHub provider configured');
    }

    // Google provider
    if (authConfig.providers?.google) {
      const googleConfig = authConfig.providers.google;
      providers.push(
        Google({
          ...googleConfig,
        })
      );
      console.log('✅ Google provider configured');
    }

    // Okta provider
    if (authConfig.providers?.okta) {
      const oktaConfig = authConfig.providers.okta;
      providers.push(
        Okta({
          authorization: {
            params: {
              scope: 'openid email profile groups',
            },
          },
          ...oktaConfig,
        })
      );
      console.log('✅ Okta provider configured');
    }

    // Auth0 provider
    if (authConfig.providers?.auth0) {
      const auth0Config = authConfig.providers.auth0;
      providers.push(
        Auth0({
          authorization: {
            params: {
              scope: 'openid email profile groups',
            },
          },
          ...auth0Config,
        })
      );
      console.log('✅ Auth0 provider configured');
    }

    if (authConfig.providers?.entra) {
      const entraConfig = authConfig.providers.entra;
      providers.push(
        Entra({
          authorization: {
            params: {
              scope: 'openid profile email',
            },
          },
          ...entraConfig,
        })
      );
      console.log('✅ Microsoft Entra ID provider configured');
    }

    if (providers.length === 0) {
      console.warn('⚠️ No auth providers configured');
    }

    return providers;
  } catch (error) {
    return [];
  }
};

const getAuthConfig = async () => {
  // If auth is disabled or we are not in SSR, return an empty config
  if (!isAuthEnabled() || !isSSR()) {
    return {
      providers: [],
    };
  }
  try {
    const config = await import(/* @vite-ignore */ join(catalogDirectory, 'eventcatalog.auth.js'));
    const authConfig = config.default;

    // If custom auth config is specified (Enterprise feature)
    if (authConfig?.customAuthConfig) {
      try {
        const customConfig = await import(/* @vite-ignore */ join(catalogDirectory, authConfig.customAuthConfig));
        return customConfig.default;
      } catch (error) {
        console.error('❌ Failed to load custom auth config:', error);
        // Fall back to managed config
      }
    }

    // Return managed auth config
    const providers = await getAuthProviders();

    return {
      providers,
      callbacks: {
        async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }) {
          // Just allow everyone who can authenticate with the provider
          return true;
        },
        async jwt({ token, account, profile }: { token: any; account: Account | null; profile?: Profile }) {
          // Persist provider info in JWT
          if (account && profile) {
            token.provider = account.provider;
            token.login = (profile as any).login || (profile as any).preferred_username;

            // Handle groups from different providers
            if (account.provider === 'microsoft-entra-id') {
              token.groups = (profile as any).roles || (profile as any).groups || [];
            } else if (account.provider === 'okta') {
              // For Okta, try profile first, then decode access token
              token.groups = (profile as any).groups || [];
              token.roles = (profile as any).roles || [];

              // If no groups in profile, decode the access token
              if ((!token.groups || token.groups.length === 0) && account.access_token) {
                try {
                  // Import jwt at the top of your file if not already imported
                  const decodedAccessToken = jwt.decode(account.access_token);

                  if (decodedAccessToken && typeof decodedAccessToken === 'object') {
                    token.groups = (decodedAccessToken as any).groups || [];
                    token.roles = (decodedAccessToken as any).roles || [];
                  }
                } catch (error) {
                  console.error('🔍 Error decoding Okta access token:', error);
                }
              }
            } else if (account.provider === 'auth0') {
              token.groups = (profile as any)['https://eventcatalog.dev/groups'] || [];
              token.roles = (profile as any)['https://eventcatalog.dev/roles'] || [];
            }

            // Store access token for potential API calls
            token.accessToken = account.access_token;
          }

          return token;
        },
        async session({ session, token }: { session: Session; token: any }) {
          // Add provider info to session
          if (token?.provider) {
            (session.user as any).provider = token.provider;
          }
          if (token?.login) {
            (session.user as any).username = token.login;
          }

          // Add groups to session
          if (token?.groups) {
            (session.user as any).groups = token.groups;
          }

          // Add roles if available
          if (token?.roles) {
            (session.user as any).roles = token.roles;
          }

          // Add access token to session
          if (token?.accessToken) {
            (session as any).accessToken = token.accessToken;
          }

          return session;
        },
      },
      pages: {
        signIn: '/auth/login',
        error: '/auth/error',
      },
      session: {
        strategy: 'jwt' as const,
        maxAge: authConfig?.session?.maxAge || 30 * 24 * 60 * 60, // 30 days default
      },
      debug: authConfig?.debug || false,
    };
  } catch (error) {
    console.log(
      'No auth config found, auth disabled. If you want to use auth, create a eventcatalog.auth.js file in your project directory.'
    );
    return {
      providers: [],
      pages: {
        signIn: '/auth/disabled',
      },
    };
  }
};

export default defineConfig(await getAuthConfig());
