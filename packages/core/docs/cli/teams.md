---
id: cli-teams
title: Teams
sidebar_label: Teams
sidebar_position: 8
---

# Teams CLI Commands

Manage teams in your EventCatalog from the command line.

## getTeam

Returns a team from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the team to retrieve |

**Examples:**

```bash
# Get a team
npx @eventcatalog/cli getTeam "platform-team"
```

---

## getTeams

Returns all teams from EventCatalog

**Arguments:** None

**Examples:**

```bash
# Get all teams
npx @eventcatalog/cli getTeams
```

---

## writeTeam

Writes a team to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| team | json | Yes | Team object with id, name, and markdown |
| options | json | No | Options: &#123;path?, override?&#125; |



---

## rmTeamById

Removes a team by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the team to remove |

**Examples:**

```bash
# Remove a team
npx @eventcatalog/cli rmTeamById "platform-team"
```

---
