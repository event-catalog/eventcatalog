# @eventcatalog/diff

Compare two EventCatalog indexes and return a single, versioned `ArchitectureDiff` document.

This is a pure library. It has no knowledge of git, CI, webhooks or policy. Those are consumers that build on top of the diff document.

## Usage

```ts
import createSDK from '@eventcatalog/sdk';
import { diff } from '@eventcatalog/diff';

// Build an index for each side. Include schema content so the diff can
// compute compatibility verdicts, not just detect that a schema changed.
const a = await createSDK(baselineDir).buildIndex({ source: 'acme/catalog', commit: 'abc1234', includeSchemaContent: true });
const b = await createSDK(candidateDir).buildIndex({ source: 'acme/catalog', commit: 'def5678', includeSchemaContent: true });

const result = diff(a, b, { strategy: 'backward' });

if (result.summary.breaking) {
  // apply your own policy: fail, warn, notify...
}
```

`a` is the baseline (for example `main`) and `b` is the candidate (for example a PR branch).

### Options

| Option                 | Default  | What it does                                                                                                                               |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `strategy`             | `'full'` | Compatibility strategy used to judge schema changes. See below.                                                                            |
| `includeSchemaContent` | `false`  | Copy the raw before and after schema text onto each schema change, so a UI can render a side-by-side diff without going back to the index. |

## Input: the SDK `Index`

The input is the `Index` document returned by `buildIndex()` in `@eventcatalog/sdk`, the same document used for federation. The diff resolves each side with the SDK resolver so pointers such as `version: latest` become concrete edges. The diff engine never touches the filesystem.

Schema content is opt in. Build with `includeSchemaContent: true` to embed the raw schema text next to its hash. Without it the diff still reports which schemas changed, but the compatibility verdict is `null`.

### Which schemas get compared

- **Versions.** Every version of a message that exists on both sides is compared against itself, so a patch to `OrderCreated` 1.0.0 is found even when 2.0.0 exists. When the latest versions differ, the latest on each side are also compared, so a bump from 1.0.0 to 2.0.0 is reported as one change with both versions recorded.
- **Files.** A message can carry several schema files. They are paired by `id`, then by `path`, then by the `default` flag, and finally, when exactly one file is left unmatched on each side, by elimination. So renaming `schema.json` to `order-created.json` in the same change does not hide what changed inside it. A file that exists on only one side is reported as `change: 'added'` or `change: 'removed'`.
- **Formats.** `format: 'json-schema'` is compared. A `.json` file with no declared format is compared only when its content uses JSON Schema keywords, so an example payload stored as `schema.json` is not walked as if it were a schema. Everything else gets a `null` verdict.

### Unknown verdicts are never silent

A schema change with no verdict, because the format is not supported yet, the content was not in the index, the JSON did not parse, or the file was added or removed, has `breaking: null` and is counted in `summary.schemaUnknown`. `summary.breaking` stays `false` for these. A policy layer should treat a non-zero `schemaUnknown` as "a human needs to look", and probably fail the build for it until the format is supported.

## Output: `ArchitectureDiff`

- `resources` added / removed / changed
- `edges` added / removed, across every direction the SDK resolves
- `schemaChanges` with a compatibility verdict, the direction that broke, and the operations that caused it
- `impact` derived from `sends` / `receives` edges, so callers do not need to walk the graph again

### Resources

A resource is identified by its `type` and `id`, so an event and a service with the same id are different resources. Because an index carries every version of a resource:

- an id only in the candidate is **added**, an id only in the baseline is **removed**, every version listed
- an id on both sides whose latest version differs is **changed** with `version: { a, b }`, not removed plus added
- an id on both sides with the same latest version but a different `name`, `owners` or `deprecated` is **changed**, with the differing `fields` named
- an individual old version that appears or disappears while the id survives is added or removed on its own, so deleting 0.6.0 while 1.0.0 stays is visible

Markdown content and schema files are not resource changes. Schemas are covered by `schemaChanges`; markdown is documentation.

### Edges

Every direction the SDK resolves is compared: `sends`, `receives`, `writesTo`, `readsFrom`, `contains`, `references`, `appliesTo`, `relatesTo`. Edge identity is direction, `via`, from id and to id. Versions are left out on purpose, so bumping a message does not churn every edge that points at it. A consumer on `latest` is resolved before comparing.

An edge whose target disappears from the catalog, so that the pointer no longer resolves, is reported as removed. A pointer to something not in the catalog is still reported, with no `type` on that end.

### Impact

`impact` names who is hurt. Producers and consumers always come from the **baseline** graph: the services that exist today, on the message that is about to change or disappear, with their owners.

| Reason                   | When                                                                 | Makes the diff breaking    |
| ------------------------ | -------------------------------------------------------------------- | -------------------------- |
| `schema_breaking_change` | A message schema broke under the strategy                            | yes                        |
| `message_removed`        | A message, or one version of it, is gone while services still use it | yes                        |
| `consumer_removed`       | A service stopped receiving a message that still exists              | no, that is its own choice |
| `producer_removed`       | A service stopped sending a message that still exists                | no                         |

A removed message nobody used any more is a tidy-up and gets no impact entry.

Producers and consumers are whatever declares `sends` or `receives` in the catalog: services, domains and agents all appear, each with its own `type`.

```json
{
  "message": { "type": "event", "id": "order-created", "version": "1.0.0" },
  "reason": "schema_breaking_change",
  "direction": "forward",
  "producers": [{ "type": "service", "id": "orders-service", "version": "3.1.0", "owners": ["team-orders"] }],
  "consumers": [{ "type": "service", "id": "payment-service", "version": "2.0.0", "owners": ["team-payments"] }]
}
```

`direction` tells a consumer of the diff how to read the lists:

| Direction  | Who is hurt                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------- |
| `forward`  | The consumers listed are on the old schema and will fail to read new messages                 |
| `backward` | The consumers listed will fail to read old messages once they move to the new schema (replay) |
| `both`     | Both of the above. Only possible under the `full` strategy                                    |

Only direct edges to the compared version count, after the SDK has resolved them against the baseline. In practice:

- A consumer on `latest`, or with no version at all, resolves to the latest version in the baseline. It is listed when that version is edited in place, and when the message is bumped, because a latest subscriber moves to the new version automatically. It is not listed when an older, non-latest version is patched.
- A consumer on a semver range such as `^1.0.0` resolves to the highest matching version and is listed when that version changes, even for a major bump. The catalog cannot know whether the producer keeps publishing the old line, so it errs on inclusion.
- A consumer pinned to an exact older version is not listed for a change to a newer one.
- A message nobody consumes still gets an entry with an empty `consumers` list, so policy can decide that nobody is affected.

The diff reports facts. Whether an impact fails a build, warns, or only matters when the consumer belongs to another team is policy, and belongs in the CLI.

## Compatibility strategies

> New to schema compatibility? Read [COMPATIBILITY.md](./COMPATIBILITY.md) first. It explains the two directions, every rule, and why, using one running example.

The strategy answers one question: **which side upgrades first?** The definitions follow [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html), so they match what teams running Kafka already expect.

| Strategy   | Meaning                                                                         | Upgrade order                                |
| ---------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| `backward` | A consumer on the **new** schema can read messages written with the **old** one | Upgrade consumers first, then producers      |
| `forward`  | A consumer on the **old** schema can read messages written with the **new** one | Upgrade producers first, then consumers      |
| `full`     | Both of the above                                                               | Upgrade producers and consumers in any order |
| `none`     | Compatibility is not checked. Changes are still reported, nothing is breaking   | Coordinate the upgrade yourself              |

**The default is `full`.** Confluent defaults to `backward` because a Kafka consumer may rewind and replay old messages. EventCatalog runs the diff on a pull request where a producer changes an event that other services already consume. Those consumers are on the old schema, which is the `forward` direction, so a `backward` default would pass changes that break every consumer in the graph. Checking both directions is the safe default for a review tool. Set `backward` or `forward` to match the setting on your schema registry.

> **Naming warning.** In REST API terms, "backward compatible" means old clients keep working. In schema registry terms that is `forward`. We use the schema registry meaning. If you only want to know whether existing consumers keep working, use `forward`.

Every rule below comes from the same test: does the reader's schema accept everything the writer's schema could have produced? A change that makes a schema accept **more** is safe for `backward` and breaking for `forward`. A change that makes it accept **less** is the reverse.

### JSON Schema rules

Objects are open by default in JSON Schema: unknown properties are accepted. We take Confluent's lenient reading of that: adding a property to an open object is safe, on the basis that producers do not emit undeclared properties. Objects with `additionalProperties: false` are closed, and get their own stricter rows below. A schema-valued `additionalProperties` is treated as open.

| Change                                                                                                             | `backward` | `forward` | Kind                                  |
| ------------------------------------------------------------------------------------------------------------------ | ---------- | --------- | ------------------------------------- |
| Add an optional property to an open object                                                                         | ok         | ok        | `property.added`                      |
| Add an optional property to a closed object (old readers reject unknown properties)                                | ok         | breaking  | `property.added-to-closed-object`     |
| Remove an optional property from an open object                                                                    | ok         | ok        | `property.removed`                    |
| Remove an optional property from a closed object (new readers reject old messages still carrying it)               | breaking   | ok        | `property.removed-from-closed-object` |
| Make a property required / add a required property                                                                 | breaking   | ok        | `required.added`                      |
| Make a property required when it has a `default`                                                                   | ok         | ok        | `required.added-with-default`         |
| Make a required property optional / remove a required property                                                     | ok         | breaking  | `required.removed`                    |
| Widen a type (`integer` to `number`, `string` to `["string","null"]`, type removed)                                | ok         | breaking  | `type.widened`                        |
| Narrow a type (`number` to `integer`, nullable to not, type added)                                                 | breaking   | ok        | `type.narrowed`                       |
| Change a type outright (`string` to `number`)                                                                      | breaking   | breaking  | `type.changed`                        |
| Add an enum value                                                                                                  | ok         | breaking  | `enum.value.added`                    |
| Remove an enum value                                                                                               | breaking   | ok        | `enum.value.removed`                  |
| Restrict a free value to an enum or `const`                                                                        | breaking   | ok        | `enum.added`                          |
| Lift an enum restriction                                                                                           | ok         | breaking  | `enum.removed`                        |
| Tighten a constraint (`min*` up, `max*` down, `pattern`/`format`/`multipleOf`/`uniqueItems`/`oneOf`/`allOf` added) | breaking   | ok        | `constraint.tightened`                |
| Loosen a constraint (the reverse)                                                                                  | ok         | breaking  | `constraint.loosened`                 |
| Change `pattern`, `format` or `multipleOf` to a different value                                                    | breaking   | breaking  | `constraint.changed`                  |
| Close an open model (`additionalProperties: false`)                                                                | breaking   | ok        | `additionalProperties.closed`         |
| Open a closed model                                                                                                | ok         | breaking  | `additionalProperties.opened`         |
| Constrain a new tuple position (`items` array or `prefixItems`)                                                    | breaking   | ok        | `tuple.item.added`                    |
| Drop a tuple position                                                                                              | ok         | breaking  | `tuple.item.removed`                  |
| Add a `oneOf` / `anyOf` branch                                                                                     | ok         | breaking  | `union.branch.added`                  |
| Remove a `oneOf` / `anyOf` branch                                                                                  | breaking   | ok        | `union.branch.removed`                |
| Add an `allOf` branch                                                                                              | breaking   | ok        | `allOf.branch.added`                  |
| Remove an `allOf` branch                                                                                           | ok         | breaking  | `allOf.branch.removed`                |
| Replace `true` (anything) with a schema, or a schema with `false`                                                  | breaking   | ok        | `schema.restricted`                   |
| Replace a schema with `true`, or `false` with a schema                                                             | ok         | breaking  | `schema.relaxed`                      |
| Mark a node `deprecated: true`                                                                                     | ok         | ok        | `schema.deprecated`                   |
| Change a keyword we do not reason about (see below)                                                                | breaking   | breaking  | `keyword.changed`                     |

`full` is breaking when either column is breaking. `none` is never breaking.

Also handled:

- **Nesting.** `properties`, `items`, `additionalProperties` (when it is a schema), and every `oneOf` / `anyOf` / `allOf` branch are walked recursively. Paths are JSON pointers straight to the node, e.g. `/properties/lines/items/properties/sku`.
- **Local `$ref`.** `#/definitions/...` and `#/$defs/...` are resolved before comparing, following chains of refs. A change inside a definition is reported once, at the definition's own path, no matter how many properties use it. Recursive definitions terminate. Extracting an inline object into a definition, or renaming a definition, with identical content is not a change.
- **External `$ref`.** A ref to another file (`./common.json#/Address`) cannot be followed. If it changes it is reported as `keyword.changed`, breaking both ways. If it is unchanged it is not a change.
- **Branch matching.** `oneOf` / `anyOf` / `allOf` branches are matched by content first, so reordering is not a change. Remaining branches are paired by position and walked, so an edit inside one branch is reported at that branch's path.
- **Annotations.** `title`, `description`, `examples`, `$comment`, `$id`, `$schema` and `default` changes produce no ops. Reordering `properties`, `required` or `enum` entries is not a change. `deprecated: true` is the one annotation that is reported, as a non-breaking `schema.deprecated` op, because catalogs care about it.
- **`format`.** Treated as a constraint. In draft-07 validators it is, but in 2020-12 it is an annotation unless the validator opts in, so a new `format` on a 2020-12 schema may be flagged more strictly than your validator enforces.
- **Keywords we do not reason about.** `patternProperties`, `propertyNames`, `not`, `if` / `then` / `else`, `dependentRequired`, `dependentSchemas`, `dependencies`, `contains`, `minContains`, `maxContains`, `unevaluatedProperties`, `unevaluatedItems`, `additionalItems`. A change to any of these is reported as `keyword.changed` and treated as breaking in both directions, because refusing to call it safe is better than a silent pass.

The table above is the intent. The source of truth is the rules table in [`src/json-schema/rules.ts`](./src/json-schema/rules.ts) and the scenarios in [`src/test/json-schema/json-schema.test.ts`](./src/test/json-schema/json-schema.test.ts). When they disagree with this README, fix the README.

### Other formats

Avro, Protobuf and others are not compared yet. A change to their schema file is still reported by hash, with a `null` verdict.

## Development

```bash
pnpm --filter @eventcatalog/diff run test
pnpm --filter @eventcatalog/diff run build
```

### Adding a JSON Schema rule

1. Add the change kind to `JsonSchemaChangeKind` in `src/json-schema/types.ts`.
2. Emit it from the walker in `src/json-schema/compare.ts`.
3. Add its row to the rules table in `src/json-schema/rules.ts`.
4. Add a test under each strategy it affects in `src/test/json-schema/json-schema.test.ts`, with the before and after schema written out in full.
5. Update the table in this README.

### Reproducing a user-reported schema problem

Open `src/test/json-schema/json-schema.test.ts`, find the strategy the user runs, copy the closest test, paste their before and after schema, and state the verdict you expect. Run the tests. Fix the rule. The test stays as a regression check.

### Scenario fixtures

End-to-end tests are data driven. Each folder under `src/test/fixtures/scenarios/` holds a baseline index (`a.json`), a candidate index (`b.json`), the expected diff (`expected.json`) and optional `options.json`. Indexes are validated with the SDK's `parseIndex` when loaded, so fixtures cannot drift from what `buildIndex` emits. The scenario runner loads every folder, so adding a case is just adding a folder.
