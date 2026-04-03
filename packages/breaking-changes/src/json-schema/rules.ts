import type {
  CompatibilityStrategy,
  SchemaChange,
  BreakingChange,
  SchemaChangeType,
} from "../types";
import { diffJsonSchemas } from "./differ";

const BREAKING_RULES: Record<CompatibilityStrategy, Set<SchemaChangeType>> = {
  BACKWARD: new Set([
    "FIELD_ADDED_REQUIRED",
    "FIELD_REMOVED_REQUIRED",
    "TYPE_CHANGED",
    "REQUIRED_ADDED",
  ]),
  FORWARD: new Set([
    "FIELD_ADDED_REQUIRED",
    "FIELD_REMOVED_REQUIRED",
    "TYPE_CHANGED",
    "REQUIRED_ADDED",
  ]),
  FULL: new Set([
    "FIELD_ADDED_REQUIRED",
    "FIELD_REMOVED_REQUIRED",
    "TYPE_CHANGED",
    "REQUIRED_ADDED",
  ]),
  NONE: new Set(),
};

export const detectBreakingChanges = (
  before: object,
  after: object,
  strategy: CompatibilityStrategy,
): BreakingChange[] => {
  if (strategy === "NONE") return [];

  const changes = diffJsonSchemas(before, after);
  const breakingTypes = BREAKING_RULES[strategy];

  return changes
    .filter((change) => breakingTypes.has(change.type))
    .map((change) => ({ ...change, breaking: true as const }));
};
