---
id: versioning
title: Versioning Events
sidebar_label: Versioning Events
slug: /events/versioning
---

Things change over time, and events are no different. Our schemas can evolve and so can the context within the event itself.

Eventcatalog allows you to version your events, the schemas, code examples and much more.

Keeping documentation of previous events and their schemas can be beneficial for developers.

You can get the benefits of versioning with a few steps.

### Versioning your Event

To version events you need two things

- The `versioned` folder
- The `version` of the event

To version your events you will need to create a new folder within your `event` folder called `versioned`

Let's look at the directory structure of what a versioned event looks like

```sh
my-catalog
├── events
│   ├── UserCreated
│   │     └──index.md
│   │     └──schema.json
│   │     └──versioned
│   │         └──1.0.0
│   │         │   └──index.md
│   │         │   └──schema.json
│   │         └──1.1.0
│   │            └──index.md
│   │            └──schema.json
│   ├── EmailCreated
│   │     └──index.md
├── static
│   └── img
├── eventcatalog.config.js
├── package.json
├── README.md
└── yarn.lock
```

As you can see in the example we have versioned our `UserCreated` event with `1.0.0` and `1.1.0` versions.

Following this folder convension EventCatalog will know you have versioned your events and will version them and render them into a new url path `/event/{eventName}/v/{version}` for example.

When you view an event with versions you will see the versions in the side navigation pane.

![UserSignedUp with Schema Example](/img/guides/events/UserSignedUpExampleVersions.png)

### Adding Changelogs to your Versions

EventCatalog also allows you to view change logs for your events.

These are great ways to help developers understand what changes have happened between event versions.

To add a changlog to your events you need to add a changelog.md file into your versioned event folder.

- `/events/{Event Name}/versioned/{version}/changelog.md` 
  - (example `/events/EmailSent/versioned/1.0.0/changelog.md`) 

Add any markdown you want in the `changelog.md` file, and it will be rendered in the Events log.

### Example of Event Changlog

Here is an example of a couple of changelogs to a versioned event.

```mdx title="/events/EmailSent/versioned/1.0.0/changelog.md"
### Removals

We removed the `age` field from the schema as it is no longer needed.
```

```mdx title="/events/EmailSent/versioned/1.0.1/changelog.md"
### Changes

We added the `userId` into the schema.
```

:::tip
The changelog.md is just markdown. Add anything you wish!
:::

When we added the `changelog.md` files to our events we will be able to access the `Event Changelog` page.

**Example of Event Changelog page**

![EmailSent change log](/img/guides/events/EmailSentChangelog.png)
