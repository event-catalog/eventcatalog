---
sidebar_position: 4
id: upgrading
title: Upgrade Catalog
---  

To upgrade your EventCatalog you can find the package `"@eventcatalog/core"` to upgrade in your `package.json` file.

```json
{
  "name": "my-catalog",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    ...
  },
  "devDependencies": {
   ...
  },
  "dependencies": {
    "@eventcatalog/core": "0.0.5"
  }
}
```

Once you upgrade the version number, run `npm install` or `yarn` to install the latest updates.

:::tip
If you don't see the changes you expect, try removing the `.eventcatalog-core` folder, `node_modules` folder and install fresh again.
:::