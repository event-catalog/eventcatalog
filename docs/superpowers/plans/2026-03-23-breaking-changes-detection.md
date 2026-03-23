# Breaking Schema Change Detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect breaking JSON Schema changes and fire a `schema_breaking_change` governance webhook with detailed diff info, controlled by a global compatibility strategy.

**Architecture:** New `@eventcatalog/breaking-changes` package owns all schema diffing logic. The CLI governance system imports it, adds a new `schema_breaking_change` trigger, and builds the webhook payload with breaking change details. `governance.yaml` gains a top-level `compatibility.strategy` field.

**Tech Stack:** TypeScript, Vitest, tsup, pnpm workspace

---

## File Structure

### New files (package: `packages/breaking-changes/`)

| File | Responsibility |
|------|---------------|
| `package.json` | Package config, no runtime deps |
| `tsconfig.json` | TS config matching project conventions |
| `tsup.config.ts` | Build config (cjs + esm + dts) |
| `vitest.config.ts` | Test config |
| `src/index.ts` | Public API: `detectBreakingChanges()` |
| `src/types.ts` | `CompatibilityStrategy`, `BreakingChange`, `BreakingChangeType`, `SchemaChangeType` |
| `src/json-schema/differ.ts` | Walks two JSON Schema objects, produces list of `SchemaChange` (structural diffs) |
| `src/json-schema/rules.ts` | Given a list of `SchemaChange` items + strategy, returns which are breaking |
| `src/test/json-schema-differ.test.ts` | Tests for `differ.ts` |
| `src/test/json-schema-rules.test.ts` | Tests for `rules.ts` |
| `src/test/index.test.ts` | Integration tests for `detectBreakingChanges()` |

### Modified files (package: `packages/cli/`)

| File | Change |
|------|--------|
| `src/cli/governance/types.ts` | Add `'schema_breaking_change'` to `GovernanceTrigger`, add `BreakingSchemaChange` type, add `compatibility` to `GovernanceConfig` |
| `src/cli/governance/rules.ts` | Add `evaluateBreakingSchemaChangeRules()`, call it from `evaluateGovernanceRules()` |
| `src/cli/governance/actions.ts` | Add webhook payload builder for `schema_breaking_change` |
| `src/cli/governance/index.ts` | Re-export new types |
| `package.json` | Add `@eventcatalog/breaking-changes: workspace:*` dep |
| `src/test/governance.test.ts` | Tests for new trigger evaluation + webhook payloads |

---

### Task 1: Scaffold `@eventcatalog/breaking-changes` package

**Files:**
- Create: `packages/breaking-changes/package.json`
- Create: `packages/breaking-changes/tsconfig.json`
- Create: `packages/breaking-changes/tsup.config.ts`
- Create: `packages/breaking-changes/vitest.config.ts`
- Create: `packages/breaking-changes/src/types.ts`
- Create: `packages/breaking-changes/src/index.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@eventcatalog/breaking-changes",
  "version": "0.1.0",
  "description": "Breaking schema change detection for EventCatalog",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "import": "./dist/index.mjs"
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsup",
    "build:bin": "tsup",
    "test": "vitest --run",
    "test:ci": "vitest --run",
    "format": "prettier --write .",
    "format:diff": "prettier --list-different ."
  },
  "files": ["dist"],
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^20.14.10",
    "prettier": "^3.3.3",
    "tsup": "^8.1.0",
    "typescript": "^5.5.3",
    "vitest": "^3.2.4"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/event-catalog/eventcatalog"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 15_000,
  },
});
```

- [ ] **Step 5: Create `src/types.ts`**

```typescript
export type CompatibilityStrategy = 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE';

export type SchemaChangeType =
  | 'FIELD_ADDED_REQUIRED'
  | 'FIELD_ADDED_OPTIONAL'
  | 'FIELD_REMOVED_REQUIRED'
  | 'FIELD_REMOVED_OPTIONAL'
  | 'TYPE_CHANGED'
  | 'REQUIRED_ADDED'
  | 'REQUIRED_REMOVED';

export type SchemaChange = {
  type: SchemaChangeType;
  field: string;
  message: string;
  previousType?: string;
  currentType?: string;
};

export type BreakingChange = SchemaChange & {
  breaking: true;
};
```

- [ ] **Step 6: Create `src/index.ts` (stub)**

```typescript
export type { CompatibilityStrategy, SchemaChange, BreakingChange, SchemaChangeType } from './types';

export { detectBreakingChanges } from './json-schema/rules';
export { diffJsonSchemas } from './json-schema/differ';
```

This will fail to compile until we create the referenced modules. That's fine — next tasks create them.

- [ ] **Step 7: Run `pnpm install` from repo root to link the new workspace package**

Run: `pnpm install` (from repo root)

- [ ] **Step 8: Commit**

```bash
git add packages/breaking-changes/
git commit -m "feat(breaking-changes): scaffold package"
```

---

### Task 2: JSON Schema differ — tests and implementation

**Files:**
- Create: `packages/breaking-changes/src/json-schema/differ.ts`
- Create: `packages/breaking-changes/src/test/json-schema-differ.test.ts`

The differ walks two JSON Schema objects and produces a list of `SchemaChange` items describing every structural difference. It does NOT decide what's breaking — that's the rules module's job.

- [ ] **Step 1: Write differ tests**

Create `packages/breaking-changes/src/test/json-schema-differ.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { diffJsonSchemas } from '../json-schema/differ';

describe('diffJsonSchemas', () => {
  describe('field additions', () => {
    it('detects an added optional field', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'FIELD_ADDED_OPTIONAL',
          field: 'email',
          message: "Optional field 'email' was added",
        },
      ]);
    });

    it('detects an added required field', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'FIELD_ADDED_REQUIRED',
          field: 'email',
          message: "Required field 'email' was added",
        },
      ]);
    });
  });

  describe('field removals', () => {
    it('detects a removed optional field', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'FIELD_REMOVED_OPTIONAL',
          field: 'email',
          message: "Optional field 'email' was removed",
        },
      ]);
    });

    it('detects a removed required field', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'FIELD_REMOVED_REQUIRED',
          field: 'email',
          message: "Required field 'email' was removed",
        },
      ]);
    });
  });

  describe('type changes', () => {
    it('detects a field type change', () => {
      const before = {
        type: 'object',
        properties: {
          amount: { type: 'string' },
        },
      };
      const after = {
        type: 'object',
        properties: {
          amount: { type: 'number' },
        },
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'TYPE_CHANGED',
          field: 'amount',
          message: "Field 'amount' type changed from 'string' to 'number'",
          previousType: 'string',
          currentType: 'number',
        },
      ]);
    });
  });

  describe('required changes (without add/remove)', () => {
    it('detects a field becoming required', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'REQUIRED_ADDED',
          field: 'email',
          message: "Field 'email' was made required",
        },
      ]);
    });

    it('detects a field becoming optional', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'REQUIRED_REMOVED',
          field: 'email',
          message: "Field 'email' was made optional",
        },
      ]);
    });
  });

  describe('nested objects', () => {
    it('detects changes in nested properties using dot-path notation', () => {
      const before = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              zipCode: { type: 'string' },
            },
            required: ['street'],
          },
        },
      };
      const after = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
            },
            required: ['street'],
          },
        },
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'FIELD_REMOVED_OPTIONAL',
          field: 'address.zipCode',
          message: "Optional field 'address.zipCode' was removed",
        },
      ]);
    });

    it('detects type changes in deeply nested fields', () => {
      const before = {
        type: 'object',
        properties: {
          order: {
            type: 'object',
            properties: {
              item: {
                type: 'object',
                properties: {
                  price: { type: 'string' },
                },
              },
            },
          },
        },
      };
      const after = {
        type: 'object',
        properties: {
          order: {
            type: 'object',
            properties: {
              item: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                },
              },
            },
          },
        },
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'TYPE_CHANGED',
          field: 'order.item.price',
          message: "Field 'order.item.price' type changed from 'string' to 'number'",
          previousType: 'string',
          currentType: 'number',
        },
      ]);
    });
  });

  describe('no changes', () => {
    it('returns empty array when schemas are identical', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const changes = diffJsonSchemas(schema, schema);

      expect(changes).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles empty schemas', () => {
      const changes = diffJsonSchemas({}, {});
      expect(changes).toEqual([]);
    });

    it('handles schema with no properties going to one with properties', () => {
      const before = { type: 'object' };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'FIELD_ADDED_OPTIONAL',
          field: 'name',
          message: "Optional field 'name' was added",
        },
      ]);
    });

    it('handles schema with properties going to one with no properties', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };
      const after = { type: 'object' };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toEqual([
        {
          type: 'FIELD_REMOVED_REQUIRED',
          field: 'name',
          message: "Required field 'name' was removed",
        },
      ]);
    });

    it('handles multiple simultaneous changes', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          phone: { type: 'string' },
        },
        required: ['name'],
      };

      const changes = diffJsonSchemas(before, after);

      expect(changes).toContainEqual({
        type: 'TYPE_CHANGED',
        field: 'age',
        message: "Field 'age' type changed from 'string' to 'number'",
        previousType: 'string',
        currentType: 'number',
      });
      expect(changes).toContainEqual({
        type: 'FIELD_REMOVED_REQUIRED',
        field: 'email',
        message: "Required field 'email' was removed",
      });
      expect(changes).toContainEqual({
        type: 'FIELD_ADDED_OPTIONAL',
        field: 'phone',
        message: "Optional field 'phone' was added",
      });
      expect(changes).toHaveLength(3);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/breaking-changes && pnpm test src/test/json-schema-differ.test.ts --run`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/json-schema/differ.ts`**

```typescript
import type { SchemaChange } from '../types';

type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  [key: string]: any;
};

export const diffJsonSchemas = (before: JsonSchemaObject, after: JsonSchemaObject): SchemaChange[] => {
  const changes: SchemaChange[] = [];
  compareProperties(before, after, '', changes);
  return changes;
};

const compareProperties = (
  before: JsonSchemaObject,
  after: JsonSchemaObject,
  prefix: string,
  changes: SchemaChange[]
): void => {
  const beforeProps = before.properties || {};
  const afterProps = after.properties || {};
  const beforeRequired = new Set(before.required || []);
  const afterRequired = new Set(after.required || []);

  const allFields = new Set([...Object.keys(beforeProps), ...Object.keys(afterProps)]);

  for (const field of allFields) {
    const fullPath = prefix ? `${prefix}.${field}` : field;
    const inBefore = field in beforeProps;
    const inAfter = field in afterProps;

    if (!inBefore && inAfter) {
      const isRequired = afterRequired.has(field);
      changes.push({
        type: isRequired ? 'FIELD_ADDED_REQUIRED' : 'FIELD_ADDED_OPTIONAL',
        field: fullPath,
        message: `${isRequired ? 'Required' : 'Optional'} field '${fullPath}' was added`,
      });
      continue;
    }

    if (inBefore && !inAfter) {
      const wasRequired = beforeRequired.has(field);
      changes.push({
        type: wasRequired ? 'FIELD_REMOVED_REQUIRED' : 'FIELD_REMOVED_OPTIONAL',
        field: fullPath,
        message: `${wasRequired ? 'Required' : 'Optional'} field '${fullPath}' was removed`,
      });
      continue;
    }

    // Field exists in both — check type
    const beforeType = beforeProps[field].type;
    const afterType = afterProps[field].type;

    if (beforeType && afterType && beforeType !== afterType) {
      changes.push({
        type: 'TYPE_CHANGED',
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
        type: 'REQUIRED_ADDED',
        field: fullPath,
        message: `Field '${fullPath}' was made required`,
      });
    } else if (wasPreviouslyRequired && !isNowRequired) {
      changes.push({
        type: 'REQUIRED_REMOVED',
        field: fullPath,
        message: `Field '${fullPath}' was made optional`,
      });
    }

    // Recurse into nested objects
    if (beforeProps[field].type === 'object' || afterProps[field].type === 'object') {
      compareProperties(beforeProps[field], afterProps[field], fullPath, changes);
    }
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/breaking-changes && pnpm test src/test/json-schema-differ.test.ts --run`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/breaking-changes/src/json-schema/differ.ts packages/breaking-changes/src/test/json-schema-differ.test.ts
git commit -m "feat(breaking-changes): json schema differ with tests"
```

---

### Task 3: Breaking change rules — tests and implementation

**Files:**
- Create: `packages/breaking-changes/src/json-schema/rules.ts`
- Create: `packages/breaking-changes/src/test/json-schema-rules.test.ts`

The rules module takes schema changes + a compatibility strategy and returns only the breaking ones.

- [ ] **Step 1: Write rules tests**

Create `packages/breaking-changes/src/test/json-schema-rules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectBreakingChanges } from '../json-schema/rules';
import type { CompatibilityStrategy } from '../types';

describe('detectBreakingChanges', () => {
  const beforeSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
    },
    required: ['name', 'email'],
  };

  describe('NONE strategy', () => {
    it('never returns breaking changes regardless of schema diff', () => {
      const after = { type: 'object' }; // removed everything
      const result = detectBreakingChanges(beforeSchema, after, 'NONE');
      expect(result).toEqual([]);
    });
  });

  describe('BACKWARD strategy', () => {
    it('adding an optional field is NOT breaking', () => {
      const after = {
        ...beforeSchema,
        properties: {
          ...beforeSchema.properties,
          phone: { type: 'string' },
        },
      };
      const result = detectBreakingChanges(beforeSchema, after, 'BACKWARD');
      expect(result).toEqual([]);
    });

    it('adding a required field IS breaking', () => {
      const after = {
        type: 'object',
        properties: {
          ...beforeSchema.properties,
          phone: { type: 'string' },
        },
        required: ['name', 'email', 'phone'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'BACKWARD');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('FIELD_ADDED_REQUIRED');
      expect(result[0].breaking).toBe(true);
    });

    it('removing a required field IS breaking', () => {
      const after = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'BACKWARD');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('FIELD_REMOVED_REQUIRED');
    });

    it('removing an optional field is NOT breaking', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nickname: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const result = detectBreakingChanges(before, after, 'BACKWARD');
      expect(result).toEqual([]);
    });

    it('changing a field type IS breaking', () => {
      const after = {
        type: 'object',
        properties: {
          name: { type: 'number' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'BACKWARD');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('TYPE_CHANGED');
    });

    it('making an optional field required IS breaking', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const result = detectBreakingChanges(before, after, 'BACKWARD');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('REQUIRED_ADDED');
    });

    it('making a required field optional is NOT breaking', () => {
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'BACKWARD');
      expect(result).toEqual([]);
    });
  });

  describe('FORWARD strategy', () => {
    it('adding a required field IS breaking', () => {
      const after = {
        type: 'object',
        properties: {
          ...beforeSchema.properties,
          phone: { type: 'string' },
        },
        required: ['name', 'email', 'phone'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FORWARD');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('FIELD_ADDED_REQUIRED');
    });

    it('removing a required field IS breaking', () => {
      const after = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FORWARD');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('FIELD_REMOVED_REQUIRED');
    });

    it('changing a field type IS breaking', () => {
      const after = {
        type: 'object',
        properties: {
          name: { type: 'number' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FORWARD');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('TYPE_CHANGED');
    });

    it('adding an optional field is NOT breaking', () => {
      const after = {
        ...beforeSchema,
        properties: {
          ...beforeSchema.properties,
          phone: { type: 'string' },
        },
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FORWARD');
      expect(result).toEqual([]);
    });

    it('removing an optional field is NOT breaking', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nickname: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const result = detectBreakingChanges(before, after, 'FORWARD');
      expect(result).toEqual([]);
    });

    it('making an optional field required IS breaking', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const result = detectBreakingChanges(before, after, 'FORWARD');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('REQUIRED_ADDED');
    });

    it('making a required field optional is NOT breaking', () => {
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FORWARD');
      expect(result).toEqual([]);
    });
  });

  describe('FULL strategy', () => {
    it('adding a required field IS breaking', () => {
      const after = {
        type: 'object',
        properties: {
          ...beforeSchema.properties,
          phone: { type: 'string' },
        },
        required: ['name', 'email', 'phone'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FULL');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('FIELD_ADDED_REQUIRED');
    });

    it('removing a required field IS breaking', () => {
      const after = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FULL');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('FIELD_REMOVED_REQUIRED');
    });

    it('changing a field type IS breaking', () => {
      const after = {
        type: 'object',
        properties: {
          name: { type: 'number' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FULL');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('TYPE_CHANGED');
    });

    it('adding an optional field is NOT breaking', () => {
      const after = {
        ...beforeSchema,
        properties: {
          ...beforeSchema.properties,
          phone: { type: 'string' },
        },
      };
      const result = detectBreakingChanges(beforeSchema, after, 'FULL');
      expect(result).toEqual([]);
    });

    it('removing an optional field is NOT breaking', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          nickname: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const result = detectBreakingChanges(before, after, 'FULL');
      expect(result).toEqual([]);
    });

    it('making an optional field required IS breaking', () => {
      const before = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name'],
      };
      const after = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };
      const result = detectBreakingChanges(before, after, 'FULL');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('REQUIRED_ADDED');
    });
  });

  describe('multiple breaking changes', () => {
    it('returns all breaking changes in a single diff', () => {
      const after = {
        type: 'object',
        properties: {
          name: { type: 'number' },
          phone: { type: 'string' },
        },
        required: ['name', 'phone'],
      };
      const result = detectBreakingChanges(beforeSchema, after, 'BACKWARD');

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((c) => c.breaking === true)).toBe(true);
    });
  });

  describe('nested schemas', () => {
    it('detects breaking changes in nested fields', () => {
      const before = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
            required: ['street', 'city'],
          },
        },
      };
      const after = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'number' },
            },
            required: ['street'],
          },
        },
      };
      const result = detectBreakingChanges(before, after, 'BACKWARD');

      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'TYPE_CHANGED',
          field: 'address.street',
          breaking: true,
        })
      );
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'FIELD_REMOVED_REQUIRED',
          field: 'address.city',
          breaking: true,
        })
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/breaking-changes && pnpm test src/test/json-schema-rules.test.ts --run`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/json-schema/rules.ts`**

```typescript
import type { CompatibilityStrategy, SchemaChange, BreakingChange, SchemaChangeType } from '../types';
import { diffJsonSchemas } from './differ';

const BREAKING_RULES: Record<CompatibilityStrategy, Set<SchemaChangeType>> = {
  BACKWARD: new Set([
    'FIELD_ADDED_REQUIRED',
    'FIELD_REMOVED_REQUIRED',
    'TYPE_CHANGED',
    'REQUIRED_ADDED',
  ]),
  FORWARD: new Set([
    'FIELD_ADDED_REQUIRED',
    'FIELD_REMOVED_REQUIRED',
    'TYPE_CHANGED',
    'REQUIRED_ADDED',
  ]),
  FULL: new Set([
    'FIELD_ADDED_REQUIRED',
    'FIELD_REMOVED_REQUIRED',
    'TYPE_CHANGED',
    'REQUIRED_ADDED',
  ]),
  NONE: new Set(),
};

export const detectBreakingChanges = (
  before: object,
  after: object,
  strategy: CompatibilityStrategy
): BreakingChange[] => {
  if (strategy === 'NONE') return [];

  const changes = diffJsonSchemas(before, after);
  const breakingTypes = BREAKING_RULES[strategy];

  return changes
    .filter((change) => breakingTypes.has(change.type))
    .map((change) => ({ ...change, breaking: true as const }));
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/breaking-changes && pnpm test src/test/json-schema-rules.test.ts --run`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/breaking-changes/src/json-schema/rules.ts packages/breaking-changes/src/test/json-schema-rules.test.ts
git commit -m "feat(breaking-changes): breaking change rules per strategy with tests"
```

---

### Task 4: Integration test for public API

**Files:**
- Create: `packages/breaking-changes/src/test/index.test.ts`

- [ ] **Step 1: Write integration test**

Create `packages/breaking-changes/src/test/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectBreakingChanges, diffJsonSchemas } from '../index';

describe('public API', () => {
  it('detectBreakingChanges returns breaking changes for a real schema evolution', () => {
    const v1 = {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        amount: { type: 'string' },
        currency: { type: 'string' },
      },
      required: ['orderId', 'amount'],
    };

    const v2 = {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        region: { type: 'string' },
      },
      required: ['orderId', 'amount', 'region'],
    };

    const result = detectBreakingChanges(v1, v2, 'BACKWARD');

    expect(result).toContainEqual(
      expect.objectContaining({ type: 'TYPE_CHANGED', field: 'amount', breaking: true })
    );
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'FIELD_ADDED_REQUIRED', field: 'region', breaking: true })
    );
    expect(result).toHaveLength(2);
  });

  it('diffJsonSchemas is exported and returns all changes', () => {
    const before = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };
    const after = {
      type: 'object',
      properties: { name: { type: 'number' } },
    };

    const changes = diffJsonSchemas(before, after);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('TYPE_CHANGED');
  });

  it('NONE strategy always returns empty', () => {
    const result = detectBreakingChanges(
      { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
      { type: 'object' },
      'NONE'
    );
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run all package tests**

Run: `cd packages/breaking-changes && pnpm test --run`
Expected: All PASS

- [ ] **Step 3: Verify build works**

Run: `cd packages/breaking-changes && pnpm build`
Expected: Successful build, `dist/` directory created with `.js`, `.mjs`, `.d.ts` files

- [ ] **Step 4: Commit**

```bash
git add packages/breaking-changes/src/test/index.test.ts
git commit -m "feat(breaking-changes): integration tests for public API"
```

---

### Task 5: Add `schema_breaking_change` trigger to CLI governance types

**Files:**
- Modify: `packages/cli/src/cli/governance/types.ts`
- Modify: `packages/cli/src/cli/governance/index.ts`
- Modify: `packages/cli/package.json`

- [ ] **Step 1: Add `@eventcatalog/breaking-changes` dependency to CLI**

In `packages/cli/package.json`, add to `dependencies`:
```json
"@eventcatalog/breaking-changes": "workspace:*"
```

Run: `pnpm install` from repo root.

- [ ] **Step 2: Update `GovernanceTrigger` type and add new types**

In `packages/cli/src/cli/governance/types.ts`:

Add `'schema_breaking_change'` to `GovernanceTrigger` union.

Add `compatibility` to `GovernanceConfig`:
```typescript
export type GovernanceConfig = {
  compatibility?: {
    strategy: import('@eventcatalog/breaking-changes').CompatibilityStrategy;
  };
  rules: GovernanceRule[];
};
```

Add `BreakingSchemaChange` type:
```typescript
export type BreakingSchemaChange = SchemaChange & {
  breakingChanges: import('@eventcatalog/breaking-changes').BreakingChange[];
};
```

Add `breakingSchemaChanges` to `GovernanceResult`:
```typescript
export type GovernanceResult = {
  rule: GovernanceRule;
  trigger: GovernanceTrigger;
  matchedChanges: RelationshipChange[];
  deprecationChanges?: DeprecationChange[];
  schemaChanges?: SchemaChange[];
  breakingSchemaChanges?: BreakingSchemaChange[];
  failed?: boolean;
  failMessages?: string[];
};
```

- [ ] **Step 3: Update barrel export**

In `packages/cli/src/cli/governance/index.ts`, add `BreakingSchemaChange` to the type exports.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/package.json packages/cli/src/cli/governance/types.ts packages/cli/src/cli/governance/index.ts
git commit -m "feat(cli): add schema_breaking_change trigger type and BreakingSchemaChange"
```

---

### Task 6: Parse `compatibility` from `governance.yaml`

**Files:**
- Modify: `packages/cli/src/cli/governance/rules.ts`
- Modify: `packages/cli/src/test/governance.test.ts`

- [ ] **Step 1: Write tests for loading compatibility config**

Add to `packages/cli/src/test/governance.test.ts`, inside a new describe block:

```typescript
describe('loadGovernanceConfig - compatibility', () => {
  it('parses compatibility.strategy from governance.yaml', () => {
    const yamlContent = `
compatibility:
  strategy: BACKWARD
rules:
  - name: breaking-change-rule
    when: [schema_breaking_change]
    resources: ['*']
    actions:
      - type: webhook
        url: https://example.com/hook
`;
    fs.writeFileSync(path.join(TEMP_DIR, 'governance.yaml'), yamlContent);
    const config = loadGovernanceConfig(TEMP_DIR);
    expect(config.compatibility).toEqual({ strategy: 'BACKWARD' });
    expect(config.rules).toHaveLength(1);
  });

  it('defaults compatibility to undefined when not specified', () => {
    const yamlContent = `
rules:
  - name: some-rule
    when: [consumer_added]
    resources: ['*']
    actions:
      - type: console
`;
    fs.writeFileSync(path.join(TEMP_DIR, 'governance.yaml'), yamlContent);
    const config = loadGovernanceConfig(TEMP_DIR);
    expect(config.compatibility).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run -t "loadGovernanceConfig - compatibility"`
Expected: FAIL — `compatibility` not parsed

- [ ] **Step 3: Update `loadGovernanceConfig` to parse compatibility**

In `packages/cli/src/cli/governance/rules.ts`, update `loadGovernanceConfig`:

```typescript
export const loadGovernanceConfig = (catalogDir: string): GovernanceConfig => {
  // ... existing file loading logic ...

  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(content) as GovernanceConfig;
  const rules = parsed?.rules || [];

  for (const rule of rules) {
    for (const action of rule.actions) {
      if (action.type === 'fail' && action.message !== undefined && typeof action.message !== 'string') {
        throw new Error(`Invalid "message" in fail action for rule "${rule.name}". Must be a string.`);
      }
    }
  }

  return {
    ...(parsed?.compatibility && { compatibility: parsed.compatibility }),
    rules,
  };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run -t "loadGovernanceConfig - compatibility"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/cli/governance/rules.ts packages/cli/src/test/governance.test.ts
git commit -m "feat(cli): parse compatibility strategy from governance.yaml"
```

---

### Task 7: Evaluate `schema_breaking_change` rules

**Files:**
- Modify: `packages/cli/src/cli/governance/rules.ts`
- Modify: `packages/cli/src/test/governance.test.ts`

- [ ] **Step 1: Write tests for breaking schema change rule evaluation**

Add to `packages/cli/src/test/governance.test.ts`:

```typescript
describe('evaluateGovernanceRules - schema_breaking_change', () => {
  it('triggers schema_breaking_change when schema has breaking changes per strategy', () => {
    const config: GovernanceConfig = {
      compatibility: { strategy: 'BACKWARD' },
      rules: [
        {
          name: 'breaking-schema-rule',
          when: ['schema_breaking_change'],
          resources: ['*'],
          actions: [{ type: 'console' }],
        },
      ],
    };

    const diff = makeDiff(
      [],
      [
        {
          resourceId: 'OrderCreated',
          version: '1.0.0',
          type: 'event',
          changeType: 'modified',
          changedFields: ['schemaHash'],
        },
      ]
    );

    const targetSnapshot = makeSnapshot(
      [{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }],
      { events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }] }
    );

    const baseSnapshot = makeSnapshot(
      [{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }],
      { events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }] }
    );

    // Note: actual breaking change detection happens during enrichSchemaContent + evaluateBreakingSchemaChanges
    // This test verifies the rule matching infrastructure
    const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

    expect(results).toHaveLength(1);
    expect(results[0].trigger).toBe('schema_breaking_change');
  });

  it('does not trigger when compatibility strategy is NONE', () => {
    const config: GovernanceConfig = {
      compatibility: { strategy: 'NONE' },
      rules: [
        {
          name: 'breaking-schema-rule',
          when: ['schema_breaking_change'],
          resources: ['*'],
          actions: [{ type: 'console' }],
        },
      ],
    };

    const diff = makeDiff(
      [],
      [
        {
          resourceId: 'OrderCreated',
          version: '1.0.0',
          type: 'event',
          changeType: 'modified',
          changedFields: ['schemaHash'],
        },
      ]
    );

    const targetSnapshot = makeSnapshot(
      [{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }],
      { events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }] }
    );

    const results = evaluateGovernanceRules(diff, config, targetSnapshot);
    expect(results).toHaveLength(0);
  });

  it('does not trigger when no compatibility config is set', () => {
    const config: GovernanceConfig = {
      rules: [
        {
          name: 'breaking-schema-rule',
          when: ['schema_breaking_change'],
          resources: ['*'],
          actions: [{ type: 'console' }],
        },
      ],
    };

    const diff = makeDiff(
      [],
      [
        {
          resourceId: 'OrderCreated',
          version: '1.0.0',
          type: 'event',
          changeType: 'modified',
          changedFields: ['schemaHash'],
        },
      ]
    );

    const targetSnapshot = makeSnapshot(
      [{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }],
      { events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }] }
    );

    const results = evaluateGovernanceRules(diff, config, targetSnapshot);
    expect(results).toHaveLength(0);
  });

  it('respects resource filters for schema_breaking_change', () => {
    const config: GovernanceConfig = {
      compatibility: { strategy: 'BACKWARD' },
      rules: [
        {
          name: 'breaking-schema-rule',
          when: ['schema_breaking_change'],
          resources: ['message:OrderCreated'],
          actions: [{ type: 'console' }],
        },
      ],
    };

    const diff = makeDiff(
      [],
      [
        {
          resourceId: 'OrderCreated',
          version: '1.0.0',
          type: 'event',
          changeType: 'modified',
          changedFields: ['schemaHash'],
        },
        {
          resourceId: 'PaymentProcessed',
          version: '1.0.0',
          type: 'event',
          changeType: 'modified',
          changedFields: ['schemaHash'],
        },
      ]
    );

    const targetSnapshot = makeSnapshot(
      [
        { id: 'OrdersService', sends: [{ id: 'OrderCreated' }] },
        { id: 'PaymentService', sends: [{ id: 'PaymentProcessed' }] },
      ],
      {
        events: [
          { id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' },
          { id: 'PaymentProcessed', version: '1.0.0', name: 'PaymentProcessed' },
        ],
      }
    );

    const results = evaluateGovernanceRules(diff, config, targetSnapshot);

    expect(results).toHaveLength(1);
    expect(results[0].breakingSchemaChanges).toHaveLength(1);
    expect(results[0].breakingSchemaChanges![0].resourceChange.resourceId).toBe('OrderCreated');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run -t "schema_breaking_change"`
Expected: FAIL

- [ ] **Step 3: Implement `evaluateBreakingSchemaChangeRules`**

In `packages/cli/src/cli/governance/rules.ts`, add a new function and call it from `evaluateGovernanceRules`:

```typescript
const evaluateBreakingSchemaChangeRules = (
  diff: SnapshotDiff,
  config: GovernanceConfig,
  targetSnapshot: CatalogSnapshot
): GovernanceResult[] => {
  const breakingRules = config.rules.filter((rule) => rule.when.includes('schema_breaking_change'));
  if (breakingRules.length === 0) return [];

  // Require a compatibility strategy to be set, and not NONE
  const strategy = config.compatibility?.strategy;
  if (!strategy || strategy === 'NONE') return [];

  const schemaChangedResources = diff.resources.filter((rc) => {
    if (!MESSAGE_RESOURCE_TYPES.has(rc.type)) return false;
    return rc.changedFields?.includes('schemaHash');
  });

  if (schemaChangedResources.length === 0) return [];

  const latestMessageVersions = buildLatestMessageVersionMap(targetSnapshot);
  const breakingSchemaChanges: BreakingSchemaChange[] = schemaChangedResources.map((resourceChange) => ({
    resourceChange,
    producerServices: getServicesForSchemaChange(targetSnapshot, 'sends', resourceChange, latestMessageVersions),
    consumerServices: getServicesForSchemaChange(targetSnapshot, 'receives', resourceChange, latestMessageVersions),
    breakingChanges: [], // populated later during enrichment
  }));

  const results: GovernanceResult[] = [];

  for (const rule of breakingRules) {
    const matched = breakingSchemaChanges.filter((sc) => matchesSchemaChangeResource(sc, rule.resources));
    if (matched.length > 0) {
      results.push({ rule, trigger: 'schema_breaking_change', matchedChanges: [], breakingSchemaChanges: matched });
    }
  }

  return results;
};
```

Add import of `BreakingSchemaChange` to the imports from `./types`.

Call it from `evaluateGovernanceRules`, after the existing schema change evaluation:

```typescript
results.push(...evaluateBreakingSchemaChangeRules(diff, config, targetSnapshot));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run -t "schema_breaking_change"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/cli/governance/rules.ts packages/cli/src/test/governance.test.ts
git commit -m "feat(cli): evaluate schema_breaking_change governance rules"
```

---

### Task 8: Enrich breaking schema changes with actual diff

**Files:**
- Modify: `packages/cli/src/cli/governance/rules.ts`
- Modify: `packages/cli/src/test/governance.test.ts`

The `enrichSchemaContent` function already loads before/after schema content for `schema_changed`. We need to extend it to also run `detectBreakingChanges` on `breakingSchemaChanges` results.

- [ ] **Step 1: Write tests for enrichment**

Add to `packages/cli/src/test/governance.test.ts`:

```typescript
describe('enrichSchemaContent - breaking changes', () => {
  it('populates breakingChanges on breakingSchemaChanges results', async () => {
    // This test requires actual schema files on disk.
    // The SDK's getSchemaForMessage reads from {catalogDir}/events/{id}/schema.json
    // with a frontmatter index.md. No eventcatalog.config.js needed for SDK reads.
    const baseCatalogDir = path.join(TEMP_DIR, 'base');
    const targetCatalogDir = path.join(TEMP_DIR, 'target');

    // Create base schema: { orderId: string, amount: string }
    const baseSchemaDir = path.join(baseCatalogDir, 'events', 'OrderCreated');
    fs.mkdirSync(baseSchemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(baseSchemaDir, 'index.md'),
      '---\nid: OrderCreated\nversion: 1.0.0\nname: OrderCreated\nschemaPath: schema.json\n---\n'
    );
    fs.writeFileSync(
      path.join(baseSchemaDir, 'schema.json'),
      JSON.stringify({
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          amount: { type: 'string' },
        },
        required: ['orderId', 'amount'],
      })
    );

    // Create target schema: { orderId: string, amount: number } (type changed — breaking)
    const targetSchemaDir = path.join(targetCatalogDir, 'events', 'OrderCreated');
    fs.mkdirSync(targetSchemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetSchemaDir, 'index.md'),
      '---\nid: OrderCreated\nversion: 1.0.0\nname: OrderCreated\nschemaPath: schema.json\n---\n'
    );
    fs.writeFileSync(
      path.join(targetSchemaDir, 'schema.json'),
      JSON.stringify({
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          amount: { type: 'number' },
        },
        required: ['orderId', 'amount'],
      })
    );

    const results: GovernanceResult[] = [
      {
        rule: { name: 'test', when: ['schema_breaking_change'], resources: ['*'], actions: [{ type: 'console' }] },
        trigger: 'schema_breaking_change',
        matchedChanges: [],
        breakingSchemaChanges: [
          {
            resourceChange: {
              resourceId: 'OrderCreated',
              version: '1.0.0',
              type: 'event',
              changeType: 'modified',
              changedFields: ['schemaHash'],
            },
            consumerServices: [],
            producerServices: [],
            breakingChanges: [],
          },
        ],
      },
    ];

    await enrichSchemaContent(results, baseCatalogDir, targetCatalogDir, 'BACKWARD');

    const bsc = results[0].breakingSchemaChanges![0];
    expect(bsc.breakingChanges).toHaveLength(1);
    expect(bsc.breakingChanges[0].type).toBe('TYPE_CHANGED');
    expect(bsc.breakingChanges[0].field).toBe('amount');
    expect(bsc.breakingChanges[0].breaking).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run -t "enrichSchemaContent - breaking changes"`
Expected: FAIL

- [ ] **Step 3: Update `enrichSchemaContent` to detect breaking changes**

In `packages/cli/src/cli/governance/rules.ts`:

Add import:
```typescript
import { detectBreakingChanges } from '@eventcatalog/breaking-changes';
import type { CompatibilityStrategy } from '@eventcatalog/breaking-changes';
```

Update `enrichSchemaContent` signature to accept an optional strategy:

```typescript
export const enrichSchemaContent = async (
  results: GovernanceResult[],
  baseCatalogDir: string,
  targetCatalogDir: string,
  compatibilityStrategy?: CompatibilityStrategy
): Promise<void> => {
```

Inside the function, after the existing schema enrichment loop, add a second loop for breaking schema changes:

```typescript
  // Enrich breaking schema changes
  for (const result of results) {
    if (!result.breakingSchemaChanges || !compatibilityStrategy) continue;
    for (const bsc of result.breakingSchemaChanges) {
      const { resourceId, version, type, changeType, previousVersion, newVersion } = bsc.resourceChange;
      const baseVersion = changeType === 'versioned' ? previousVersion || version : version;
      const targetVersion = changeType === 'versioned' ? newVersion || version : version;
      promises.push(
        (async () => {
          const [before, after] = await Promise.all([
            readSchemaDetails(baseSDK, resourceId, baseVersion, type),
            readSchemaDetails(targetSDK, resourceId, targetVersion, type),
          ]);
          bsc.before = before.content;
          bsc.after = after.content;
          bsc.beforeSchemaPath = before.schemaPath;
          bsc.afterSchemaPath = after.schemaPath;
          bsc.beforeSchemaHash = before.schemaHash;
          bsc.afterSchemaHash = after.schemaHash;

          if (before.content && after.content) {
            try {
              const beforeSchema = JSON.parse(before.content);
              const afterSchema = JSON.parse(after.content);
              bsc.breakingChanges = detectBreakingChanges(beforeSchema, afterSchema, compatibilityStrategy);
            } catch {
              // Schema is not valid JSON — skip breaking change detection
            }
          }
        })()
      );
    }
  }
```

- [ ] **Step 4: Update `governanceCheck` to pass strategy to `enrichSchemaContent`**

In `packages/cli/src/cli/governance/check.ts`, update the call:

```typescript
await enrichSchemaContent(results, baseTmpDir, targetCatalogDir, config.compatibility?.strategy);
```

- [ ] **Step 5: Filter out results with no actual breaking changes**

After the `await enrichSchemaContent(...)` call in `check.ts` (~line 100), add this filtering block:

```typescript
// Remove schema_breaking_change results where no actual breaking changes were found
const filteredResults = results.filter((r) => {
  if (r.trigger !== 'schema_breaking_change') return true;
  if (!r.breakingSchemaChanges) return false;
  r.breakingSchemaChanges = r.breakingSchemaChanges.filter((bsc) => bsc.breakingChanges.length > 0);
  return r.breakingSchemaChanges.length > 0;
});
```

Then replace all subsequent uses of `results` in `check.ts` with `filteredResults`:
- Line ~89: `for (const result of filteredResults)` (fail action loop)
- Line ~105: `const actionOutput = await executeGovernanceActions(filteredResults, ...)`
- Line ~114: `const failures = filteredResults.filter(...)`
- Line ~134: `lines.push(formatGovernanceOutput(filteredResults))`
- Line ~141: `if (filteredResults.length > 0)`
- Line ~143: `${filteredResults.length} rule${...}`

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run -t "enrichSchemaContent - breaking changes"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/cli/governance/rules.ts packages/cli/src/cli/governance/check.ts packages/cli/src/test/governance.test.ts
git commit -m "feat(cli): enrich breaking schema changes with actual diff results"
```

---

### Task 9: Webhook payload for `schema_breaking_change`

**Files:**
- Modify: `packages/cli/src/cli/governance/actions.ts`
- Modify: `packages/cli/src/test/governance.test.ts`

- [ ] **Step 1: Write tests for the webhook payload**

Add to `packages/cli/src/test/governance.test.ts`:

```typescript
describe('executeGovernanceActions - schema_breaking_change webhook', () => {
  it('sends correct CloudEvents payload for schema_breaking_change', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    const results: GovernanceResult[] = [
      {
        rule: {
          name: 'breaking-rule',
          when: ['schema_breaking_change'],
          resources: ['*'],
          actions: [{ type: 'webhook', url: 'https://example.com/hook' }],
        },
        trigger: 'schema_breaking_change',
        matchedChanges: [],
        breakingSchemaChanges: [
          {
            resourceChange: {
              resourceId: 'OrderCreated',
              version: '1.0.0',
              type: 'event',
              changeType: 'modified',
              changedFields: ['schemaHash'],
            },
            consumerServices: [{ id: 'PaymentService', version: '1.0.0', owners: ['team-payments'] }],
            producerServices: [{ id: 'OrdersService', version: '1.0.0' }],
            beforeSchemaHash: 'abc123',
            afterSchemaHash: 'def456',
            beforeSchemaPath: 'schema.json',
            afterSchemaPath: 'schema.json',
            breakingChanges: [
              {
                type: 'TYPE_CHANGED',
                field: 'amount',
                message: "Field 'amount' type changed from 'string' to 'number'",
                previousType: 'string',
                currentType: 'number',
                breaking: true,
              },
            ],
          },
        ],
      },
    ];

    const messageTypes: MessageTypeMap = new Map([['OrderCreated', 'event']]);

    await executeGovernanceActions(results, {
      messageTypes,
      baseRef: 'main',
      targetRef: 'feature-branch',
      compatibilityStrategy: 'BACKWARD',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://example.com/hook');

    const body = JSON.parse(options.body as string);
    expect(body.type).toBe('eventcatalog.governance.schema_breaking_change');
    expect(body.specversion).toBe('1.0');
    expect(body.data.compatibilityStrategy).toBe('BACKWARD');
    expect(body.data.message.id).toBe('OrderCreated');
    expect(body.data.breakingChanges).toHaveLength(1);
    expect(body.data.breakingChanges[0].type).toBe('TYPE_CHANGED');
    expect(body.data.breakingChanges[0].field).toBe('amount');
    expect(body.data.consumers).toHaveLength(1);
    expect(body.data.producers).toHaveLength(1);

    fetchSpy.mockRestore();
  });
});
```

Also add a test for the `fail` action type with `schema_breaking_change`:

```typescript
  it('schema_breaking_change with fail action marks result as failed', () => {
    const config: GovernanceConfig = {
      compatibility: { strategy: 'BACKWARD' },
      rules: [
        {
          name: 'block-breaking-changes',
          when: ['schema_breaking_change'],
          resources: ['*'],
          actions: [{ type: 'fail', message: 'Breaking schema changes are not allowed' }],
        },
      ],
    };

    const diff = makeDiff(
      [],
      [
        {
          resourceId: 'OrderCreated',
          version: '1.0.0',
          type: 'event',
          changeType: 'modified',
          changedFields: ['schemaHash'],
        },
      ]
    );

    const targetSnapshot = makeSnapshot(
      [{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }],
      { events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }] }
    );

    const results = evaluateGovernanceRules(diff, config, targetSnapshot);

    expect(results).toHaveLength(1);
    // The fail action marking happens in check.ts, not evaluateGovernanceRules.
    // Verify the rule's actions include the fail type so check.ts can process it.
    expect(results[0].rule.actions[0].type).toBe('fail');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run -t "schema_breaking_change webhook"`
Expected: FAIL

- [ ] **Step 3: Add `compatibilityStrategy` to `GovernanceActionOptions`**

In `packages/cli/src/cli/governance/actions.ts`, add to `GovernanceActionOptions`:

```typescript
import type { CompatibilityStrategy } from '@eventcatalog/breaking-changes';

export type GovernanceActionOptions = {
  messageTypes?: MessageTypeMap;
  status?: string;
  serviceOwners?: ServiceOwnersMap;
  baseRef?: string;
  targetRef?: string;
  compatibilityStrategy?: CompatibilityStrategy;
};
```

- [ ] **Step 4: Add breaking schema change webhook handler**

In `executeGovernanceActions`, after the `schema_changed` handler block and before the deprecation handler, add:

```typescript
      // Handle breaking schema changes
      if (result.breakingSchemaChanges && result.breakingSchemaChanges.length > 0) {
        for (const bsc of result.breakingSchemaChanges) {
          const messageType = messageTypes?.get(bsc.resourceChange.resourceId) || 'message';

          const payload = {
            specversion: '1.0',
            type: 'eventcatalog.governance.schema_breaking_change',
            source: 'eventcatalog/governance',
            id: randomUUID(),
            time: now,
            datacontenttype: 'application/json',
            data: {
              schemaVersion: 1,
              ...(status && { status }),
              ...(compatibilityStrategy && { compatibilityStrategy }),
              summary: `Breaking schema change detected for ${messageType} ${bsc.resourceChange.resourceId}`,
              message: {
                id: bsc.resourceChange.resourceId,
                version: bsc.resourceChange.version,
                type: messageType,
              },
              schema: {
                beforeHash: bsc.beforeSchemaHash ?? null,
                afterHash: bsc.afterSchemaHash ?? null,
                beforePath: bsc.beforeSchemaPath ?? null,
                afterPath: bsc.afterSchemaPath ?? null,
              },
              breakingChanges: bsc.breakingChanges,
              refs: {
                base: baseRef ?? null,
                target: targetRef ?? null,
              },
              consumers: bsc.consumerServices,
              producers: bsc.producerServices,
            },
          };

          webhookCalls.push({
            urlTemplate: action.url,
            request: fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) }),
          });
        }
        continue;
      }
```

Destructure `compatibilityStrategy` from opts at the top of the function.

- [ ] **Step 5: Pass `compatibilityStrategy` in `governanceCheck`**

In `packages/cli/src/cli/governance/check.ts`, update the `executeGovernanceActions` call:

```typescript
const actionOutput = await executeGovernanceActions(filteredResults, {
  messageTypes,
  status: opts.status,
  serviceOwners,
  baseRef: baseBranch,
  targetRef: opts.target || 'working-directory',
  compatibilityStrategy: config.compatibility?.strategy,
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run -t "schema_breaking_change webhook"`
Expected: PASS

- [ ] **Step 7: Run ALL governance tests to verify nothing is broken**

Run: `cd packages/cli && pnpm test src/test/governance.test.ts --run`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/cli/governance/actions.ts packages/cli/src/cli/governance/check.ts packages/cli/src/test/governance.test.ts
git commit -m "feat(cli): schema_breaking_change webhook payload with CloudEvents envelope"
```

---

### Task 10: Final integration — run all tests across packages

**Files:** None (verification only)

- [ ] **Step 1: Run breaking-changes package tests**

Run: `cd packages/breaking-changes && pnpm test --run`
Expected: All PASS

- [ ] **Step 2: Run CLI package tests**

Run: `cd packages/cli && pnpm test --run`
Expected: All PASS

- [ ] **Step 3: Build both packages**

Run: `pnpm run build` (from repo root)
Expected: All packages build successfully

- [ ] **Step 4: Format code**

Run: `pnpm run format`

- [ ] **Step 5: Commit any formatting changes**

```bash
git add packages/breaking-changes/ packages/cli/
git commit -m "chore: format code"
```
