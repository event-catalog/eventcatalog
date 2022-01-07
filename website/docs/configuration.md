---
id: configuration
title: Configuration
---

The `eventcatalog.config.js` file is the heart of your application. It allows you to define overrides for EventCatalog.

Using the configuration you will be able to setup user pages, custom themes, plugins and much more.


## What goes into a `eventcatalog.config.js`? {#what-goes-into-a-eventcatalogconfigjs}

Using the CLI tool when creating your EventCatalog you will get a default `eventcatalog.config.js` out the box.

However, it can be helpful if you have a high-level understanding of how the configuration file works.

The high-level overview of EventCatalog configuration can be categorized into:

- [Site metadata](configuration#site-metadata)
- [Generators](configuration#generators)
- [Users](configuration#users)

For exact reference to each of the configurable fields, you may refer to [**`eventcatalog.config.js` API reference**](api/eventcatalog.config.js.md).

### Site metadata {#site-metadata}

Site metadata contains the essential global metadata such as `title`, `url`, `tagling` and `organizationName`.

They are used in a number of places such as your site's title and headings, browser tab icon, and landing page.

### Generators {#generators}

EventCatalog allows you to generate your Event documentation from third party systems. Plugins can help you keep your documentation up to date with real world topics/events in the wild. 

It is recommended to check the [plugin docs](/docs/api/plugins) for more information.

### Users {#users}

You can store user information inside your `eventcatalog.config.js` file.

This is a perfect way to help teams identify who owns which service and event.

You can setup your users and reference them inside your event or service markdown files.

```js title="eventcatalog.config.js (adding users)"
module.exports = {
  // ...
  users: [
    {
      id: 'dboyne',
      name: 'David Boyne',
      avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      role: 'Developer',
      summary: 'Currently building tools for Event Architectures.'
    },
  ],
};
```

:::tip Referencing Users inside your Event/Service markdown file

To add an owner to your event or service you can just reference the `id` of the user.

```js title="{EventName}/index.md (Adding 2 owners to event)"
---
name: EmailSent
version: 0.6.1
summary: |
  Tells us when an email has been sent
producers:
    - Email Platform
owners:
    - dboyne
    - mSmith
---
```

In this example you will see dboyne and mSmith as the owners of the event `EmailSent`.

:::
