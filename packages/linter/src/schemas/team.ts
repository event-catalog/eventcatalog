import { z } from 'zod';

export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  email: z.string().email().optional(),
  hidden: z.boolean().optional(),
  source: z
    .object({
      provider: z.string(),
      id: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  readOnly: z.boolean().optional(),
  slackDirectMessageUrl: z.string().optional(),
  msTeamsDirectMessageUrl: z.string().optional(),
  members: z.array(z.any()).optional(), // reference('users')
  ownedAgents: z.array(z.any()).optional(), // reference('agents')
  ownedCommands: z.array(z.any()).optional(), // reference('commands')
  ownedQueries: z.array(z.any()).optional(), // reference('queries')
  ownedDomains: z.array(z.any()).optional(), // reference('domains')
  ownedServices: z.array(z.any()).optional(), // reference('services')
  ownedEvents: z.array(z.any()).optional(), // reference('events')
});
