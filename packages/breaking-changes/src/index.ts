export type {
  CompatibilityStrategy,
  SchemaChange,
  BreakingChange,
  SchemaChangeType,
} from "./types";

export { detectBreakingChanges } from "./json-schema/rules";
export { diffJsonSchemas } from "./json-schema/differ";
