import { AstroAuth } from 'auth-astro/server';

export const prerender = false;

export const { GET, POST } = AstroAuth();
