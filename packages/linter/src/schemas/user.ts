import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  role: z.string().optional(),
  hidden: z.boolean().optional(),
  email: z.string().email().optional(),
  slackDirectMessageUrl: z.string().optional(),
  msTeamsDirectMessageUrl: z.string().optional(),
  ownedDomains: z.array(z.any()).optional(), // reference('domains')
  ownedServices: z.array(z.any()).optional(), // reference('services')
  ownedEvents: z.array(z.any()).optional(), // reference('events')
  ownedCommands: z.array(z.any()).optional(), // reference('commands')
  ownedQueries: z.array(z.any()).optional(), // reference('queries')
  associatedTeams: z.array(z.any()).optional(), // reference('teams')
});
