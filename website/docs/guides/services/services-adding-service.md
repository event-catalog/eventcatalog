---
id: adding-service
title: Adding Services
sidebar_label: Adding Services
slug: /services/adding-service
---

## Adding Services to your EventCatalog

You will find all services within the `/services` directory.

To add a new service you will need to create a new folder with your service name and an `index.md` file inside that folder.

- `/services/{Service Name}/index.md` 
  - (example `/services/Email Platform/index.md`)

Once you create your new file you will need to fill it with the service front-matter data and markdown content. 

**There are two parts to the service data**

1. [service configuration (frontmatter)](/docs/api/event-frontmatter)
2. [content (markdown)](#example)

Fill in the details of your service and run the Catalog. You will see all your services and will be able to navigate around and explore them!

:::warning
**When you define your `producers` or `consumers` in your events the name has to match your Service folder name.**

For example if you define a `producer` in your event called `Email Platform` your service folder name will have to be `Email Platform` (space included)

In the future we may look at using `ids` vs `folder-name` matching here, if you are having problems, let us know and we can review this feature.
:::


## Example of adding a Service {#example}

Let's add a new service called **Email Platform**.

Create a new folder in the `/services/` directory called `Email Platform`, then add your `index.md` to that folder.

For example: `/services/Email Platform/index.md`

Copy the contents below into your new file.

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

Once done, run the EventCatalog and navigate to your new event [localhost:3000/services/Email%20Platform](http://localhost:3000/services/Email%20Platform)

You should now see your new service!

**Well done. You created your first service** 🎉.