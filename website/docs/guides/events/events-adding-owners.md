---
id: adding-event-owners
title: Adding Event Owners
sidebar_label: Adding Event Owners
slug: /events/adding-event-owners
---

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

Now when you render your event you will see your new `owner` for that event. You can add as many owners as you like, as long as you add their details in the `eventcatalog.config.js` file.