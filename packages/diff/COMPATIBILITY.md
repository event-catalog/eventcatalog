# Schema compatibility, explained

This guide is for anyone who has been told "your change is breaking" and wants to know why, or who wants to change a schema and know in advance whether it is safe. No prior knowledge of schema registries is assumed.

It covers JSON Schema, which is the first format `@eventcatalog/diff` understands. The ideas apply to any schema format.

---

## The one idea behind everything

A message has two sides. Something **writes** it, something **reads** it.

- A **producer** writes a message using the schema it was built with.
- A **consumer** reads a message using the schema it was built with.

The two sides are usually different services, owned by different teams, deployed at different times. So at any moment there might be messages in flight, in a queue, in a topic, or in a database, written with one version of the schema and read with another.

A change is **safe** when the reader's schema accepts everything the writer's schema could have produced.

A change is **breaking** when it doesn't.

Every rule in this document is that one sentence applied to one keyword.

---

## The running example

Throughout, we use one event.

**Orders Service** publishes `OrderCreated`. **Payment Service** subscribes to it.

```json
{
  "type": "object",
  "properties": {
    "orderId": { "type": "string" },
    "customerId": { "type": "string" },
    "status": { "type": "string", "enum": ["pending", "paid"] }
  },
  "required": ["orderId", "customerId"]
}
```

Orders wants to change this schema. Payment is still running on the old one. What happens?

---

## Two directions

Because there are two sides, there are two questions you can ask.

### Forward: does the old consumer survive the new messages?

Orders ships the new schema. Payment has not been touched. New `OrderCreated` messages start arriving at Payment, which is still validating with the **old** schema.

> **Forward compatible** means a consumer on the **old** schema can read messages written with the **new** schema.

This is the question most people mean when they ask "will my change break anyone?". In EventCatalog terms: **will this pull request break the consumers in the graph?**

### Backward: does the new consumer survive the old messages?

Now the other way round. Payment upgrades to the new schema. But there are old messages still in the queue, or Payment replays a week of history from the topic, or reads an event store. Those messages were written with the **old** schema, and Payment is now validating with the **new** one.

> **Backward compatible** means a consumer on the **new** schema can read messages written with the **old** schema.

This matters whenever old messages can meet a new reader: Kafka replays, event sourcing, dead letter queues, long retention.

### A naming trap

In the REST API world, "backward compatible" means "old clients keep working". That is the **forward** direction in schema terms. The names come from schema registries like Confluent's, and we use the registry meaning so the tool agrees with the registry. If you only care whether existing consumers keep working, the word you want is **forward**.

---

## Strategies

A strategy tells the diff which questions to ask.

| Strategy   | Question asked                                        | Use it when                                                                  |
| ---------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `forward`  | Will old consumers survive new messages?              | Producers ship first, consumers catch up later. You never replay old data.   |
| `backward` | Will new consumers survive old messages?              | Consumers ship first, or consumers replay history. Confluent's default.      |
| `full`     | Both of the above                                     | Different teams deploy independently and you want no surprises. **Default.** |
| `none`     | Neither. Report changes, never call anything breaking | You want the report, but you coordinate upgrades yourself.                   |

**Why `full` is the default.** EventCatalog runs the diff on a pull request. The person changing the schema usually owns the producer. The consumers belong to other teams and might deploy tomorrow or next month, and might replay data. A review tool should flag anything that could hurt either of them. If your organisation has settled on one direction, set it explicitly.

---

## The rules, with reasons

Every change makes the schema accept **more** values, accept **fewer** values, accept a **different** set of values, or accept the **same** values.

|                       | Backward (new reader, old data) | Forward (old reader, new data) |
| --------------------- | ------------------------------- | ------------------------------ |
| Accepts **more**      | safe                            | **breaking**                   |
| Accepts **fewer**     | **breaking**                    | safe                           |
| Accepts **different** | **breaking**                    | **breaking**                   |
| Accepts the **same**  | safe                            | safe                           |

Why? If the new schema accepts more, old data still fits inside it (backward safe), but new data might fall outside the old schema (forward breaking). Accepting fewer is the mirror image.

That table is the whole rules engine. The sections below just say which bucket each keyword change lands in.

### Properties

| Change                                       | Bucket    | Why                                                                                                               |
| -------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| Add an optional property                     | same      | Old messages don't have it and don't need it. New messages carry an extra field that old readers ignore.          |
| Remove an optional property                  | same      | Nobody was relying on it being there.                                                                             |
| Add a required property                      | fewer     | Old messages don't have it, so a new reader rejects them. Old readers ignore the extra field, so forward is fine. |
| Add a required property that has a `default` | same      | The new reader fills the gap with the default when reading old messages.                                          |
| Remove a required property                   | more      | New messages may omit a field the old reader insists on.                                                          |
| Rename a required property                   | different | It is a removal and an addition at once. Both directions break.                                                   |

**Example, forward breaking.** Orders removes `customerId` from `required`. Payment, on the old schema, receives an `OrderCreated` without a `customerId` and rejects it, or crashes reading `undefined`.

**Example, backward breaking.** Orders adds `placedAt` to `required`. Payment upgrades and then replays last week's events, none of which have `placedAt`. Every one is rejected.

**Fix.** New fields should be optional, or required with a `default`. Removing a field should be done in two steps: make it optional, wait for consumers to stop depending on it, then remove it.

### Types

| Change                                      | Bucket    | Why                                                          |
| ------------------------------------------- | --------- | ------------------------------------------------------------ |
| `integer` to `number`                       | more      | Every integer is a number. New messages may now carry `2.5`. |
| `number` to `integer`                       | fewer     | Old messages may have carried `2.5`.                         |
| `string` to `["string", "null"]` (nullable) | more      | New messages may carry `null`.                               |
| `["string", "null"]` to `string`            | fewer     | Old messages may have carried `null`.                        |
| Remove `type` entirely                      | more      | The property now accepts anything.                           |
| Add a `type` where there was none           | fewer     | Old messages could have carried anything.                    |
| `string` to `number`, or any other swap     | different | Neither side accepts the other's values.                     |

**Example.** Orders changes `orderId` from `string` to `integer`. Payment on the old schema receives `12345` where it expected `"ord_12345"`. Both directions break, because old messages have strings and new messages have integers.

### Enums and `const`

| Change                            | Bucket    | Why                                                           |
| --------------------------------- | --------- | ------------------------------------------------------------- |
| Add an enum value                 | more      | New messages may carry a value the old reader has never seen. |
| Remove an enum value              | fewer     | Old messages may carry it.                                    |
| Restrict a free string to an enum | fewer     | Old messages could have carried any string.                   |
| Lift an enum restriction          | more      | New messages may carry any string.                            |
| Change a `const`                  | different | The old value is gone and a new one appears.                  |

**Example.** Orders adds `"refunded"` to `status`. Payment on the old schema has a `switch` over `pending` and `paid` with no default branch. The first refunded order hits code that was never written. That is forward breaking, and it is one of the most common real-world breakages.

### Constraints

`minLength`, `maxLength`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `minItems`, `maxItems`, `minProperties`, `maxProperties`, `pattern`, `format`, `multipleOf`, `uniqueItems`.

| Change                                                                                        | Bucket    |
| --------------------------------------------------------------------------------------------- | --------- |
| Tighten (raise a minimum, lower a maximum, add a pattern, add a format, require unique items) | fewer     |
| Loosen (the reverse of any of the above, or remove the keyword)                               | more      |
| Change `pattern`, `format` or `multipleOf` to a different value                               | different |

**Why is a changed pattern "different" rather than tighter or looser?** Because working out whether one regular expression accepts everything another one does is not something we can do reliably. Rather than guess, we treat it as breaking in both directions and let a human look.

### Additional properties, and closed objects

By default a JSON Schema object is **open**: properties not listed in `properties` are allowed. Setting `"additionalProperties": false` makes it **closed**.

| Change                                         | Bucket | Why                                                    |
| ---------------------------------------------- | ------ | ------------------------------------------------------ |
| Open to closed (`additionalProperties: false`) | fewer  | Old messages may have carried extra fields.            |
| Closed to open                                 | more   | New messages may carry fields the old reader rejects.  |
| Add a schema for additional properties         | fewer  | Extra fields used to be anything, now they must match. |

**Closed objects change the property rules.** The property table above assumes an open object, where a reader shrugs at fields it does not know. A closed reader does not shrug. It rejects the whole message.

| Change on a closed object   | Bucket | Why                                                                                            |
| --------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Add an optional property    | more   | New messages carry a field the **old** closed reader has never heard of. Forward breaks.       |
| Remove an optional property | fewer  | Old messages still carry the field, and the **new** closed reader rejects it. Backward breaks. |

**Example.** Payment validates `OrderCreated` with `additionalProperties: false`. Orders adds an optional `placedAt`. Under an open schema this is the safest change there is. Under the closed schema, every new message is rejected by Payment. If you use closed objects, adding fields needs a two-step rollout: consumers first, then producers.

### Arrays

The schema for array items is walked like any other schema, so a change to `items.type` follows the type rules above, with a path like `/properties/lines/items/type`.

Tuples (`items` as an array in draft-07, `prefixItems` in 2020-12) describe positions. Constraining a new position accepts fewer; dropping one accepts more.

### Composition: `oneOf`, `anyOf`, `allOf`

| Change                            | Bucket | Why                                                                  |
| --------------------------------- | ------ | -------------------------------------------------------------------- |
| Add a `oneOf` / `anyOf` branch    | more   | New messages may match a shape the old reader has never seen.        |
| Remove a `oneOf` / `anyOf` branch | fewer  | Old messages may have matched it.                                    |
| Add an `allOf` branch             | fewer  | Every message must now satisfy one more constraint.                  |
| Remove an `allOf` branch          | more   | A constraint is gone.                                                |
| Change inside a branch            | walked | Reported at the branch path, e.g. `/properties/payment/oneOf/0/...`. |

**Example.** Orders adds an `apple_pay` branch to `payment.oneOf`. Payment on the old schema receives a payment shape it cannot validate. Forward breaking.

### `$ref` and definitions

References to `#/definitions/...` and `#/$defs/...` are followed before comparing, including a ref that points at another ref. A change inside a definition is reported **once**, at the definition's path, no matter how many properties use it. Moving an inline object into a definition, or renaming a definition, with identical content is not a change at all.

A `$ref` to **another file** cannot be followed, because the diff only sees the one schema. If such a ref changes, it is reported as `keyword.changed` and treated as breaking both ways. If it is unchanged, nothing is reported.

### Things that are never breaking

Changing `title`, `description`, `examples`, `$comment`, `$id`, `$schema` or `default`. Reordering `properties`, `required` entries, `enum` values or `oneOf` branches. None of these change what values are accepted, so none of them produce any ops.

One annotation is reported without being breaking: `"deprecated": true`. Catalogs care about deprecation, so it appears as a `schema.deprecated` op that a UI can show.

### Things we refuse to judge

`patternProperties`, `propertyNames`, `not`, `if` / `then` / `else`, `dependentRequired`, `dependentSchemas`, `dependencies`, `contains`, `minContains`, `maxContains`, `unevaluatedProperties`, `unevaluatedItems`, `additionalItems`.

These keywords can express almost anything, and deciding compatibility for them properly is a research problem. When one of them changes, the diff reports it as `keyword.changed` and treats it as breaking in **both** directions. That is deliberate. A false alarm costs a human a minute. A silent pass costs an outage.

---

## Reading a diff result

For every changed schema the diff gives you:

- **`breaking`**: `true`, `false`, or `null` when the index was built without schema content and no verdict was possible.
- **`direction`**: which side breaks. `forward` means existing consumers are hurt. `backward` means consumers replaying old data are hurt. `both` means both.
- **`ops`**: every change found, each with a JSON pointer path, a stable `kind`, a human `reason`, and its own `breaking` flag under the chosen strategy.

And for every breaking change, an **impact** entry naming the producers and consumers of that message, with their owners, taken from the catalog graph.

So "Orders removed `customerId` from `OrderCreated`" comes back as: breaking, direction forward, one op at `/properties/customerId` saying the property is no longer required, and an impact entry saying Payment Service, owned by team-payments, consumes this message.

---

## Frequently asked questions

**I added an optional field and the diff says breaking under `full`. Why?**
Check the ops. An optional field alone is safe. Usually something else changed in the same commit, often a description tidy-up that also touched an enum, or a field that was made required at the same time.

**Adding an enum value is breaking? Everybody does that.**
Under `forward`, yes, and it is genuinely the cause of real incidents: consumers with an exhaustive switch and no default. Under `backward` it is safe. If your consumers are all written defensively, run with `backward` and the diff will agree with you.

**My schema uses `if` / `then`. Every change is flagged.**
Only changes to the `if` / `then` blocks themselves. Changes elsewhere in the schema are judged normally. If the conditional logic changes, a human should look.

**What does a version bump do?**
If the baseline has `OrderCreated` 1.0.0 and the candidate adds 2.0.0, then 1.0.0 is compared against 2.0.0 and both versions are recorded on the change. A version bump does not make a breaking change safe. It just makes it visible and intentional. Separately, every version that exists on both sides is compared against itself, so editing 1.0.0 in place while 2.0.0 exists is still found.

**I renamed the schema file. Will the diff lose track of it?**
No. Schema files are paired by `id`, then `path`, then the `default` flag, and if exactly one file is left on each side they are paired by elimination. A file that genuinely appears or disappears is reported as an added or removed schema.

**My messages use Avro, not JSON Schema.**
The diff sees that the file changed, because the hash differs, but cannot judge it yet. The change is reported with `breaking: null` and counted in `summary.schemaUnknown`. Nothing marks the diff as breaking, so make sure your policy treats a non-zero unknown count as "a human needs to look". Silently passing an unjudged change is the one thing this tool must never do.

**Why doesn't a schema with no consumers still count as breaking?**
It does. The diff reports facts. The impact entry will show an empty `consumers` list, and the policy layer, for example the CLI, can decide that nobody is hurt and downgrade it to a warning.

**Where do these rules come from?**
The definitions of backward, forward and full match [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html). The per-keyword reasoning follows Confluent's [JSON Schema compatibility notes](https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-json.html), using their lenient reading of the open content model.

**A rule looks wrong to me.**
Open `src/test/json-schema/json-schema.test.ts`, find the strategy you run, copy the closest test, paste your before and after schema, and state the verdict you expect. That is the fastest way to have the conversation.
