import {
  defineDirectorySource,
  type DirectorySource,
  type DirectoryTeam,
  type DirectoryUser,
} from "./types";

type GitHubDirectoryOptions = {
  org: string;
  token?: string;
  teams?: true | string[];
  users?: boolean;
  baseUrl?: string;
};

type GitHubTeam = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  html_url: string;
};

type GitHubUser = {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
};

type GitHubDirectoryData = {
  teams: DirectoryTeam[];
  users: DirectoryUser[];
};

const GITHUB_API_VERSION = "2022-11-28";

export const githubDirectory = (
  options: GitHubDirectoryOptions,
): DirectorySource => {
  let cachedData: Promise<GitHubDirectoryData> | undefined;

  const load = () => {
    cachedData = cachedData ?? loadGitHubDirectory(options);
    return cachedData;
  };

  return defineDirectorySource({
    type: "directory",
    name: `github:${options.org}`,
    cacheKey: createGitHubDirectoryCacheKey(options),
    loadTeams: async () => {
      const data = await load();
      return data.teams;
    },
    loadUsers: async () => {
      const data = await load();
      return data.users;
    },
  });
};

const createGitHubDirectoryCacheKey = (options: GitHubDirectoryOptions) => {
  const teams =
    options.teams === true || options.teams === undefined
      ? "all"
      : [...options.teams].sort().join(",");
  const users = options.users !== false ? "true" : "false";
  const baseUrl = options.baseUrl ?? "https://api.github.com";

  return `github:${baseUrl}:${options.org}:teams=${teams}:users=${users}`;
};

const loadGitHubDirectory = async (
  options: GitHubDirectoryOptions,
): Promise<GitHubDirectoryData> => {
  const teams = await loadGitHubTeams(options);
  const shouldLoadUsers = options.users !== false;

  if (!shouldLoadUsers) {
    return { teams, users: [] };
  }

  const usersById = new Map<string, DirectoryUser>();
  const teamsWithMembers: DirectoryTeam[] = [];

  for (const team of teams) {
    const members = await loadGitHubTeamMembers(options, team.id);

    for (const member of members) {
      usersById.set(member.id, member);
    }

    teamsWithMembers.push({
      ...team,
      members: members.map((member) => member.id),
    });
  }

  return {
    teams: teamsWithMembers,
    users: Array.from(usersById.values()),
  };
};

const loadGitHubTeams = async (
  options: GitHubDirectoryOptions,
): Promise<DirectoryTeam[]> => {
  const teams = await paginate<GitHubTeam>(
    options,
    `/orgs/${encodeURIComponent(options.org)}/teams`,
  );
  const configuredTeams =
    options.teams === undefined || options.teams === true
      ? undefined
      : new Set(options.teams);

  return teams
    .filter((team) => !configuredTeams || configuredTeams.has(team.slug))
    .map((team) => ({
      id: team.slug,
      name: team.name,
      summary: team.description ?? undefined,
      markdown: createGitHubSyncedMarkdown("team", team.html_url),
      source: {
        provider: "github",
        id: String(team.id),
        url: team.html_url,
      },
    }));
};

const loadGitHubTeamMembers = async (
  options: GitHubDirectoryOptions,
  teamSlug: string,
): Promise<DirectoryUser[]> => {
  const members = await paginate<GitHubUser>(
    options,
    `/orgs/${encodeURIComponent(options.org)}/teams/${encodeURIComponent(teamSlug)}/members`,
  );

  return members.map((member) => ({
    id: member.login,
    name: member.login,
    avatarUrl: member.avatar_url,
    markdown: createGitHubSyncedMarkdown("user", member.html_url),
    source: {
      provider: "github",
      id: String(member.id),
      url: member.html_url,
    },
  }));
};

const createGitHubSyncedMarkdown = (type: "team" | "user", url: string) => {
  if (type === "team") {
    return [
      ":::note",
      "This team is synced from GitHub and is read-only in EventCatalog.",
      "",
      "Manage the team and its members in GitHub.",
      "",
      `[View team on GitHub](${url})`,
      ":::",
    ].join("\n");
  }

  return [
    ":::note",
    "This user is synced from GitHub and is read-only in EventCatalog.",
    "",
    "Manage profile details and team membership in GitHub.",
    "",
    `[View user on GitHub](${url})`,
    ":::",
  ].join("\n");
};

const paginate = async <T>(
  options: GitHubDirectoryOptions,
  pathname: string,
): Promise<T[]> => {
  const results: T[] = [];
  let url: string | undefined = buildGitHubUrl(options, pathname);

  while (url) {
    const response = await githubRequest<T[]>(options, url);
    results.push(...response.data);
    url = getNextPageUrl(response.headers.get("link"));
  }

  return results;
};

const githubRequest = async <T>(
  options: GitHubDirectoryOptions,
  url: string,
): Promise<{ data: T; headers: Headers }> => {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": GITHUB_API_VERSION,
      "user-agent": "@eventcatalog/connectors",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `GitHub directory connector failed (${response.status} ${response.statusText}): ${message}`,
    );
  }

  return {
    data: (await response.json()) as T,
    headers: response.headers,
  };
};

const buildGitHubUrl = (options: GitHubDirectoryOptions, pathname: string) => {
  const baseUrl = options.baseUrl ?? "https://api.github.com";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPathname = pathname.replace(/^\//u, "");
  const url = new URL(normalizedPathname, normalizedBaseUrl);
  url.searchParams.set("per_page", "100");
  return url.toString();
};

const getNextPageUrl = (linkHeader: string | null) => {
  if (!linkHeader) return undefined;

  const nextLink = linkHeader
    .split(",")
    .find((link) => link.includes('rel="next"'));
  const match = nextLink?.match(/<([^>]+)>/);

  return match?.[1];
};
