---
sidebar_position: 1
keywords:
- EventCatalog teams
- EventCatalog users
- owners
sidebar_label: What are teams & users?
title: What are teams & users?
description: Understand how teams and users work in EventCatalog.
---

Teams and users describe **ownership** in EventCatalog.

You can assign ownership to any resource in EventCatalog.

Teams & users can be manually created or you can [sync them with your existing systems](/docs/development/guides/owners/automated-teams-and-users).

## Teams

A team is a group of users. Teams are useful when ownership belongs to a platform team, product team, domain team, or operating group rather than one person.

Teams live in the `/teams` folder and can reference users in their frontmatter.

![Example team page](../img/teams/example.png)

## Users

A user represents a person in your organization. Users are useful when a specific person owns, maintains, or can answer questions about a resource.

Users live in the `/users` folder and can be assigned directly as owners or added to teams.

![Example user page](../img/users/example.png)

## How ownership works

You can assign teams and users to resources using owner fields in resource frontmatter.

For example, a domain, service, message, or agent can reference a team or user id in its `owners` array. EventCatalog then shows that ownership on the resource page and links back to the team or user.

## Next steps

- [Create a team](/docs/development/guides/owners/create-team)
- [Create a user](/docs/development/guides/owners/create-user)
- [Sync teams and users from external systems](/docs/development/guides/owners/automated-teams-and-users)
- [Review the teams reference](/docs/development/guides/owners/teams-reference)
- [Review the users reference](/docs/development/guides/owners/users-reference)
