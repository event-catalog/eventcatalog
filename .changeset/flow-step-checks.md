---
'@eventcatalog/core': minor
'@eventcatalog/linter': minor
'@eventcatalog/sdk': minor
---

Flow steps can reference channels (`channel: { id, version }`), drawn as channel nodes with a link to their docs. A step's `title` is now optional and defaults to the name of what it references (or the actor, external system or custom node's name, or the step's id); a custom node's `title` defaults to the step's title. Mistakes in flows no longer fail silently: unknown step properties fail the build (custom ones must start with `x-`), steps that use two node types or both `next_step` and `next_steps` fail with a message naming the step and what to change, and a `next_step` to a step that doesn't exist, or a reference to a resource that isn't in the catalog, logs a warning naming the flow and step. The step `type` field is still accepted but ignored. The linter checks the same rules, adds `refs/flow-step-exists` for next steps that aren't in the flow, and checks channel references in flow steps. The SDK adds `FlowBuilder.addChannelStep`, `channel` on `FlowStep`, an optional `title`, and accepts system and channel references when parsing an index.
