---
sidebar_position: 3
sidebar_label: Invite editors
title: Invite editors to your organization
description: Add team members in EventCatalog Cloud and assign editor seats so they can use EventCatalog Editor locally.
---

Use [EventCatalog Cloud](https://eventcatalog.cloud) to manage who can use EventCatalog Editor.

The editor still runs locally on each person's machine. Cloud verifies that the person belongs to your organization and has a role that can open a local editor session.

![Invite team members in EventCatalog Cloud](../images/invite-team-members.png)

## Before you start

You need:

- An [EventCatalog Cloud](https://eventcatalog.cloud) organization
- Admin access to that organization
- An available editor seat if you want to invite another admin or editor

If you have not created an organization yet, sign in to [EventCatalog Cloud](https://eventcatalog.cloud) and complete the organization setup first.

## Editor seats by plan

Editor seats control how many people can use EventCatalog Editor for an organization.

- Community includes 1 editor seat
- Starter includes 3 editor seats
- Scale includes 10 editor seats
- Enterprise includes unlimited editor seats

Admins and editors use editor seats. Viewers are free, but viewers cannot open a local editor session.

You can compare plans on the [pricing page](/pricing).

## Invite a team member

1. Sign in to [EventCatalog Cloud](https://eventcatalog.cloud).
2. Open the organization you want the editor to use.
3. Go to **Team**.
4. Enter the team member's email address.
5. Choose their role.
6. Click **Invite**.

Invitations expire after 7 days.

Pending invitations for admin and editor roles count toward your editor seat usage. If you run out of editor seats, invite the person as a viewer, cancel an unused pending invitation, change an existing member's role, or upgrade your plan.

## Choose the right role

- Admin can manage the organization, invite members, and use EventCatalog Editor.
- Editor can use EventCatalog Editor for the organization.
- Viewer can belong to the organization without using an editor seat.

Use **Editor** for most people who need to maintain catalog content. Use **Admin** when the person also needs to manage organization settings and team access.

## What the invited person does next

After accepting the invitation, the team member can:

1. Clone or open the EventCatalog project locally.
2. Install catalog dependencies if needed.
3. [Run EventCatalog Editor locally](/docs/editor/how-to/run-locally).
4. Sign in with [EventCatalog Cloud](https://eventcatalog.cloud) when the editor asks for access.
5. Choose the organization if their account belongs to more than one organization.

The editor changes their local files and gives them a Git UI to publish a local commit. It does not upload catalog source files to [EventCatalog Cloud](https://eventcatalog.cloud).
