---
sidebar_position: 3
keywords:
- EventCatalog Studio
- storage
- sqlite
sidebar_label: Set up persistent storage
title: Set up persistent storage
description: Save canvases to a SQLite database so they survive restarts and redeploys.
---

By default, canvases are kept in memory and are lost when the server restarts. To keep them, save them to a SQLite database file.

You need **Node.js 22.13 or later**.

## Save canvases to SQLite

1. In `eventcatalog.config.js`, set `storage`:

   ```js title="eventcatalog.config.js"
   export default {
     storage: {
       type: 'sqlite',
       path: '.eventcatalog/eventcatalog.db',
     },
   };
   ```

   The path is relative to your catalog. If you leave it out, it defaults to `.eventcatalog/eventcatalog.db`.

2. Restart `eventcatalog dev` or `eventcatalog start`. EventCatalog creates the database, and keeps it up to date each time it starts.

3. Open **Studio**. The bottom of the list shows where canvases are saved, for example **Saved in .eventcatalog/eventcatalog.db**.

## In a container

Put the database on a volume, so it survives redeploys:

```js title="eventcatalog.config.js"
export default {
  storage: {
    type: 'sqlite',
    path: '/data/eventcatalog.db',
  },
};
```

Mount a volume at `/data` when you run the container.

## How canvases are saved

Canvases save automatically as people work. The server keeps a working copy of each canvas in memory, and writes it to the database a moment after each change and when the server stops, so storage never slows the canvas down.

Canvases stay in your infrastructure. Nothing is sent to a third party.

| Option | Type | Default | Description |
|---|---|---|---|
| `storage.type` | `'memory'` \| `'sqlite'` | `'memory'` | `'memory'` keeps canvases while the server runs. `'sqlite'` keeps them in a database file. |
| `storage.path` | `string` | `'.eventcatalog/eventcatalog.db'` | The database file, relative to your catalog. |
