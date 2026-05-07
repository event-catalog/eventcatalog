---
description: Update EventCatalog docs in website-2 based on uncommitted changes (or the previous commit) using the docs-updater agent
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git diff --staged:*), Bash(git log:*), Bash(git show:*), Bash(git rev-parse:*), Bash(git branch:*), Read, Agent
---

You are coordinating a documentation update for EventCatalog. The actual writing is delegated to the `docs-updater` agent (defined in `.claude/agents/docs.md`). Your job is to gather change context, then dispatch that agent with a complete brief.

User hint (may be empty, may contain release type like "minor" / "patch" / "major" or an explicit version): $ARGUMENTS

## Workflow

### 1) Decide which changes to document

Run `git status` and `git diff --stat` first.

- If there are **uncommitted changes** (staged or unstaged) → document those.
- If the working tree is clean → document the **previous commit** (`HEAD`). Use `git show HEAD` and `git log -1`.
- If both apply (uncommitted + the user clearly meant the last commit), ask the user which to use before proceeding.

Capture the actual diff with one of:
- `git diff` and `git diff --staged` (uncommitted)
- `git show HEAD` (previous commit)

Only `@eventcatalog/core` (under `packages/core/`) changes need user-facing docs. If the diff is purely SDK / CLI / playground / language-server / tests / formatting, tell the user there's nothing to document and stop.

### 2) Resolve the release version

The `docs-updater` agent will tag new content with `<AddedIn version="..." />`, so it needs an exact version.

- Read the current version from `packages/core/package.json`.
- If the user passed a release type in `$ARGUMENTS` (patch / minor / major) or an explicit version, compute / use that.
- If no release type was given, **ask the user** which bump to use before dispatching the agent. Do not guess.

### 3) Dispatch the docs-updater agent

Launch a single `Agent` call with `subagent_type: "docs-updater"`. The agent has no memory of this conversation — your prompt must be self-contained. Include:

- The resolved target version (e.g. `3.33.0`) and the release type.
- A summary of what changed (feature description, not a raw diff dump) — point at file paths and line numbers so the agent can read them itself.
- Whether you're documenting uncommitted changes or `HEAD`, and how to reproduce the diff (the exact `git` command).
- A reminder that docs live in `eventcatalog/website-2/docs` (never `/website`) and that every new/changed feature must carry an `<AddedIn />` marker with the resolved version.
- Any user hint from `$ARGUMENTS` that's relevant (e.g. "this is a paid feature", "ship under the Scale plan section").

Keep the brief tight — the agent will do its own exploration of `website-2`.

### 4) Report back

After the agent returns, summarise to the user in 2–3 lines:
- Which doc files were created or updated.
- The version stamped via `<AddedIn />`.
- Anything the agent flagged as unresolved (missing screenshots, ambiguous placement, etc.).

## Constraints

- Never edit docs yourself in this command — always delegate to the agent so its conventions (tone, headings, `<AddedIn />` rules) are applied.
- Never invent a version. If unsure, ask.
- If the diff has no user-facing impact (refactor, internal tests, formatting), say so and skip the agent dispatch.
