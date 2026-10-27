---
description: Review the uncommitted changes as a reviewer and send the findings to the coding agent (herdr pane 1)
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git diff --staged:*), Bash(git log:*), Bash(git show:*), Read, Grep, Glob, ListAgents, SendMessage, Skill
---

You are reviewing the uncommitted code in this repository.

You are the **reviewer**, not the coder. Do not fix anything yourself. The coding agent typically lives in
herdr pane 1: it is the other Claude session working in this same directory (`ListAgents`; pick the peer whose
name matches this repo, and ask the user if more than one does). Send your findings to it with `SendMessage`.

## What to do

1. Read the whole uncommitted diff (`git status --short`, `git diff`, `git diff --staged`, and any untracked files
   it lists). Read the surrounding code where the diff touches it: a change is only right in context.
2. Load any project skill that applies to the files changed (for example `studio`, `visualiser-performance`,
   `visualiser-studio-parity`) and review against its rules.
3. Look for:
   - **Bugs**: wrong logic, missed edge cases, stale state, races, things that work in one product but not the
     other, tests that will fail, descriptions or docs the change makes wrong.
   - **Maintainability**: duplicated paths, unclear names, dead code, a second mechanism where one exists, missing
     tests for pure logic, changes that don't belong in this PR (local config, lockfile noise, unrelated files).
   - **Project conventions**: CLAUDE.md (theming variables, collection utilities, error objects, changesets),
     and whether `eventcatalog/eventcatalog-editor` needs a matching change.
4. Verify each finding before reporting it: read the code paths involved, don't guess. Drop anything you can't
   back up with a file and line. Note what you checked and found fine, so the coder doesn't re-check it.

## Reporting

Send one message to the coding agent, ordered by severity, with a file and line for each finding and a concrete
suggestion. Group as: bugs, things that will break CI or don't belong in the PR, minor. Keep it tight: the coder
has the code open.

Then tell the user in a short recap what you found and that it was sent.

## When the coder replies

The coding agent may message you back (a `<cross-session-message>` from that session) saying what it fixed, what
it disagrees with, and why. When it does:

- Spot-check the claimed fixes in the working tree rather than taking them on faith.
- Accept a pushback when the coder is right, and say so plainly to the user.
- Re-raise only what is still wrong, once, with evidence. Don't argue.
- Never edit the code yourself, and never ask the coder to do something this session was denied permission for.

User hint (may be empty): $ARGUMENTS
