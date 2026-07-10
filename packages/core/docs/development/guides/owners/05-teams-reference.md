---
keywords:
- EventCatalog teams
- Team frontmatter
sidebar_position: 4
sidebar_label: Teams reference
title: Teams reference
description: Frontmatter fields and paths for teams in EventCatalog.
---

This page lists the fields and paths supported by teams.

## Paths

Teams are created in the `teams` folder:

```txt
/teams/{team-id}.mdx
```

Teams can also be synced from directory sources such as GitHub or Microsoft Entra.

## Routes

| Route | Description |
|-------|-------------|
| `/docs/teams/{team-id}` | Team documentation page. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the team. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: payments-platform
---
```

### `name` {#name}

- Type: `string`

Display name of the team.

```md title="Example"
---
name: Payments Platform
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short description of the team.

```md title="Example"
---
summary: Owns payment processing and refund workflows.
---
```

### `email` {#email}

- Type: `string`

Team email address.

```md title="Example"
---
email: payments@example.com
---
```

### `hidden` {#hidden}

- Type: `boolean`

Hide the team from generated lists.

```md title="Example"
---
hidden: true
---
```

### `slackDirectMessageUrl` {#slackDirectMessageUrl}

- Type: `string`

Slack URL for contacting the team.

```md title="Example"
---
slackDirectMessageUrl: https://slack.example.com/team/payments
---
```

### `msTeamsDirectMessageUrl` {#msTeamsDirectMessageUrl}

- Type: `string`

Microsoft Teams URL for contacting the team.

```md title="Example"
---
msTeamsDirectMessageUrl: https://teams.microsoft.com/l/channel/example
---
```

### `members` {#members}

- Type: `array`

Users that belong to the team.

```md title="Example"
---
members:
  - dboyne
---
```

## Example

```md
---
id: payments-platform
name: Payments Platform
summary: Owns payment processing and refund workflows.
members:
  - dboyne
ownedServices:
  - payment-api
ownedEvents:
  - PaymentAuthorized
---
```
