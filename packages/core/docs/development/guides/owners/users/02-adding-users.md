---
sidebar_position: 2
keywords:
- EventCatalog users
sidebar_label: Creating a user
title: Creating users
description: Creating and managing users within EventCatalog.
---

Adding a user to your Catalog is a great way to add an owner for a domain, service or message.

### What do users look like in EventCatalog?

![Example](../../img/users/example.png)

## Adding a new user

To add a new user, create a new file within the `/users` folder with an `md` file.

- `/users/{user id}.mdx` 
  - (example `/users/dboyne.mdx`)

The `md` contents are split into two sections, **frontmatter** and the **markdown content**.

_Here is an example of what a user markdown file may look like._

```md title="/users/full-stack.md (example)"
---
# id of the user
id: dboyne

# display name for the user
name: David Boyne

# URL path for a profile image
avatarUrl: "https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png"

# users role in the company
role: Lead developer

# optional user email address
email: test@test.com

# optional slack link to DM the user
slackDirectMessageUrl: https://yourteam.slack.com/channels/boyney123
---

## Overview

<!-- Contents about the user -->

```

**That's it!**

Once you add your new user to EventCatalog, it will now show in the docs.

## Adding content

With **users** you can write any Markdown you want and it will render on your page. Every command gets its own page.

Users do not support custom components.

### Tips for user content

It's entirely up to you what you want to add to your users markdown content but here are a few things you might want to consider.

- Context of the user. Who are they? 
- Contact info for the user?

