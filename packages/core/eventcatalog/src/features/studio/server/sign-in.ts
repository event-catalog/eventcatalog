import { getSession } from '@utils/auth-astro/server';
import type { NormalizedUser } from '@features/auth/middleware/middleware-auth';

/** Someone signed in with the catalog's sign-in (SSO): Studio shows them by these, and they can't change them */
export type SignedInUser = { name: string; picture?: string };

/** For the collaboration connection (see startStudio): it has the same cookies as the pages */
export const isSignedIn = async (request: Request) => Boolean(await getSession(request));

/** Who's signed in, from what the sign-in middleware found (nobody when sign-in is off) */
export const getSignedInUser = (locals: object): SignedInUser | undefined => {
  const user = (locals as { user?: NormalizedUser }).user;
  const name = user?.name || user?.email;
  if (!user || !name) return undefined;
  // Pictures are loaded from the provider (Auth.js calls it `image`), over HTTPS only
  const picture = user.picture ?? user.raw?.user?.image;
  return { name, ...(typeof picture === 'string' && picture.startsWith('https://') && { picture }) };
};
