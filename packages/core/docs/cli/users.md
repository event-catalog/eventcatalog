---
id: cli-users
title: Users
sidebar_label: Users
sidebar_position: 9
---

# Users CLI Commands

Manage users in your EventCatalog from the command line.

## getUser

Returns a user from EventCatalog by their ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the user to retrieve |

**Examples:**

```bash
# Get a user
npx @eventcatalog/cli getUser "jsmith"
```

---

## getUsers

Returns all users from EventCatalog

**Arguments:** None

**Examples:**

```bash
# Get all users
npx @eventcatalog/cli getUsers
```

---

## writeUser

Writes a user to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user | json | Yes | User object with id, name, and markdown |
| options | json | No | Options: &#123;path?, override?&#125; |



---

## rmUserById

Removes a user by their ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the user to remove |

**Examples:**

```bash
# Remove a user
npx @eventcatalog/cli rmUserById "jsmith"
```

---
