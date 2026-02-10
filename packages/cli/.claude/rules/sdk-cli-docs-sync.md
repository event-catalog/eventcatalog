# SDK and CLI Documentation Sync

When any SDK function is **added**, **edited**, or **deleted** in this project, you must check and update the `src/cli-docs.ts` file to keep CLI documentation in sync.

## What to check

1. **New function added** → Add a corresponding entry to the `cliFunctions` array in `src/cli-docs.ts`
2. **Function signature changed** → Update the `args` array for that function in `cli-docs.ts`
3. **Function deleted** → Remove the corresponding entry from `cli-docs.ts`
4. **Function renamed** → Update the `name` field in `cli-docs.ts`

## Files to watch

- `src/index.ts` - Main SDK exports
- `src/events.ts`, `src/commands.ts`, `src/queries.ts`, etc. - Individual resource modules
- `src/services.ts`, `src/domains.ts`, `src/channels.ts`
- `src/teams.ts`, `src/users.ts`, `src/custom-docs.ts`
- `src/entities.ts`, `src/data-stores.ts`, `src/data-products.ts`
- `src/messages.ts`, `src/eventcatalog.ts`

## CLI docs entry format

Each function in `cli-docs.ts` should have:

```typescript
{
  name: 'functionName',
  description: 'What the function does',
  category: 'Events' | 'Commands' | 'Services' | etc.,
  args: [
    { name: 'argName', type: 'string' | 'json' | 'boolean' | 'number', required: true/false, description: '...' }
  ],
  examples: [
    { description: 'Example description', command: 'npx @eventcatalog/sdk functionName "arg1"' }
  ]
}
```
