---
sidebar_position: 1
keywords:
- EventCatalog components
sidebar_label: What is MDX?
title: What is MDX?
description: What is MDX?
---

EventCatalog uses [MDX](https://mdxjs.com/) file format for documentation.

Markdown is what powers EventCatalog, we encourage and follow a [docs-as-code approach](https://www.writethedocs.org/guide/docs-as-code/). This lets you write documentation in your favorite IDE and version control system, review changes, merge and deploy them.

Using MDX gives you powerful features like:

- [Writing and adding custom components to your documentation](/docs/development/customization/custom-components/introduction)
- [Referring your frontmatter (title, description, image, etc) in your documentation](#how-to-refer-to-frontmatter-in-your-documentation)
- [Using variables in your documentation](#how-to-use-variables-in-your-documentation)
- And much more.

## How to refer to frontmatter in your documentation

You can refer to your frontmatter in your documentation using the `frontmatter` variable.

```md title="events/MyEvent/index.mdx"
---
id: MyEvent
name: My Event
version: 1.0.0
summary: My Event Summary
---

<!-- This will render My Event -->
# {frontmatter.name}

<!-- This will render My Event Summary -->
{frontmatter.summary}
```

## How to use variables in your documentation

MDX supports using the `export` statements to add variables to your documentation.

For example you can export a `title` field from an MDX page or component and use it as a heading.

```md title="events/MyEvent/index.mdx"
---
id: MyEvent
name: My Event
version: 1.0.0
summary: My Event Summary
---

<!-- This will export the variable title -->
export const title = "My Event"

<!-- This will render the title -->
# {title}

```













