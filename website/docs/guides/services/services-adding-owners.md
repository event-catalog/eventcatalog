---
id: adding-service-owners
title: Adding Service Owners
sidebar_label: Adding Service Owners
slug: /services/adding-service-owners
---

Service ownership is a key concept of EventCatalog. If you work in a distributed system your services may be managed and owned by different teams, but knowing these owners can be quite hard.

Let's add some owners to our new **Email Platform** service.

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

Great, so we have added the user `David Boyne` with the id `dboyne`. Let's go back to our service and add this user.

```mdx title="/services/Email Platform/index.md"
---
id: Email Platform
name: Email Platform
summary: Internal Email system. Used to send emails to 1000s of customers. Hosted in AWS
owners:
    - dboyne
---

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus. Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium. Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.

<Mermaid />

```

Now when you render your service you will see your new `owner` for that service. You can add as many owners as you like, as long as you add their details in the `eventcatalog.config.js` file.