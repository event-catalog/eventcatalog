---
id: adding-events
title: Adding Events
sidebar_label: Adding Events
slug: /events/adding-event
---

EventCatalog is designed with the developer experience in mind. 

You should be able to add Events to your catalog within a few steps.

## Adding Events to your EventCatalog

You will find all events within the `/events` directory.

To add a new event you will need to create a new folder with your event name and an `index.md` file inside that folder.

- `/events/{Event Name}/index.md` 
  - (example `/events/UserSignedUp/index.md`)

Once you create your new file you will need to fill it with the event front-matter data and markdown content. 

**There are two parts to the event data**

1. [event configuration (frontmatter)](/docs/api/event-frontmatter)
2. [content (markdown)](#example)

Fill in the details of your event and run the Catalog. You will see all your events and will be able to navigate around and explore them!


## Example of adding an Event {#example}

Let's add a new event called **UserSignedUp**.

Create a new folder in the `/events/` directory called `UserSignedUp`, then add your `index.md` to that folder.

For example: `/events/UserSignedUp/index.md`

Copy the contents below into your new file.

```mdx title="/events/UserSignedUp/index.md"
---
name: UserSignedUp
version: 0.0.1
summary: |
  Tells us when the user has signed up
consumers:
    - Email Platform
producers:
    - User Service
---

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id
tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus.
Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget
neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium.
Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.

<Mermaid />

```

Once done, run the EventCatalog and navigate to your new event [localhost:3000/events/UserSignedUp](http://localhost:3000/events/UserSignedUp)

You should now see your new event!

![UserSignedUp Example](/img/guides/events/UserSignedUpExample.png)

**Well done. You created your first event** 🎉.

Let's go through this markdown file in more detail to understand what is happening.

### Reading the Event Configuration (frontmatter)

Let's take another look at our new Event Configuration.

```mdx title="/events/UserSignedUp/index.md"
---
name: UserSignedUp
version: 0.0.1
summary: |
  Tells us when the user has signed up
consumers:
    - Email Platform
producers:
    - User Service
---
```

As you can see we have our event named `UserSignedUp` which has **one producer** and **one consumer**.

The mapping of [consumers](docs/api/event-frontmatter) and [producers](/docs/api/event-frontmatter) in this format allows EventCatalog to paint a picture of your Architecture and provide you with diagrams, node graphs and enriched user experience.


If you wish to know more about the event configuration you can read the [api docs](/docs/api/event-frontmatter).


### Adding Content (Markdown)

Let's take another look at our UserSignedUp Event.

```mdx title="/events/UserSignedUp/index.md"
---
name: UserSignedUp
version: 0.0.1
summary: |
  Tells us when the user has signed up
consumers:
    - Email Platform
producers:
    - User Service
---

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id
tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus.
Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget
neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium.
Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.

<Mermaid />

```

Everything below the frontmatter section will be rendered on your events page.

Let's have a look at this events content.

```mdx title="/events/UserSignedUp/index.md"

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id
tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus.
Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget
neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium.
Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.

<Mermaid />

```

You can write any Markdown you want and it will render on your Events page. 

:::tip
Think about writing a blog. Your event is just markdown. Write and use it how you like, and the website will render your content!
:::

The great thing about EventCatalog is it uses [MDX](https://mdxjs.com/) to enchange your Markdown files, which means you can add [EventCatalog components](/docs/components/overview) to your page. 

This allows you to add things like:

- [Mermaid Diagrams](https://mermaid-js.github.io/mermaid/#/)
- Event Schemas
- And much more....

To find out more read the [MDX components guide](/docs/components/overview).
