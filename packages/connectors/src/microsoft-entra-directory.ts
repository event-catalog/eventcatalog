import {
  defineDirectorySource,
  type DirectorySource,
  type DirectoryTeam,
  type DirectoryUser,
} from "./types";

type MicrosoftEntraGroupInput =
  | string
  | {
      id: string;
      alias?: string;
    }
  | {
      displayName: string;
      alias?: string;
    };

type MicrosoftEntraDirectoryOptions = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  groups: MicrosoftEntraGroupInput[];
  users?: boolean;
  includeDisabledUsers?: boolean;
  graphBaseUrl?: string;
  tokenUrl?: string;
};

type MicrosoftEntraGroup = {
  id: string;
  displayName?: string | null;
  description?: string | null;
  mail?: string | null;
};

type MicrosoftEntraUser = {
  id: string;
  displayName?: string | null;
  userPrincipalName?: string | null;
  mail?: string | null;
  jobTitle?: string | null;
  accountEnabled?: boolean | null;
};

type MicrosoftEntraDirectoryData = {
  teams: DirectoryTeam[];
  users: DirectoryUser[];
};

type MicrosoftGraphCollection<T> = {
  value?: T[];
  "@odata.nextLink"?: string;
};

type ResolvedGroupInput = {
  group: MicrosoftEntraGroup;
  alias?: string;
};

const DEFAULT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const GRAPH_RETRY_ATTEMPTS = 3;
const GRAPH_SELECT_GROUP = "id,displayName,description,mail";
const GRAPH_SELECT_USER =
  "id,displayName,userPrincipalName,mail,jobTitle,accountEnabled";

export const microsoftEntraDirectory = (
  options: MicrosoftEntraDirectoryOptions,
): DirectorySource => {
  validateOptions(options);

  let cachedData: Promise<MicrosoftEntraDirectoryData> | undefined;

  const load = () => {
    cachedData = cachedData ?? loadMicrosoftEntraDirectory(options);
    return cachedData;
  };

  return defineDirectorySource({
    type: "directory",
    name: `microsoft-entra:${options.tenantId}`,
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

const validateOptions = (options: MicrosoftEntraDirectoryOptions) => {
  if (!options.tenantId) {
    throw new Error("Microsoft Entra directory connector requires tenantId.");
  }
  if (!options.clientId) {
    throw new Error("Microsoft Entra directory connector requires clientId.");
  }
  if (!options.clientSecret) {
    throw new Error(
      "Microsoft Entra directory connector requires clientSecret.",
    );
  }
  if (!Array.isArray(options.groups) || options.groups.length === 0) {
    throw new Error(
      'Microsoft Entra directory connector requires at least one group. Set groups: [{ id: "00000000-0000-0000-0000-000000000000" }].',
    );
  }
};

const loadMicrosoftEntraDirectory = async (
  options: MicrosoftEntraDirectoryOptions,
): Promise<MicrosoftEntraDirectoryData> => {
  const token = await getAccessToken(options);
  const resolvedGroups = await loadMicrosoftEntraGroups(options, token);
  const teams = mapMicrosoftEntraTeams(resolvedGroups);
  const shouldLoadUsers = options.users !== false;

  if (!shouldLoadUsers) {
    return { teams, users: [] };
  }

  const usersById = new Map<string, DirectoryUser>();
  const teamsWithMembers: DirectoryTeam[] = [];

  for (const team of teams) {
    const members = await loadMicrosoftEntraGroupMembers(
      options,
      token,
      String(team.source?.id ?? team.id),
    );

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

const loadMicrosoftEntraGroups = async (
  options: MicrosoftEntraDirectoryOptions,
  token: string,
): Promise<ResolvedGroupInput[]> => {
  const resolvedGroups: ResolvedGroupInput[] = [];

  for (const groupInput of options.groups) {
    resolvedGroups.push(
      await resolveMicrosoftEntraGroup(options, token, groupInput),
    );
  }

  assertUniqueTeamIds(resolvedGroups);

  return resolvedGroups;
};

const resolveMicrosoftEntraGroup = async (
  options: MicrosoftEntraDirectoryOptions,
  token: string,
  groupInput: MicrosoftEntraGroupInput,
): Promise<ResolvedGroupInput> => {
  if (typeof groupInput === "string") {
    return {
      group: await loadMicrosoftEntraGroupById(options, token, groupInput),
    };
  }

  if ("id" in groupInput) {
    return {
      group: await loadMicrosoftEntraGroupById(options, token, groupInput.id),
      alias: groupInput.alias,
    };
  }

  return {
    group: await loadMicrosoftEntraGroupByDisplayName(
      options,
      token,
      groupInput.displayName,
    ),
    alias: groupInput.alias,
  };
};

const loadMicrosoftEntraGroupById = async (
  options: MicrosoftEntraDirectoryOptions,
  token: string,
  groupId: string,
) => {
  return microsoftGraphRequest<MicrosoftEntraGroup>(
    options,
    token,
    buildMicrosoftGraphUrl(options, `/groups/${encodeURIComponent(groupId)}`, {
      $select: GRAPH_SELECT_GROUP,
    }),
  );
};

const loadMicrosoftEntraGroupByDisplayName = async (
  options: MicrosoftEntraDirectoryOptions,
  token: string,
  displayName: string,
) => {
  const groups = await paginate<MicrosoftEntraGroup>(
    options,
    token,
    buildMicrosoftGraphUrl(options, "/groups", {
      $filter: `displayName eq '${escapeODataString(displayName)}'`,
      $select: GRAPH_SELECT_GROUP,
    }),
  );

  if (groups.length === 0) {
    throw new Error(
      `Microsoft Entra directory connector could not find a group with displayName "${displayName}". Use the group id instead.`,
    );
  }

  if (groups.length > 1) {
    throw new Error(
      `Microsoft Entra directory connector found ${groups.length} groups with displayName "${displayName}". Use the group id instead.`,
    );
  }

  return groups[0];
};

const mapMicrosoftEntraTeams = (groups: ResolvedGroupInput[]) => {
  return groups.map(({ group, alias }) => {
    const displayName = group.displayName ?? group.id;

    return {
      id: alias ?? slugify(displayName),
      name: displayName,
      summary: group.description ?? undefined,
      email: group.mail ?? undefined,
      markdown: createMicrosoftEntraSyncedMarkdown("team"),
      source: {
        provider: "microsoft-entra",
        id: group.id,
      },
    };
  });
};

const loadMicrosoftEntraGroupMembers = async (
  options: MicrosoftEntraDirectoryOptions,
  token: string,
  groupId: string,
): Promise<DirectoryUser[]> => {
  const users = await paginate<MicrosoftEntraUser>(
    options,
    token,
    buildMicrosoftGraphUrl(
      options,
      `/groups/${encodeURIComponent(groupId)}/members/microsoft.graph.user`,
      {
        $select: GRAPH_SELECT_USER,
      },
    ),
  );

  return users
    .filter(
      (user) => options.includeDisabledUsers || user.accountEnabled !== false,
    )
    .map(mapMicrosoftEntraUser);
};

const mapMicrosoftEntraUser = (user: MicrosoftEntraUser): DirectoryUser => {
  const userPrincipalName = user.userPrincipalName ?? undefined;
  const email = user.mail ?? userPrincipalName;
  const id = getMicrosoftEntraUserId(user);
  const name = user.displayName ?? userPrincipalName ?? user.id;

  return {
    id,
    name,
    email,
    role: user.jobTitle ?? undefined,
    markdown: createMicrosoftEntraSyncedMarkdown("user"),
    source: {
      provider: "microsoft-entra",
      id: user.id,
    },
  };
};

const getMicrosoftEntraUserId = (user: MicrosoftEntraUser) => {
  if (user.mail) return user.mail.toLowerCase();
  if (user.userPrincipalName)
    return normalizeMicrosoftEntraUserPrincipalName(user.userPrincipalName);
  return user.id;
};

const normalizeMicrosoftEntraUserPrincipalName = (
  userPrincipalName: string,
) => {
  const guestUserMatch = userPrincipalName.match(/^(.+)#EXT#@.+$/i);

  if (!guestUserMatch) return userPrincipalName.toLowerCase();

  const externalUserName = guestUserMatch[1];
  const lastUnderscoreIndex = externalUserName.lastIndexOf("_");

  if (lastUnderscoreIndex === -1) return externalUserName.toLowerCase();

  return `${externalUserName.slice(0, lastUnderscoreIndex)}@${externalUserName.slice(lastUnderscoreIndex + 1)}`.toLowerCase();
};

const createMicrosoftEntraSyncedMarkdown = (type: "team" | "user") => {
  if (type === "team") {
    return [
      ":::note",
      "This team is synced from Microsoft Entra ID and is read-only in EventCatalog.",
      "",
      "Manage the team and its members in Microsoft Entra ID.",
      ":::",
    ].join("\n");
  }

  return [
    ":::note",
    "This user is synced from Microsoft Entra ID and is read-only in EventCatalog.",
    "",
    "Manage profile details and team membership in Microsoft Entra ID.",
    ":::",
  ].join("\n");
};

const getAccessToken = async (options: MicrosoftEntraDirectoryOptions) => {
  const tokenUrl =
    options.tokenUrl ??
    `https://login.microsoftonline.com/${encodeURIComponent(options.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    grant_type: "client_credentials",
    scope: getMicrosoftGraphScope(options),
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "@eventcatalog/connectors",
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Microsoft Entra directory connector failed to get an access token (${response.status} ${response.statusText}): ${message}`,
    );
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error(
      "Microsoft Entra directory connector failed to get an access token: response did not include access_token.",
    );
  }

  return data.access_token;
};

const getMicrosoftGraphScope = (options: MicrosoftEntraDirectoryOptions) => {
  const graphBaseUrl = options.graphBaseUrl ?? DEFAULT_GRAPH_BASE_URL;
  return `${new URL(graphBaseUrl).origin}/.default`;
};

const microsoftGraphRequest = async <T>(
  options: MicrosoftEntraDirectoryOptions,
  token: string,
  url: string,
  attempt = 0,
): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ConsistencyLevel: "eventual",
      "user-agent": "@eventcatalog/connectors",
    },
  });

  if (response.status === 429 && attempt < GRAPH_RETRY_ATTEMPTS) {
    await waitForRetry(response.headers.get("retry-after"));
    return microsoftGraphRequest(options, token, url, attempt + 1);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Microsoft Entra directory connector failed (${response.status} ${response.statusText}): ${message}`,
    );
  }

  return (await response.json()) as T;
};

const paginate = async <T>(
  options: MicrosoftEntraDirectoryOptions,
  token: string,
  url: string,
): Promise<T[]> => {
  const results: T[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    const response: MicrosoftGraphCollection<T> = await microsoftGraphRequest<
      MicrosoftGraphCollection<T>
    >(options, token, nextUrl);
    results.push(...(response.value ?? []));
    nextUrl = response["@odata.nextLink"];
  }

  return results;
};

const buildMicrosoftGraphUrl = (
  options: MicrosoftEntraDirectoryOptions,
  pathname: string,
  query?: Record<string, string>,
) => {
  const baseUrl = options.graphBaseUrl ?? DEFAULT_GRAPH_BASE_URL;
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPathname = pathname.replace(/^\//u, "");
  const url = new URL(normalizedPathname, normalizedBaseUrl);

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  return url.toString();
};

const assertUniqueTeamIds = (groups: ResolvedGroupInput[]) => {
  const teamIds = new Map<string, string>();

  for (const { group, alias } of groups) {
    const displayName = group.displayName ?? group.id;
    const teamId = alias ?? slugify(displayName);
    const existingGroupId = teamIds.get(teamId);

    if (existingGroupId) {
      throw new Error(
        `Microsoft Entra directory connector resolved duplicate team id "${teamId}" from groups "${existingGroupId}" and "${group.id}". Set alias for one of the groups.`,
      );
    }

    teamIds.set(teamId, group.id);
  }
};

const slugify = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || value;
};

const escapeODataString = (value: string) => value.replace(/'/g, "''");

const waitForRetry = async (retryAfter: string | null) => {
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : 1;
  const delayMs = Number.isFinite(retryAfterSeconds)
    ? Math.max(retryAfterSeconds, 0) * 1000
    : 1000;

  await new Promise((resolve) => setTimeout(resolve, delayMs));
};
