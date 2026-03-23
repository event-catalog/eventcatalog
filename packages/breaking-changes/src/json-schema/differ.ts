import type { SchemaChange } from "../types";

type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  [key: string]: any;
};

export const diffJsonSchemas = (
  before: JsonSchemaObject,
  after: JsonSchemaObject,
): SchemaChange[] => {
  const changes: SchemaChange[] = [];
  compareProperties(before, after, "", changes);
  return changes;
};

const compareProperties = (
  before: JsonSchemaObject,
  after: JsonSchemaObject,
  prefix: string,
  changes: SchemaChange[],
): void => {
  const beforeProps = before.properties || {};
  const afterProps = after.properties || {};
  const beforeRequired = new Set(before.required || []);
  const afterRequired = new Set(after.required || []);

  const allFields = new Set([
    ...Object.keys(beforeProps),
    ...Object.keys(afterProps),
  ]);

  for (const field of allFields) {
    const fullPath = prefix ? `${prefix}.${field}` : field;
    const inBefore = field in beforeProps;
    const inAfter = field in afterProps;

    if (!inBefore && inAfter) {
      const isRequired = afterRequired.has(field);
      changes.push({
        type: isRequired ? "FIELD_ADDED_REQUIRED" : "FIELD_ADDED_OPTIONAL",
        field: fullPath,
        message: `${isRequired ? "Required" : "Optional"} field '${fullPath}' was added`,
      });
      continue;
    }

    if (inBefore && !inAfter) {
      const wasRequired = beforeRequired.has(field);
      changes.push({
        type: wasRequired ? "FIELD_REMOVED_REQUIRED" : "FIELD_REMOVED_OPTIONAL",
        field: fullPath,
        message: `${wasRequired ? "Required" : "Optional"} field '${fullPath}' was removed`,
      });
      continue;
    }

    // Field exists in both — check type
    const beforeType = beforeProps[field].type;
    const afterType = afterProps[field].type;

    if (beforeType && afterType && beforeType !== afterType) {
      changes.push({
        type: "TYPE_CHANGED",
        field: fullPath,
        message: `Field '${fullPath}' type changed from '${beforeType}' to '${afterType}'`,
        previousType: beforeType,
        currentType: afterType,
      });
    }

    // Check required status change
    const wasPreviouslyRequired = beforeRequired.has(field);
    const isNowRequired = afterRequired.has(field);

    if (!wasPreviouslyRequired && isNowRequired) {
      changes.push({
        type: "REQUIRED_ADDED",
        field: fullPath,
        message: `Field '${fullPath}' was made required`,
      });
    } else if (wasPreviouslyRequired && !isNowRequired) {
      changes.push({
        type: "REQUIRED_REMOVED",
        field: fullPath,
        message: `Field '${fullPath}' was made optional`,
      });
    }

    // Recurse into nested objects
    if (
      beforeProps[field].type === "object" ||
      afterProps[field].type === "object"
    ) {
      compareProperties(
        beforeProps[field],
        afterProps[field],
        fullPath,
        changes,
      );
    }
  }
};
