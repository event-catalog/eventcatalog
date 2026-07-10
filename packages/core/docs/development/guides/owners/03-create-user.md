---
sidebar_position: 3
keywords:
- EventCatalog users
sidebar_label: Create a user
title: Create a user
description: Create and manage users within EventCatalog.
---

import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

A user represents a person who owns, maintains, or can answer questions about resources in your architecture.

![Example user page](../img/users/example.png)

## Adding a new user

### Automatic Creation

<PromptBox preview="Create a new EventCatalog user">
Read https://www.eventcatalog.dev/docs/development/guides/owners/create-user.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/users.md then help me create a new EventCatalog user in my catalog.

Ask me for the user id, name, role, email, avatar URL if known, Slack or Microsoft Teams contact URL if known, and any teams they belong to. Then create the correct users/{'{user-id}'}.mdx file with frontmatter and starter markdown.
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can create the user file and add the right ownership/contact metadata.

### Manual Creation

Users live in the `/users` folder.

Create one `.mdx` file for each user.

<ProjectTree
  items={[
    {
      name: 'users',
      type: 'folder',
      defaultOpen: true,
      children: [{ name: 'dboyne.mdx', highlight: true }],
    },
  ]}
/>

## Create the user file

Create a user file with frontmatter and markdown content.

```md title="/users/dboyne.mdx"
---
# id of the user, used for references from resources
id: dboyne

# display name for the user
name: David Boyne

# optional URL path for a profile image
avatarUrl: https://github.com/dboyne.png

# user's role in the company
role: Lead developer

# optional user email address
email: david@example.com

# optional Slack URL to contact the user
slackDirectMessageUrl: https://yourteam.slack.com/team/dboyne

# optional teams this user belongs to
associatedTeams:
  - payments-platform
---

## Overview

David works on platform architecture and helps teams document their event-driven systems.
```

Once the file is added, the user appears in EventCatalog and can be referenced by resources or teams.

## Add users to teams

Teams can reference users in their `members` array:

```md title="/teams/payments-platform.mdx"
---
id: payments-platform
name: Payments Platform
members:
  - dboyne
---
```

## Next steps

- [Create a team](/docs/development/guides/owners/create-team)
- [Review the users reference](/docs/development/guides/owners/users-reference)
- [Sync users from external systems](/docs/development/guides/owners/automated-teams-and-users)
