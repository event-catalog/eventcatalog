import type { Team, User } from '../types';

export function teamToDSL(team: Team): string {
  const lines: string[] = [];

  if (team.name) lines.push(`  name "${team.name}"`);
  if (team.avatarUrl) lines.push(`  avatar "${team.avatarUrl}"`);
  if (team.role) lines.push(`  role "${team.role}"`);
  if (team.summary) lines.push(`  summary "${team.summary}"`);
  if (team.email) lines.push(`  email "${team.email}"`);
  if (team.slackDirectMessageUrl) lines.push(`  slack "${team.slackDirectMessageUrl}"`);

  return `team ${team.id} {\n${lines.join('\n')}\n}`;
}

export function userToDSL(user: User): string {
  const lines: string[] = [];

  if (user.name) lines.push(`  name "${user.name}"`);
  if (user.avatarUrl) lines.push(`  avatar "${user.avatarUrl}"`);
  if (user.role) lines.push(`  role "${user.role}"`);
  if (user.email) lines.push(`  email "${user.email}"`);
  if (user.slackDirectMessageUrl) lines.push(`  slack "${user.slackDirectMessageUrl}"`);

  return `user ${user.id} {\n${lines.join('\n')}\n}`;
}
