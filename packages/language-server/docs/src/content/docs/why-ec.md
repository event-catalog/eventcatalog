---
title: Why Model Architecture in .ec
description: The problem the DSL solves for teams designing event-driven systems.
---

Architecture design usually starts in Miro boards, Confluence pages, slide decks, and Slack threads.
Those tools are useful for discussion, but weak for long-term architecture change control.

Once implementation starts, teams often backfill docs later in Markdown.
That split creates drift: design decisions live in one place, durable docs in another.

## The failure pattern

- Design artifacts are fast, but not versioned as architecture.
- Durable docs are publishable, but slow to keep current.
- Architecture changes are discussed in threads and decks, not reviewed in PRs.
- Teams lose the connection between intent, decision, and implementation over time.

## The circular workflow solves drift

The key is a loop, not a one-way export:

1. Model the change in `.ec`.
2. Review it in Git with normal diffs and pull requests.
3. Import it into EventCatalog for durable documentation.
4. Export back to `.ec` as the starting point for the next change.

Because documentation can flow back into modeling, docs stay active instead of becoming dead snapshots.

## Why this works for leads and architects

- Architecture changes become reviewable engineering artifacts.
- Future-state modeling can happen quickly without waiting for full doc rewrites.
- A single modeling source can drive both visual exploration and published documentation.

## AI and LLMs

LLMs are better with structured inputs than prose-heavy architecture narratives.
`.ec` gives a constrained format that AI can draft, refactor, and compare in diffs.
Teams still keep EventCatalog as the long-term published artifact and review gate.

## Next step

Start with the [Tutorial](/get-started/tutorial/).
