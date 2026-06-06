import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import simpleGit from "simple-git";
import {
  defineSchemaSource,
  type SchemaEntry,
  type SchemaSource,
} from "./types";

type GitSchemaSourceOptions = {
  /**
   * Stable source name used in schema refs, for example:
   * `git://contracts/events/OrderPlaced.schema.json`.
   */
  name: string;
  /** Git repository URL. Supports any URL your local git can clone. */
  url: string;
  /** Branch to clone. */
  branch?: string;
  /** Optional directory inside the repository that contains schemas. */
  directory?: string;
  /** Optional HTTPS token. SSH auth is handled by the local git environment. */
  token?: string;
};

const getSchemaFormat = (filePath: string) => {
  const extension = path.extname(filePath).replace(".", "").toLowerCase();

  if (extension === "avsc" || extension === "avro") return "avro";
  if (extension === "proto") return "protobuf";
  if (extension === "json") return "jsonschema";
  if (extension === "yaml" || extension === "yml") return "yaml";

  return extension || "unknown";
};

const parseGitSchemaRef = (ref: string) => {
  let url: URL;

  try {
    url = new URL(ref);
  } catch {
    throw new Error(
      `Invalid git schema ref "${ref}". Expected git://<source-name>/<path>.`,
    );
  }

  if (url.protocol !== "git:") {
    throw new Error(
      `Invalid git schema ref "${ref}". Expected git://<source-name>/<path>.`,
    );
  }

  const filePath = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!url.hostname || !filePath) {
    throw new Error(
      `Invalid git schema ref "${ref}". Expected git://<source-name>/<path>.`,
    );
  }

  if (filePath.split(/[\\/]/).includes("..")) {
    throw new Error(
      `Schema path "${filePath}" resolves outside the git schema source directory.`,
    );
  }

  return {
    sourceName: url.hostname,
    filePath,
  };
};

const addTokenToHttpsUrl = (url: string, token?: string) => {
  if (!token || !url.startsWith("https://")) return url;

  const parsed = new URL(url);
  parsed.username = token;
  parsed.password = "x-oauth-basic";
  return parsed.toString();
};

const resolveInside = (basePath: string, ...segments: string[]) => {
  const base = path.resolve(basePath);
  const resolved = path.resolve(base, ...segments);

  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error(
      `Schema path "${segments.join("/")}" resolves outside the git schema source directory.`,
    );
  }

  return resolved;
};

const isNodeFileNotFoundError = (
  error: unknown,
): error is NodeJS.ErrnoException => {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
};

export const gitSchemaSource = (
  options: GitSchemaSourceOptions,
): SchemaSource => {
  if (!options.name) {
    throw new Error("Git schema source requires a name.");
  }

  if (!options.url) {
    throw new Error("Git schema source requires a repository url.");
  }

  const branch = options.branch ?? "main";
  const directory = options.directory ?? "";
  let checkoutPath: Promise<string> | undefined;

  const checkout = async () => {
    checkoutPath =
      checkoutPath ??
      (async () => {
        const target = await mkdtemp(
          path.join(tmpdir(), "eventcatalog-schema-git-"),
        );
        await simpleGit().clone(
          addTokenToHttpsUrl(options.url, options.token),
          target,
          {
            "--branch": branch,
            "--depth": 1,
            "--single-branch": null,
          },
        );
        return target;
      })();

    return checkoutPath;
  };

  return defineSchemaSource({
    type: "schemas",
    name: options.name,
    canResolve: (id) => {
      if (!id.startsWith("git://")) return false;
      return parseGitSchemaRef(id).sourceName === options.name;
    },
    resolve: async (id): Promise<SchemaEntry | undefined> => {
      const { sourceName, filePath } = parseGitSchemaRef(id);
      if (sourceName !== options.name) return undefined;

      const repositoryPath = await checkout();
      const schemaPath = resolveInside(repositoryPath, directory, filePath);
      let content: string;

      try {
        content = await readFile(schemaPath, "utf8");
      } catch (error) {
        if (isNodeFileNotFoundError(error)) {
          const schemaSourcePath = [directory, filePath]
            .filter(Boolean)
            .join("/");
          throw new Error(
            `Git schema source "${options.name}" could not find schema file "${schemaSourcePath}" in "${options.url}" on branch "${branch}".`,
          );
        }

        throw error;
      }

      return {
        id,
        name: path.basename(filePath),
        format: getSchemaFormat(filePath),
        content,
        source: {
          provider: "git",
          id: `${options.name}:${filePath}`,
          url: options.url,
          branch,
          path: [directory, filePath].filter(Boolean).join("/"),
        },
      };
    },
  });
};
