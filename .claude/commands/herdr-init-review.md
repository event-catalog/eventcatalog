---
description: You will start the herdr agent review process
allowed-tools: Bash(herdr pane:*), Bash(git status:*), Bash(git diff:*), Bash(git diff --staged:*), Bash(git log:*), Read, Edit, Write, Grep, Glob, ListAgents, SendMessage, Skill
---

We are using herdr. You are the coding agent pane; you'll open a reviewer pane to the right of this one.

The reviewer MUST run **Fable** (`claude-fable-5-2`). Not Opus, not Sonnet, not "5.x", not whatever model this pane runs.

Follow these steps exactly:

1. Open the reviewer pane to the right, without focusing it. Note the `pane_id` it returns:
   ```
   herdr pane split --current --direction right --no-focus --cwd "$PWD"
   ```
2. Start Claude in it with the Fable model ID, spelled out in full:
   ```
   herdr pane run <pane_id> "claude --model claude-fable-5-2"
   ```
3. Check it is Fable before going on. Wait for Claude's banner, which names the model:
   ```
   herdr pane wait-output <pane_id> --match "Fable" --timeout 60000
   ```
   If the banner doesn't say Fable (e.g. it says Opus or Sonnet), or the wait times out: STOP. Don't send the
   review command. Tell the user which model started, and close that pane (`herdr pane close <pane_id>`).
4. Start the review in that pane: send the text, then press Enter separately:
   ```
   herdr pane send-text <pane_id> "/herdr-review"
   herdr pane send-keys <pane_id> Enter
   ```
5. In this pane (the coding agent), run the herdr-feedback command, passing the reviewer's pane ID.

Then your setup is complete and the commands will take over here. Tell the user the reviewer is running Fable (as
its banner showed).
