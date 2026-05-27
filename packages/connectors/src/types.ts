/**
 * Describes where a generated directory entry came from.
 *
 * EventCatalog uses the provider to show source badges and to treat generated
 * resources as externally managed.
 */
export type DirectoryEntrySource = {
  /** Provider identifier, for example `github`, `okta`, or `ldap`. */
  provider: string;
  /** Optional provider-specific identifier for the external resource. */
  id?: string;
  /** Optional URL back to the resource in the external provider. */
  url?: string;
  [key: string]: unknown;
};

/**
 * User returned by a directory source.
 *
 * Directory users are synced as read-only EventCatalog users and can be
 * referenced by teams through their `id`.
 */
export type DirectoryUser = {
  id: string;
  name: string;
  avatarUrl: string;
  role?: string;
  email?: string;
  markdown?: string;
  source?: DirectoryEntrySource;
  [key: string]: unknown;
};

/**
 * Team returned by a directory source.
 *
 * Directory teams are synced as read-only EventCatalog teams.
 */
export type DirectoryTeam = {
  id: string;
  name: string;
  summary?: string;
  /** User IDs for members of this team. */
  members?: string[];
  email?: string;
  markdown?: string;
  source?: DirectoryEntrySource;
  [key: string]: unknown;
};

/**
 * Loads users and/or teams from an external directory provider.
 *
 * EventCatalog calls these loaders during content sync, writes the returned
 * entries into Astro collections, and mirrors them into the generated
 * `.eventcatalog/store/directory.json` file for SDK/editor reads.
 */
export type DirectorySource = {
  type: "directory";
  /** Stable source identifier, usually `<provider>:<account-or-org>`. */
  name: string;
  /** Optional stable cache key for this source configuration. */
  cacheKey?: string;
  /** Load users from the external directory. */
  loadUsers?: () => Promise<DirectoryUser[]>;
  /** Load teams from the external directory. */
  loadTeams?: () => Promise<DirectoryTeam[]>;
};

/**
 * Defines a custom directory source with type inference for connector authors.
 */
export const defineDirectorySource = <TSource extends DirectorySource>(
  source: TSource,
) => source;
