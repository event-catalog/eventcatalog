---
keywords:
- EventCatalog
- agents
- deprecation
sidebar_label: Deprecating agents
title: Deprecating agents
description: Deprecating agents with EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.41.0" />

Any resource in EventCatalog can be deprecated. Deprecating an agent displays a banner on its page so consumers know it is no longer actively maintained.

## Deprecate using frontmatter

Add the `deprecated` field to your agent's frontmatter:

```md title="/agents/FraudReviewAgent/index.mdx (example)"
---
id: FraudReviewAgent
version: 0.0.1

# Deprecated as an object (recommended — gives a date and reason)
deprecated:
  date: 2025-09-01
  message: |
    This agent has been replaced by **FraudReviewAgentV2**, which uses the updated risk scoring pipeline.
    Contact the [Payments team](mailto:payments@example.com) for migration guidance.

# Or deprecated as a simple boolean
deprecated: true
---
```

Using an object is recommended because it gives readers a date and a reason. The `date` can be in the past (already deprecated) or the future (will be deprecated).

- `deprecated.date` — Date in `YYYY-MM-DD` format.
- `deprecated.message` — Markdown string explaining why the agent is deprecated and what to use instead.
