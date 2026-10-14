---
sidebar_position: 4
keywords:
- EventCatalog Studio
- collaboration
- comments
- hotspots
sidebar_label: Collaborate on a canvas
title: Collaborate on a canvas
description: Share a canvas, work on it live, discuss it, and record the decision.
---

## Share a canvas

1. On the canvas, choose **Share**.
2. Choose **Copy link**, or **Invite people** to email an invite or copy an invite message.

![The Share dialog](./img/share.png)

Anyone with the link opens the canvas in your catalog and edits it with you.

When [authentication](/docs/development/authentication/introduction) is on, only signed-in people can open canvases, and they appear with the name and picture they signed in with. Without authentication, Studio asks each person for a name, and keeps it in their browser.

## Work on it live

Everyone on a canvas sees each other's pointers, names and changes as they happen. Changes save automatically.

- The avatars at the top right show who is on the canvas. Click one to jump to what that person is looking at.
- Click your own avatar to change your name and colour.

## Comment

1. Choose **Comment** in the toolbar, or press <kbd>C</kbd>.
2. Click a node, or a spot on the canvas.
3. Type your comment and press <kbd>Enter</kbd>.

Click a comment pin to reply. Choose **Resolve** when the thread is settled. **Comments** at the bottom of the canvas lists every thread.

![A comment thread on the Pay Later Provider](./img/comments.png)

## Flag a risk with a hotspot

A hotspot flags a risk on a node or a spot, such as a single point of failure or data that needs a review.

1. Choose **Hotspot** in the toolbar, or press <kbd>A</kbd>.
2. Click the node at risk.
3. Pick **Critical**, **Warning** or **Info**, and add a short title and, if you want, why it matters.

**Hotspots** at the bottom of the canvas lists every hotspot. At L1 and L2, hotspots inside a domain or system are shown on that domain or system, so zooming out never hides a risk.

![A warning hotspot on the Instalment Plans database](./img/hotspots.png)

## Add notes and text

- **Sticky note** (<kbd>N</kbd>): click where it goes and type. Use notes for assumptions, scope and open questions.
- **Text** (<kbd>T</kbd>): click anywhere and type. Use text for headings and labels.

Double-click a note or text to edit it.

## Record the decision

Every canvas has a status: **Draft**, **Proposed**, **Accepted** or **Rejected**.

1. Choose the status next to the canvas title.
2. Add a note if you want, for example `Agreed in the architecture review`.
3. Pick the new status.

The menu shows the history of status changes, with who made each change, when, and the note.

![The status menu with a note](./img/status.png)

Changing the nodes or connections on an accepted or rejected canvas makes it a draft again, so a decision always matches the design it was made on.

To find designs waiting for review, open **Studio** and filter by **Proposed**.

## Lock the canvas

Choose the lock in the toolbar. Everyone can still look at the canvas, but no one can change it until it is unlocked.
