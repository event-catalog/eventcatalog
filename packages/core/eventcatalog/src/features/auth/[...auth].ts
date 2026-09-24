import { AstroAuth } from '@utils/auth-astro/server';
export const prerender = false;
export const { GET, POST } = AstroAuth();
