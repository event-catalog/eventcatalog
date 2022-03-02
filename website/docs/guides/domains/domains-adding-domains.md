---
id: adding-domains
title: Adding Domains
sidebar_label: Adding Domains
slug: /domains/adding-domain
---

EventCatalog is designed to help you document your event architectures using events, services and domains.

Adding domains to your Catalog is a great way to group and manage your events and services within your catalog.

## Adding Domains to your EventCatalog

You will find all domains within the `/domains` directory.

To add a new domain you will need to create a new folder within the `/domains` folder in your Catalog and then you will need to create a an `index.md` file inside that folder.

- `/domains/{Domain Name}/index.md` 
  - (example `/domains/Orders/index.md`)

Once you create your new file you will need to fill it with the domain front-matter data and markdown content. 

**There are two parts to the domain data**

1. [domain configuration (frontmatter)](/docs/api/domain-frontmatter)
2. [content (markdown)](#example)

Fill in the details of your domain and run the Catalog. You will see all your domains and will be able to navigate around and explore them!

:::warning
All **domains** need an `index.md` in the domain folder to define your domain so EventCatalog can parse and understand your domains.
:::

### Grouping services and events within domains

Using **domains** in EventCatalog allows you to group your **services** and **events** by domains, which makes it easier to maintain and navigate your architecture.

To add events or services you will need to create an `/events/` or `/services/` directory inside your domain folder.

- `/domains/{Domain Name}/events/{Event Name}/index.md` 
  - (example `/domains/Orders/events/OrderCreated/index.md`)
- `/domains/{Domain Name}/services/{Service Name}/index.md` 
  - (example `/domains/Orders/services/OrderService/index.md`)

The events and services format is exactly the same as the root level events and services folder structure you see in EventCatalog. 

More reading:
- [Learn how to add events](/docs/events/adding-event)
- [Learn how to add services](/docs/services/adding-service)

### Migrating events and services into domains

If you already have **events** or **services** in your catalog and want to add **domains** you can follow these steps:

1. Create `/domains/` folder in the route of your Catalog
2. Create your domains (e.g /domains/{Your Domain}/index.md)
3. Move your events or services into the domains (e.g /domains/{Your Domain}/events/{Your events})

After you move your **events** or **services** and run your Catalog you will see them grouped by the domain you specified.

## Example of adding a Domain {#example}

#### 1. Adding new Domain (Orders)

Let's add a new domain called **Orders**.

Create a new folder in the `/domains/` directory called `Orders`, then add your `index.md` to that folder.

For example: `/domains/Orders/index.md`

Copy the contents below into your new file.

```mdx title="/domains/Orders/index.md"
---
name: Orders
summary: |
  Domain that holds all the order information
---

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id
tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus.
Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget
neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium.
Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.


<NodeGraph />

---
```

#### 2. Adding Event to our Orders Domain

First let's create a new **events** folder within our new **domain** folder. 

Create a new folder called **events** `/domains/Orders/events`.

Next let's add our event `OrderCreated` and an `index.md` for that event.

For example: `/domains/Orders/events/OrderCreated/index.md`

Copy the contents below into your new file.

```mdx title="/domains/Orders/events/OrderCreated/index.md"
---
name: OrderCreated
version: 0.0.1
summary: |
  Tells us when the order has been created
producers:
    - Order Service
---

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id
tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus.
Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget
neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium.
Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.

<NodeGraph />

```

Once done, run the EventCatalog and navigate to your new domain [localhost:3000/domains/Orders](http://localhost:3000/domains/Orders)

You should now see your new domain with the event!

![Orders Example](/img/guides/domains/OrdersExample.png)

**Well done. You created your first domain** 🎉.

### What's Next?

With **domains**, **services** and **events** you can write any Markdown you want and it will render on your  page. 

:::tip
Think about writing a blog. EventCatalog is just markdown. Write and use it how you like, and the website will render your content!
:::

The great thing about EventCatalog is it uses [MDX](https://mdxjs.com/) to enchange your Markdown files, which means you can add [EventCatalog components](/docs/components/overview) to your page. 

To find out more read the [MDX components guide](/docs/components/overview).