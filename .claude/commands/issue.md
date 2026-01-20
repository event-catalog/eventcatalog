---
description: Create a GitHub issue in this project
allowed-tools: Bash(gh issue create:*), Bash(gh label list:*)
---

You are creating a GitHub issue for the EventCatalog project using the GitHub CLI (`gh`).

Goal:
- Create a clear, concise GitHub issue based on the user's request.
- Keep it simple and to the point.

User request: $ARGUMENTS

Workflow:
1) Parse the user's request to understand:
   - What the issue is about
   - Whether it's a bug, feature request, enhancement, or documentation need
2) Fetch available labels with `gh label list` to see what labels exist.
3) Create the issue with `gh issue create`:
   - Write a clear, concise title (imperative mood, lowercase)
   - Write a focused body that captures the requirement without fluff
   - Add appropriate labels based on issue type:
     - Bug: `bug`
     - Feature: `enhancement`
     - Documentation: `documentation`
     - Add other relevant labels if they exist and apply

Issue format:
- Title: Short, descriptive, imperative (e.g., "add support for X", "fix Y when Z")
- Body:
  - Brief description of what is needed
  - Context if necessary (1-2 sentences max)
  - No verbose templates or unnecessary sections

Constraints:
- Do not add sections that aren't needed (no "steps to reproduce" for features, etc.)
- Keep the body under 200 words unless complexity requires more
- Do not ask follow-up questions - use your judgment based on the request
- After creating, output the issue URL
