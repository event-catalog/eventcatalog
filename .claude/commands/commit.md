---
description: Create a semantic commit (EventCatalog conventions), auto-branch if needed
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git diff --staged:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git switch:*), Bash(git checkout:*), Bash(git add:*), Bash(git commit:*), Bash(git restore:*)
---

You are in a git repository that uses EventCatalog-style semantic commit messages.

Goal:
- Create a single commit with message format: `<type>(<scope>): <subject>` where scope is optional.
- Message must be lowercase.
- Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `misc`.
- Pick a scope only if it clearly applies (short, kebab-case). Examples: `core`, `content-docs`, `theme-classic`.

User hint (may be empty): $ARGUMENTS

Workflow:
1) Run:
   - `git status`
   - `git diff`
   - `git diff --staged`
2) If there are both unrelated changes and the user hint clearly targets one thing, keep the commit focused:
   - stage only the relevant files/lines
   - leave unrelated changes unstaged
3) Decide the semantic commit message:
   - Choose the best `type` from the allowed list based on the actual diff
   - Choose `scope` only if unambiguous
   - Write a short present-tense, imperative `subject` in lowercase (no trailing period)
4) Branch handling:
   - Determine current branch with git
   - If on `main` (or `master`) OR in detached HEAD, create and switch to a new branch
   - Branch name format: `<type>/<scope-if-any>-<short-subject>`
     - lowercase, kebab-case
     - example: `feat/core-add-schema-registry-sidebar`
     - if no scope: `fix-update-docs-links`
5) Before committing:
   - Show the exact commit message you plan to use
   - Show the exact branch name (if creating one)
   - Then proceed without asking follow-up questions
6) Stage changes (only what belongs in this commit) using `git add ...`.
7) Create the commit using the exact semantic message.

Constraints:
- Do not include “wip”.
- Do not invent changes not present in the diff.
- If there are no changes to commit, say so and stop.
