---
sidebar_position: 2
keywords:
- EventCatalog teams
sidebar_label: Creating a team
title: Creating teams
description: Creating and managing teams within EventCatalog.
---

Adding a team to your Catalog is a great way to add a collection of owners for domain, service or message.

### What do teams look like in EventCatalog?

![Example](../../img/teams/example.png)

## Adding a new team

To add a new team create a new folder within the `/teams` folder with an `md` file.

- `/teams/{team Name}.mdx` 
  - (example `/teams/full-stack.mdx`)

The `md` contents are split into two sections, **frontmatter** and the **markdown content**.

_Here is an example of what a team markdown file may look like._

```md title="/teams/full-stack.md (example)"
---
# id of the team
id: full-stack

# display name for the team
name: Full stackers

# short summary of the team
summmary: Full stack developers based in London, UK

# members of the team (users live in /users directory)
members:
    - dboyne
    - asmith
    - msmith

# optional email address to contact the team
email: test@test.com

# optional slack URL to send them a DM
slackDirectMessageUrl: https://yourteam.slack.com/channels/boyney123
---

## Overview

The Full Stack Team is responsible for developing and maintaining both the front-end and back-end components of our applications. This team ensures that the user interfaces are intuitive and responsive, and that the server-side logic and database interactions are efficient and secure. The Full Stack Team handles the entire lifecycle of web applications, from initial development to deployment and ongoing maintenance.

```

**That's it!**

Once you add your new team to EventCatalog, it will now show in the docs.

## Adding content

With **teams** you can write any Markdown you want and it will render on your page. Every command gets its own page.

Teams do not support custom components.

### Tips for team content

It's entirely up to you what you want to add to your teams markdown content but here are a few things you might want to consider.

- Context of the team. Who are they? 
- Contact info for the team?

