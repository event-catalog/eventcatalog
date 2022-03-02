---
id: events
title: Events
---

In this section, we will learn about events in EventCatalog.

This is useful for understanding how to create events, version events and remove events from your catalog.

Events are designed to be easily added and maintained without your Catalog. At the heart of the events is the Markdown file.

Events live in the root directory under the `/events` folder.

Each event is made up of two parts:

- [**Frontmatter (configuration)**](/docs/api/event-frontmatter)
- **Content (using MDX)**

## Adding a Event

Let's add a new event called **UserSignedUp** `/events/UserSignedUp/index.md`

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

Once done, navigate to your new event [localhost:3000/events/UserSignedUp](http://localhost:3000/events/UserSignedUp)

You will see the following page 👇

![UserSignedUp Example](/img/guides/events/UserSignedUpExample.png)

**Well done. You created your first event** 🎉.

Let's take a look at this Markdown file and go through each part to understand what is happening.

### Understanding the Frontmatter

The frontmatter of your Event Markdown files is where core information is kept. You can use this to store the event name, version, summary and more.

To get a full detail of what the configuration looks like checkout the [event frontmatter config](/docs/api/event-frontmatter).

In our example above, we have one event called `UserSignedUp` and it has one producer (User Service) and one consumer (Email Platform).

This mean the `User Service` produces this event and the `Email Platform` consumes the events.

Documenting `Producers` and `Consumers` are a great way to help your team understand who is producing or consuming what events.

:::info

Keeping information up to date can be the main problem with documentation. EventCatalog allows you to generate documentation with your exisiting solutions using our generators and plugin systems. 

:::

### Adding Content

Everything below the front-matter is [markdown](https://www.markdownguide.org/getting-started/). EventCatalog will render this out, so feel free to render what you want.

EventCatalog also comes with some preconfigured [MDX](https://mdxjs.com/) components that allows you to bring your Markdown alive with some great components.

To find out more read the [MDX components guide](/docs/components/overview).

## Adding Owners to Events

Event ownership is a key concept of EventCatalog. If you work in a distributed system your events may be managed and owned by different teams, but knowing these owners can be quite hard.

Let's add some owners to our new **UserSignedUp** event.

First let's add some users to our project.

Open up the `eventcatalog.config.js` file and add the following.

```js title="/eventcatalog.config.js"
module.exports = {
  // ...
  users: [
    {
      id: 'dboyne',
      name: 'David Boyne',
      avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      role: 'Developer',
      summary: 'Maintainer of EventCatalog and loves building tools for Event Architectures.'
    },
  ],
};
```

:::info Adding Users to your catalog

The `eventcatalog.config.js` is the place to store your users information. You can access these across events and services.

Find out more reading the [users documentation](/docs/api/eventcatalog-config#users)

:::

Great, so we have added the user `David Boyne` with the id `dboyne`. Let's go back to our event and add this user.

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
owners:
    - dboyne    
---

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id
tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus.
Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget
neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium.
Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.

<Mermaid />

```

### Linking Events to Services

### Versioning Events

### Removing Events
