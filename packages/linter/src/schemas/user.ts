import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  role: z.string().optional(),
  hidden: z.boolean().optional(),
  source: z
    .object({
      provider: z.string(),
      id: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  readOnly: z.boolean().optional(),
  email: z.string().email().optional(),
  slackDirectMessageUrl: z.string().optional(),
  msTeamsDirectMessageUrl: z.string().optional(),
  ownedAgents: z.array(z.any()).optional(), // reference('agents')
  ownedDomains: z.array(z.any()).optional(), // reference('domains')
  ownedServices: z.array(z.any()).optional(), // reference('services')
  ownedEvents: z.array(z.any()).optional(), // reference('events')
  ownedCommands: z.array(z.any()).optional(), // reference('commands')
  ownedQueries: z.array(z.any()).optional(), // reference('queries')
  associatedTeams: z.array(z.any()).optional(), // reference('teams')
});
