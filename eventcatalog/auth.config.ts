import { defineConfig } from 'auth-astro';
import { join } from 'node:path';
import GitHub from '@auth/core/providers/github';
import Okta from '@auth/core/providers/okta';
import type { Account, Profile, User, Session } from '@auth/core/types';
import { isAuthEnabled, isSSR } from '@utils/feature';
import Google from '@auth/core/providers/google';

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
          clientId: githubConfig.clientId,
          clientSecret: githubConfig.clientSecret,
        })
      );
      console.log('✅ GitHub provider configured');
    }

    // Google provider
    if (authConfig.providers?.google) {
      const googleConfig = authConfig.providers.google;
      providers.push(
        Google({
          clientId: googleConfig.clientId,
          clientSecret: googleConfig.clientSecret,
        })
      );
      console.log('✅ Google provider configured');
    }

    // Okta provider
    if (authConfig.providers?.okta) {
      const oktaConfig = authConfig.providers.okta;
      providers.push(
        Okta({
          clientId: oktaConfig.clientId,
          clientSecret: oktaConfig.clientSecret,
          issuer: oktaConfig.issuer,
        })
      );
      console.log('✅ Okta provider configured');
    }

    if (providers.length === 0) {
      console.warn('⚠️ No auth providers configured');
    }

    return providers;
  } catch (error) {
    console.log('No eventcatalog.auth.js found or error loading config:', (error as Error).message);
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
      console.log('🚀 Loading custom auth configuration:', authConfig.customAuthConfig);
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
        async session({ session, token }: { session: Session; token: any }) {
          // Add provider info to session
          if (token?.provider) {
            (session.user as any).provider = token.provider;
          }
          if (token?.login) {
            (session.user as any).username = token.login;
          }
          return session;
        },
        async jwt({ token, account, profile }: { token: any; account: Account | null; profile?: Profile }) {
          // Persist provider info in JWT
          if (account && profile) {
            token.provider = account.provider;
            token.login = (profile as any).login || (profile as any).preferred_username;
          }
          return token;
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
