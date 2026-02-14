---
name: spec-change
description: Update the EventCatalog DSL specification across all locations — Langium grammar, specification markdown docs, playground examples, and tests. Use when making any change to DSL syntax, adding new DSL features, modifying grammar rules, or updating DSL documentation. Triggers on requests like "add X to the DSL", "update the grammar", "change DSL syntax for Y", or "spec change".
---

# DSL Specification Change

Apply a DSL specification change across all required locations. See [references/spec-files.md](references/spec-files.md) for all file paths.

## Workflow

### 1. Understand the change
- Parse the user's request to identify the DSL feature being added/modified
- Identify affected grammar rules, spec files, and examples

### 2. Update the Langium grammar
- Read `packages/language-server/src/ec.langium`
- Locate and update the relevant grammar rules
- Follow Langium conventions

### 3. Add/update tests
- Add tests in `packages/language-server/src/test/` (or `__tests__/`)
- Cover: valid syntax, invalid syntax, edge cases, backwards compatibility
- Use vitest. Test pattern:

```typescript
describe('Feature Name', () => {
  it('should parse valid syntax', () => {
    const dsl = `...valid DSL...`;
    const result = parseDsl(dsl);
    expect(result.parseErrors).toHaveLength(0);
  });

  it('should reject invalid syntax', () => {
    const dsl = `...invalid DSL...`;
    const result = parseDsl(dsl);
    expect(result.parseErrors.length).toBeGreaterThan(0);
  });
});
```

- Run: `pnpm --filter @eventcatalog/language-server run test --run`

### 4. Update specification markdown
- See [references/spec-files.md](references/spec-files.md) for the full file list
- Update examples, EBNF sections, syntax tables, and reference sections in all affected files

### 5. Update playground examples and completions
- Read `packages/playground/src/examples.ts`
- Update ALL relevant examples to demonstrate the new syntax consistently
- Add new example if the feature warrants one
- Read `packages/playground/src/monaco/ec-completion.ts`
- Update annotation suggestions and keyword completions to match the grammar changes

### 6. Update SDK DSL functions and tests
- Check `packages/sdk/src/dsl/` for functions that generate or parse DSL syntax
- Check `packages/sdk/src/test/dsl.test.ts` for DSL-related tests
- Ensure any DSL output or parsing reflects the grammar changes made above

### 7. Verify the Langium grammar matches the spec
- After any spec change, read `packages/language-server/src/ec.langium` and confirm the grammar is consistent with what the spec now describes
- If they diverge, flag it to the user — the grammar may need updating too
- Run: `pnpm --filter @eventcatalog/language-server run test --run`

### 8. Format and verify
- Run `pnpm run format`
- Run tests again to confirm everything passes

## Rules
- **Grammar first** — always update grammar before markdown/examples
- **Test coverage** — every grammar change MUST have tests
- **Be thorough** — update ALL affected files, not just some
- **Consistency** — ensure syntax is consistent across ALL playground examples
- **EBNF sync** — keep EBNF notation in spec markdown in sync with Langium grammar
- **Note breaking changes** — flag if changes break existing syntax

## Output Format
1. State what's changing and why
2. Show grammar changes
3. Show test additions/updates and run results
4. List all spec files updated
5. Show playground example updates
6. Confirm formatting completed

**IMPORTANT:** If you discover issues or inconsistencies in the specification that are outside the scope of the current change, do NOT fix them without first verifying with the user. Only make changes directly related to the requested spec change.

Ask clarifying questions if you need to know more details.
