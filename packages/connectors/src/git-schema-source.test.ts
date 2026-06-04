import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gitSchemaSource } from "./git-schema-source";

const { cloneMock } = vi.hoisted(() => ({
  cloneMock: vi.fn(),
}));

vi.mock("simple-git", () => ({
  default: vi.fn(() => ({
    clone: cloneMock,
  })),
}));

describe("gitSchemaSource", () => {
  beforeEach(() => {
    cloneMock.mockReset();
  });

  it("resolves schemas from a configured git source", async () => {
    cloneMock.mockImplementationOnce(async (_url: string, target: string) => {
      const schemaDir = path.join(target, "schemas", "events");
      await mkdir(schemaDir, { recursive: true });
      await writeFile(
        path.join(schemaDir, "OrderPlaced.schema.json"),
        '{"type":"object"}',
      );
    });

    const source = gitSchemaSource({
      name: "contracts",
      url: "https://github.com/acme/schema-contracts.git",
      ref: "main",
      directory: "schemas",
      token: "github-token",
    });

    await expect(
      source.resolve("git://contracts/events/OrderPlaced.schema.json"),
    ).resolves.toEqual({
      id: "git://contracts/events/OrderPlaced.schema.json",
      name: "OrderPlaced.schema.json",
      format: "jsonschema",
      content: '{"type":"object"}',
      source: {
        provider: "git",
        id: "contracts:events/OrderPlaced.schema.json",
        url: "https://github.com/acme/schema-contracts.git",
        ref: "main",
        path: "schemas/events/OrderPlaced.schema.json",
      },
    });

    expect(
      source.canResolve("git://contracts/events/OrderPlaced.schema.json"),
    ).toBe(true);
    expect(
      source.canResolve("git://other/events/OrderPlaced.schema.json"),
    ).toBe(false);
    expect(cloneMock).toHaveBeenCalledWith(
      "https://github-token:x-oauth-basic@github.com/acme/schema-contracts.git",
      expect.any(String),
      {
        "--branch": "main",
        "--depth": 1,
        "--single-branch": null,
      },
    );
  });

  it("reuses the checkout for multiple schema resolutions", async () => {
    cloneMock.mockImplementationOnce(async (_url: string, target: string) => {
      const schemaDir = path.join(target, "schemas", "events");
      await mkdir(schemaDir, { recursive: true });
      await writeFile(
        path.join(schemaDir, "OrderPlaced.schema.json"),
        '{"type":"object"}',
      );
      await writeFile(
        path.join(schemaDir, "OrderCancelled.avsc"),
        '{"type":"record"}',
      );
    });

    const source = gitSchemaSource({
      name: "contracts",
      url: "https://github.com/acme/schema-contracts.git",
      directory: "schemas",
    });

    await expect(
      source.resolve("git://contracts/events/OrderPlaced.schema.json"),
    ).resolves.toMatchObject({
      format: "jsonschema",
    });
    await expect(
      source.resolve("git://contracts/events/OrderCancelled.avsc"),
    ).resolves.toMatchObject({
      format: "avro",
    });

    expect(cloneMock).toHaveBeenCalledTimes(1);
  });

  it("reports a clear error when the schema file does not exist in the checkout", async () => {
    cloneMock.mockImplementationOnce(async (_url: string, target: string) => {
      await mkdir(path.join(target, "schemas", "events"), { recursive: true });
    });

    const source = gitSchemaSource({
      name: "contracts",
      url: "https://github.com/acme/schema-contracts.git",
      ref: "main",
      directory: "schemas",
    });

    await expect(
      source.resolve("git://contracts/events/Missing.schema.json"),
    ).rejects.toThrow(
      'Git schema source "contracts" could not find schema file "schemas/events/Missing.schema.json" in "https://github.com/acme/schema-contracts.git" at ref "main".',
    );
  });

  it("requires a valid git schema ref", async () => {
    const source = gitSchemaSource({
      name: "contracts",
      url: "https://github.com/acme/schema-contracts.git",
    });

    await expect(
      source.resolve("github://contracts/events/OrderPlaced.schema.json"),
    ).rejects.toThrow(
      'Invalid git schema ref "github://contracts/events/OrderPlaced.schema.json". Expected git://<source-name>/<path>.',
    );
  });

  it("prevents schema refs escaping the checked out source directory", async () => {
    cloneMock.mockResolvedValueOnce(undefined);

    const source = gitSchemaSource({
      name: "contracts",
      url: "https://github.com/acme/schema-contracts.git",
      directory: "..",
    });

    await expect(
      source.resolve("git://contracts/package.json"),
    ).rejects.toThrow(
      'Schema path "../package.json" resolves outside the git schema source directory.',
    );
  });

  it("requires a source name and repository url", () => {
    expect(() =>
      gitSchemaSource({
        name: "",
        url: "https://github.com/acme/schema-contracts.git",
      }),
    ).toThrow("Git schema source requires a name.");

    expect(() =>
      gitSchemaSource({
        name: "contracts",
        url: "",
      }),
    ).toThrow("Git schema source requires a repository url.");
  });
});
