---
description: Generate a PR description markdown file summarizing branch changes
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git merge-base:*), Bash(git show:*), Bash(mkdir:*), Read, Write, Glob
---

You are a helpful assistant that generates clear, user-friendly PR descriptions.

Goal:
- Analyze the changes in the current branch compared to the main branch
- Generate a well-structured markdown file summarizing the PR
- Save the file to `pr-descriptions/` folder with a descriptive filename

User hint (may be empty): $ARGUMENTS

Workflow:

1) **Gather Information**
   Run these commands to understand the changes:
   - `git branch --show-current` - get current branch name
   - `git merge-base HEAD main` - find common ancestor with main
   - `git log main..HEAD --oneline` - list commits in this branch
   - `git diff main...HEAD --stat` - file change summary
   - `git diff main...HEAD` - full diff for analysis

2) **Analyze the Changes**
   Review all changes and identify:
   - The primary purpose/feature of this PR
   - Key files and components modified
   - Any new dependencies or configurations
   - Potential breaking changes (API changes, removed features, renamed exports, config changes)
   - Testing considerations

3) **Create the pr-descriptions Directory**
   - Run `mkdir -p pr-descriptions` to ensure the folder exists

4) **Generate the PR Description File**
   Create a markdown file with this structure:

   ```markdown
   # PR: [Brief Title Based on Changes]

   **Branch:** `[branch-name]`
   **Date:** [YYYY-MM-DD]
   **Commits:** [number of commits]

   ## What This PR Does

   [2-4 sentences describing the purpose and goals of this PR. Focus on the "why" - what problem does this solve or what feature does it add?]

   ## Changes Overview

   ### Files Changed
   - [List key files/directories modified with brief notes]

   ### Key Changes
   - [Bullet points of the main changes, written for humans to understand]
   - [Focus on what changed, not line-by-line diffs]

   ## How It Works

   [Explain the implementation approach. How does the new code work? What patterns or approaches were used? Include relevant technical details that reviewers should understand.]

   ## Breaking Changes

   [List any breaking changes, or state "None" if there are no breaking changes]

   - **[Change]**: [Description of what broke and how to migrate]

   ## Testing

   - [ ] Unit tests added/updated
   - [ ] Manual testing performed
   - [ ] [Other relevant testing notes]

   ## Screenshots/Examples

   [If applicable, note where screenshots could be added or include code examples]

   ## Checklist

   - [ ] Code follows project conventions
   - [ ] Documentation updated (if needed)
   - [ ] No console errors or warnings introduced
   - [ ] Reviewed for security implications

   ## Additional Notes

   [Any other context, related issues, follow-up work needed, or notes for reviewers]
   ```

5) **Filename Convention**
   Save the file as: `pr-descriptions/[branch-name]-[YYYY-MM-DD].md`
   - Replace `/` in branch names with `-`
   - Example: `pr-descriptions/feat-core-add-mcp-server-2025-01-12.md`

6) **Output**
   After creating the file:
   - Show the full path to the generated file
   - Display a brief summary of what was documented

Constraints:
- Write in clear, simple language that non-technical stakeholders can understand
- Be honest about breaking changes - don't hide them
- If there are no changes compared to main, say so and stop
- Focus on substance over formatting - the content matters more than looking pretty
- Use present tense ("Adds feature" not "Added feature")
- Keep bullet points concise but informative
