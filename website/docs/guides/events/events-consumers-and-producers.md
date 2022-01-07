---
id: consumers-and-producers
title: Consumers and Producers
sidebar_label: Consumers and Producers
slug: /events/consumers-and-producers
---

Within our Event Driven Architectures we can have many consumers and producers of our events.

It's easy for us to lose track of who is producing/consuming what events.

Knowing who produces and consumes which events can be quite valuable and can help you visualise your architecture.

Knowing this relationship of services and events allows us to visually display the relationships of our events inside EventCatalog.

:::tip
Keeping your producer/consumer list up to date can be painful. 

EventCatalog provides a plugin API that allows you to update the consumers/producers without changing your documentation. 

This means you can use third party tools/systems to get the list of producers/consumers and update your documentation without needing to do this yourself!
::: 

Adding producers/consumers in EventCatalog is done through the event frontmatter. We call these `services`.

## Documenting Consumers and Producers

You can add [consumers](/docs/api/event-frontmatter#consumers) or [producers](/docs/api/event-frontmatter#producers) using the [event frontmatter](/docs/api/event-frontmatter).

Let's take a look at an example.

Here is a basic `UserCreated` markdown file (without any producers or consumers).

```mdx title="/events/UserSignedUp/index.md"
---
name: UserSignedUp
version: 0.0.1
summary: |
  Tells us when the user has signed up
---

My Event

...

```

Let's add some consumers and producers to the event.

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

My Event

...

```

As you can see here we added `Email Platform` as a consumer of this event and the `User Service` as the event producer. 

You can add as many consumers/producers to your events as you want.

Adding consumer/producer relationships into your docs allows you to:

- Add documentation for the services
- Visualise relationships
- Visualise your Architecture


## Visualising Producers/Consumers and Events

EventCatalog uses [Mermaid](https://mermaid-js.github.io/mermaid/#/) to render the relationship between your Event and it's consumers and producers.

Once you have added your producers and consumers to your event front-matter you can then add Mermaid diagrams to your event.

You can choose where you want to render it within your markdown file and you just need to include the `<Mermaid />` MDX Component.

### Example of rendering Mermaid

Let's say we have this `UserSignedUp` event.

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

It will render the event page with the mermaid diagram.


![UserSignedUp with Schema Example](/img/guides/events/UserSignedUpExample.png)

:::tip

Services can also be documented! Check out the [services documentation](/docs/services/introduction) to get started.

:::