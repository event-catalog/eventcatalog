---
keywords:
- changelog
- agents
sidebar_label: Adding a changelog
title: Agent changelogs
description: Adding changelogs to agents in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.41.0" />

EventCatalog supports changelogs for agents. When you version an agent you can attach a `changelog.mdx` to capture what changed and why.

## Add a changelog

1. Add a `changelog.mdx` to your agent folder (or a versioned snapshot):
    - Current version: `/agents/{Agent}/changelog.mdx`
    - Versioned snapshot: `/agents/{Agent}/versioned/0.0.1/changelog.mdx`

```md title="/agents/FraudReviewAgent/changelog.mdx (example)"
---
createdAt: 2025-06-01
badges:
  - content: Model upgrade
    backgroundColor: purple
    textColor: purple
---

### Upgraded to GPT-4.1

The agent now runs on `gpt-4.1` (snapshot `2025-04-14`). Response latency for fraud signal explanations dropped by ~30% compared to the previous model. No changes to tools or message connections.
```

Navigate to the changelog by clicking the **Changelog** button on the agent page, or visit `/docs/agents/{Agent}/{version}/changelog` directly.

## Why add changelogs?

Changelogs give your team the context behind model upgrades, tool additions, and prompt changes. They are especially valuable for agents because behavior can shift when the underlying model changes even without a code deployment.
