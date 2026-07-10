---
sidebar_position: 2
keywords:
- EventCatalog teams
sidebar_label: Create a team
title: Create a team
description: Create and manage teams within EventCatalog.
---

import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

A team represents a group of people that owns, maintains, or can answer questions about parts of your architecture.

![Example team page](../img/teams/example.png)

## Adding a new team

### Automatic Creation

<PromptBox preview="Create a new EventCatalog team">
Read https://www.eventcatalog.dev/docs/development/guides/owners/create-team.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/teams.md then help me create a new EventCatalog team in my catalog.

Ask me for the team id, team name, summary, contact email, Slack or Microsoft Teams contact URL if known, and the users that belong to the team. Then create the correct teams/{'{team-id}'}.mdx file with frontmatter and starter markdown.

If users do not exist yet, ask whether to create user files for them too.
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can create the team file, add the right frontmatter, and optionally create user files for team members.

### Manual Creation

Teams live in the `/teams` folder.

Create one `.mdx` file for each team.

<ProjectTree
  items={[
    {
      name: 'teams',
      type: 'folder',
      defaultOpen: true,
      children: [{ name: 'payments-platform.mdx', highlight: true }],
    },
  ]}
/>

## Create the team file

Create a team file with frontmatter and markdown content.

```md title="/teams/payments-platform.mdx"
---
# id of the team, used for references from resources
id: payments-platform

# display name for the team
name: Payments Platform

# short summary of the team
summary: Owns payment processing, refunds, and payment platform reliability.

# users that belong to the team
members:
  - dboyne
  - asmith

# optional email address to contact the team
email: payments@example.com

# optional Slack URL to contact the team
slackDirectMessageUrl: https://yourteam.slack.com/channels/payments-platform
---

## Overview

The Payments Platform team owns payment processing, refund workflows, and the operational systems that support payments across the organization.
```

Once the file is added, the team appears in EventCatalog and can be referenced by resources.

## Add team members

Team members reference users by id. User files live in the `/users` folder.

<ProjectTree
  items={[
    {
      name: 'users',
      type: 'folder',
      defaultOpen: true,
      children: [
        { name: 'dboyne.mdx', highlight: true },
        { name: 'asmith.mdx', highlight: true },
      ],
    },
    {
      name: 'teams',
      type: 'folder',
      defaultOpen: true,
      children: [{ name: 'payments-platform.mdx', highlight: true }],
    },
  ]}
/>

## Next steps

- [Create a user](/docs/development/guides/owners/create-user)
- [Review the teams reference](/docs/development/guides/owners/teams-reference)
- [Sync teams from external systems](/docs/development/guides/owners/automated-teams-and-users)
