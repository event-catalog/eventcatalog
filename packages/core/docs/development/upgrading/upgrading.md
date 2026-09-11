---
sidebar_position: 1
keywords:
- Upgrade EventCatalog
sidebar_label: Upgrading EventCatalog
title: Upgrading EventCatalog
description: How to upgrade EventCatalog.
---

## Upgrade to latest version

To upgrade your EventCatalog to the latest version you can run the following command in your catalog directory.

```bash
npm install @eventcatalog/core@latest
```

### Manual upgrade

To upgrade your EventCatalog you can find the packages `@eventcatalog/core` your `package.json` file.

```json
{
  "name": "my-catalog",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    ...
  },
  "dependencies": {
    // Using "latest" will install the latest version of EventCatalog keeping you up to date
    // or you can specify a specific version like "@eventcatalog/core": "2.4.0"
    "@eventcatalog/core": "latest"
  }
}
```

Once you upgrade the version number, run `npm install` to install the latest updates.

:::tip
If you don't see the changes you expect, try removing the `.eventcatalog-core` folder, `node_modules` folder and install fresh again.
:::

### Having problems?

Trying to upgrade and having issues? Try these steps

1. Delete `node_modules` folder
1. Delete `.eventcatalog-core` folder
1. Delete `package-lock.json` (if you have one).
1. Run `npm run i`
1. Verify if issues are fixed

Still having issues?
  1. [Raise an issue on GitHub](https://github.com/event-catalog/eventcatalog) about your problems and how to replicate it.
  1. Or join our [Discord](https://eventcatalog.dev/discord) and add your problem to the [Bugs channel](https://discord.com/channels/918092420338569216/1272467373042958377).

## Upgrading from v1 to v2

If you are upgrading from EventCatalog v1 to v2 you can follow the instructions below.

<details>
  <summary>Upgrading from v1 to v2</summary>
  EventCatalog v2 comes with some small breaking changes to your EventCatalog.

If you are using v1.x.x then this guide can help you.

:::info Still want to use v1?

**Still using v1 of EventCatalog?** V1 documentation can be found at https://v1.eventcatalog.dev/

You can find the code for v1 on the branch https://github.com/event-catalog/eventcatalog/tree/v1

We recommended to upgrade to v2 as support for v1 changes will be reduced.

:::

## Migrating to version 2

EventCatalog v2 has been rewritten from the ground up. The easiest way to migrate to version 2 is following these steps:

1. [Create a new Catalog](/docs/development/getting-started/installation)
1. Delete the `domains`, `services`, `commands` and `events` folder.
1. Copy your `eventcatalog.config.js` and `domains`, `services`, `events` folders into the new catalog.
1. Add `ids` to all your resources ([read more](/docs/starting-a-new-project/getting-started#resources-now-require-ids))
1. If your resource are in a nested structure [you need to flatten these out](/docs/starting-a-new-project/getting-started#resources-require-a-flat-structure).

:::tip Having problems?
If you are still having issues upgrading your catalog, [then please raise an issue on our GitHub repo.](https://github.com/event-catalog/eventcatalog/issues).
:::


## Resources now require ids

**All domains, services and events need an id property in the frontmatter**. EventCatalog uses this `id` as the slug of the page and uses it as internal references.

#### Example
```md
---
# id is now required on all resources (domains, services and messages)
id: order-service
name: Order Service
# rest of frontmatter..
---
<!-- Your markdown content -->
```

## Resources require a flat structure

In EventCatalog v1 you could nest your resources for example have your events or services within your domains folder. (Example /domains/services/MyService/index.mdx)

This feature is not currently supported in version 2.

Version 2 requires your domains, services and messages (commands, and events) to be in the root directory.

## Change to build output

The build output has changed from v1 from being `out` directory to `dist` directory in version 2.

## Customising your Catalog

Customizing your catalog is not currently supported in v2, although this is on our roadmap (July 2024).

## Generator plugins

EventCatalog v1 supports generators (from EventBridge and AsyncAPI).

EventCatalog v2 does not support these yet and are on the roadmap (July 2024).

## Missing components

Components from v1 has not yet been implemented. 

- `<EventExamples/>` - Not currently supported, but you can use [AccordionGroup with code blocks](/docs/development/components/components/accordian-group)
- `<SchemaExample />` - Not currently implemented - [Issue open](https://github.com/event-catalog/eventcatalog/issues/568)

## Any other issues?

If you have any issues or questions please [feel free to reach us on Discord](https://discord.com/invite/3rjaZMmrAm).

</details>

