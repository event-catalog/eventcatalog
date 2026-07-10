---
keywords:
- EventCatalog users
- User frontmatter
sidebar_position: 5
sidebar_label: Users reference
title: Users reference
description: Frontmatter fields and paths for users in EventCatalog.
---

This page lists the fields and paths supported by users.

## Paths

Users are created in the `users` folder:

```txt
/users/{user-id}.mdx
```

Users can also be synced from directory sources such as GitHub or Microsoft Entra.

## Routes

| Route | Description |
|-------|-------------|
| `/docs/users/{user-id}` | User documentation page. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the user. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: dboyne
---
```

### `name` {#name}

- Type: `string`

Display name of the user.

```md title="Example"
---
name: David Boyne
---
```

## Optional fields

### `avatarUrl` {#avatarUrl}

- Type: `string`

Avatar URL for the user.

```md title="Example"
---
avatarUrl: https://github.com/dboyne.png
---
```

### `role` {#role}

- Type: `string`

User role or title.

```md title="Example"
---
role: Staff Engineer
---
```

### `email` {#email}

- Type: `string`

User email address.

```md title="Example"
---
email: david@example.com
---
```

### `hidden` {#hidden}

- Type: `boolean`

Hide the user from generated lists.

```md title="Example"
---
hidden: true
---
```

### `slackDirectMessageUrl` {#slackDirectMessageUrl}

- Type: `string`

Slack direct message URL.

```md title="Example"
---
slackDirectMessageUrl: https://slack.example.com/team/dboyne
---
```

### `msTeamsDirectMessageUrl` {#msTeamsDirectMessageUrl}

- Type: `string`

Microsoft Teams direct message URL.

```md title="Example"
---
msTeamsDirectMessageUrl: https://teams.microsoft.com/l/chat/example
---
```

