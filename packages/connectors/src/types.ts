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
  avatarUrl?: string;
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

/**
 * Describes where a synced schema came from.
 */
export type SchemaEntrySource = {
  /** Provider identifier, for example `git`, `github`, `confluent`, or `eventbridge`. */
  provider: string;
  /** Optional provider-specific identifier for the external schema. */
  id?: string;
  /** Optional URL back to the schema source. */
  url?: string;
  /** Optional version/ref/branch for versioned sources. */
  ref?: string;
  /** Optional branch for git-backed schema sources. */
  branch?: string;
  /** Optional path inside the source. */
  path?: string;
  [key: string]: unknown;
};

/**
 * Schema returned by an external schema source.
 */
export type SchemaEntry = {
  id: string;
  name?: string;
  format?: string;
  content: string;
  source: SchemaEntrySource;
};

export type SchemaResolveContext = {
  /** Absolute path to the message file that referenced the schema. */
  messageFilePath?: string;
};

/**
 * Loads schemas from an external source.
 *
 * EventCatalog calls schema sources during content sync to resolve schema
 * references from messages into generated schema collection entries.
 */
export type SchemaSource = {
  type: "schemas";
  /** Stable source identifier used in schema refs, for example `contracts`. */
  name: string;
  /** Returns true when this source can resolve the given schema ref. */
  canResolve: (ref: string) => boolean;
  /** Resolves a schema ref into schema content and source metadata. */
  resolve: (
    ref: string,
    context?: SchemaResolveContext,
  ) => Promise<SchemaEntry | undefined>;
};

/**
 * Defines a custom schema source with type inference for connector authors.
 */
export const defineSchemaSource = <TSource extends SchemaSource>(
  source: TSource,
) => source;
