# DSL Specification File Locations

## Grammar
- `packages/language-server/src/ec.langium` — Langium grammar definition

## Tests
- `packages/language-server/src/test/` or `packages/language-server/__tests__/` — Test directory
- Framework: vitest
- Run: `pnpm --filter @eventcatalog/language-server run test --run`

## Specification Markdown
| File | Content |
|------|---------|
| `00-overview.md` | High-level overview |
| `01-domain.md` | Domain syntax |
| `02-service.md` | Service syntax |
| `03-event.md` | Event syntax |
| `04-command.md` | Command syntax |
| `05-query.md` | Query syntax |
| `06-channel.md` | Channel syntax |
| `07-entity.md` | Entity syntax |
| `08-container.md` | Container syntax |
| `09-data-product.md` | Data product syntax |
| `14-relationships.md` | Relationship/pointer syntax |
| `15-versioning.md` | Version syntax |
| `17-examples.md` | Example updates |
| `18-grammar.md` | Grammar reference (EBNF) |
| `19-visualizer.md` | Visualizer syntax |

Path: `packages/language-server/specification/`

## SDK DSL Functions
- `packages/sdk/src/dsl/` — DSL generation/parsing functions
- `packages/sdk/src/test/dsl.test.ts` — DSL-related tests

## Playground Examples
- `packages/playground/src/examples.ts`

## Playground Monaco Completions
- `packages/playground/src/monaco/ec-completion.ts` — Autocomplete suggestions for annotations and keywords in the playground editor

## Language Server Completions
- `packages/language-server/src/ec-completion-provider.ts` — Autocomplete suggestions for the language server (KNOWN_ANNOTATIONS, keyword sets)

## DSL Conventions
- Version syntax: `@` prefix (e.g., `resource@1.0.0`)
- Lists: comma-separated (e.g., `to ChannelA, ChannelB`)
- Optional blocks: `{...}` only when needed
- Prefer inline syntax over blocks
