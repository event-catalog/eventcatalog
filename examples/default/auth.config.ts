import GitHub from '@auth/core/providers/github';
import { defineConfig } from 'auth-astro';

export default defineConfig({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
      
      // Optional: Restrict to specific organizations
      // if (profile?.login) {
      //   const response = await fetch(`https://api.github.com/user/orgs`, {
      //     headers: {
      //       Authorization: `token ${account.access_token}`,
      //     },
      //   });
      //   const orgs = await response.json();
      //   return orgs.some(org => org.login === 'your-org-name');
      // }
      // return false;
    },
    async session({ session, token }) {
      // console.log('SESSION', session, token)
      // Add additional user info to session
      if (token?.login) {
        // @ts-ignore
        session.user.username = token.login;
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      // console.log('JWT', token, account, profile)
      // Persist GitHub username
      if (account && profile) {
        token.login = profile.login;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: true
});