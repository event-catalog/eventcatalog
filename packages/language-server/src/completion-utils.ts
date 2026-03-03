import { parseSpec } from "./resolvers/asyncapi.js";
import { parseOpenApiSpec } from "./resolvers/openapi.js";
import { detectSpecType } from "./resolvers/resolve.js";
import type { SpecMessage, SpecChannel } from "./resolvers/types.js";

export interface ParsedSpecResult {
  messages: Map<string, SpecMessage>;
  channels: Map<string, SpecChannel>;
}

export function collectRegexMatches(pattern: RegExp, text: string): string[] {
  const results: string[] = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    results.push(m[1]);
  }
  return results;
}

/**
 * Extract version numbers for resources from workspace text.
 * Optionally filter to a single resource type for efficiency.
 */
export function extractResourceVersions(
  text: string,
  filterType?: string,
): Map<string, string[]> {
  const versions = new Map<string, string[]>();
  const allTypes = [
    "event",
    "command",
    "query",
    "channel",
    "service",
    "domain",
    "flow",
    "container",
    "data-product",
  ];
  const resourceTypes = filterType
    ? allTypes.filter((t) => t === filterType)
    : allTypes;

  for (const type of resourceTypes) {
    const defRegex = new RegExp(
      `\\b${type}\\s+([a-zA-Z_][a-zA-Z0-9_.{}\\-]*)\\s*\\{[^}]*?version\\s+(\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9_.]+)*)`,
      "g",
    );
    let match;
    const seen = new Set<string>();
    while ((match = defRegex.exec(text)) !== null) {
      const key = `${type}:${match[1]}`;
      const ver = match[2];
      const dedup = `${key}:${ver}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      const arr = versions.get(key) ?? [];
      arr.push(ver);
      versions.set(key, arr);
    }

    const inlineRegex = new RegExp(
      `\\b(?:sends|receives)\\s+${type}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{[^}]*?version\\s+(\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9_.]+)*)`,
      "g",
    );
    while ((match = inlineRegex.exec(text)) !== null) {
      const key = `${type}:${match[1]}`;
      const ver = match[2];
      const dedup = `${key}:${ver}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      const arr = versions.get(key) ?? [];
      arr.push(ver);
      versions.set(key, arr);
    }
  }

  return versions;
}

/**
 * Parse a spec file, auto-detecting AsyncAPI vs OpenAPI format.
 */
export function parseSpecAuto(content: string): ParsedSpecResult {
  const specType = detectSpecType(content);
  if (specType === "openapi") {
    const parsed = parseOpenApiSpec(content);
    return {
      messages: parsed.messages as Map<string, SpecMessage>,
      channels: new Map(),
    };
  }
  const parsed = parseSpec(content);
  return { messages: parsed.messages, channels: parsed.channels };
}

/**
 * Collect all channel names from workspace text via regex patterns.
 */
export function collectChannelNames(allText: string): Set<string> {
  return new Set([
    ...collectRegexMatches(
      /\bchannel\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)\s*\{/g,
      allText,
    ),
    ...collectRegexMatches(
      /\b(?:sends|receives)\s+(?:event|command|query)\s+[a-zA-Z_][a-zA-Z0-9_.\-]*(?:@[^\s]*)?\s+(?:to|from)\s+([a-zA-Z_][a-zA-Z0-9_.\-]*)/g,
      allText,
    ),
    ...collectRegexMatches(
      /import\s+channels\s*\{([^}]*)\}\s*from\s*"[^"]+"/g,
      allText,
    ).flatMap((match) =>
      match
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]);
}

/**
 * Collect all message names of a given type from workspace text via regex patterns.
 */
export function collectMessageNames(
  allText: string,
  msgType: string,
  pluralType: string,
): Set<string> {
  return new Set([
    ...collectRegexMatches(
      new RegExp(`\\b${msgType}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{`, "g"),
      allText,
    ),
    ...collectRegexMatches(
      new RegExp(
        `\\b(?:sends|receives)\\s+${msgType}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)`,
        "g",
      ),
      allText,
    ),
    ...collectRegexMatches(
      new RegExp(
        `import\\s+${pluralType}\\s*\\{([^}]*)\\}\\s*from\\s*"[^"]+"`,
        "g",
      ),
      allText,
    ).flatMap((match) =>
      match
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]);
}

/**
 * Walk text tracking brace depth to determine which resource block the cursor is inside.
 * Returns the resource type string (e.g. "service", "domain") or null if at top level.
 */
export function findEnclosingResource(text: string): string | null {
  const stack: string[] = [];
  const tokenRegex =
    /\b(domain|service|event|command|query|channel|user|team|flow|container|data-product|subdomain|visualizer|actor|external-system)\b(?:[^{}]|\{[a-zA-Z0-9_]+\})*\{|\{|\}/g;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    if (token === "}") {
      stack.pop();
    } else if (token === "{") {
      stack.push("unknown");
    } else {
      stack.push(match[1]);
    }
  }

  if (stack.length === 0) return null;
  const top = stack[stack.length - 1];
  return top === "subdomain" ? "domain" : top;
}

const EC_RESOURCE_TYPES = [
  "service",
  "event",
  "command",
  "query",
  "domain",
  "channel",
  "flow",
  "container",
  "data-product",
  "actor",
  "external-system",
];

/**
 * Extract top-level resource names defined in a single .ec file's text.
 */
export function extractResourceNamesFromText(text: string): Set<string> {
  const names = new Set<string>();
  for (const type of EC_RESOURCE_TYPES) {
    const regex = new RegExp(
      `\\b${type}\\s+([a-zA-Z_][a-zA-Z0-9_.\\-]*)\\s*\\{`,
      "g",
    );
    for (const name of collectRegexMatches(regex, text)) {
      names.add(name);
    }
  }
  return names;
}
