---
keywords:
- versioning
- agents
sidebar_label: Versioning
title: Versioning
description: Learn how to version agents in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.41.0" />

All content in EventCatalog can be versioned. Versioning an agent lets you keep a historic snapshot whenever the agent's model, tools, or message connections change in a meaningful way.

## Version an agent

1. Create a `/versioned` directory inside your agent folder if one does not exist yet.
1. Create a new folder with the version number you are archiving.
    - Example: `/agents/FraudReviewAgent/versioned/0.0.1`
1. Copy `index.mdx` (and any other files) into that folder.
    - Example: `/agents/FraudReviewAgent/versioned/0.0.1/index.mdx`
    - The `version` inside this file should match `0.0.1`.
1. Bump the `version` in the root `index.mdx` to the next release.
    - Example: change `version: 0.0.1` to `version: 0.0.2` in `/agents/FraudReviewAgent/index.mdx`.

```
agents/
  FraudReviewAgent/
    index.mdx          ← current version (0.0.2)
    versioned/
      0.0.1/
        index.mdx      ← archived snapshot
```

## Navigate versions

EventCatalog creates version links automatically on every agent page. Users can also navigate directly by adding the version to the URL (e.g. `/docs/agents/FraudReviewAgent/0.0.1` loads the `0.0.1` snapshot).

## When to version

Consider creating a new version when you:

- Upgrade the underlying LLM to a new model or snapshot.
- Add or remove a tool that changes what the agent can reach.
- Change the messages the agent consumes or produces.

Smaller documentation edits (fixing typos, improving descriptions) do not need a new version.
