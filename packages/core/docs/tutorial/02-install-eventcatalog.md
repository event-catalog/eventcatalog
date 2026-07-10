---
sidebar_position: 2
sidebar_label: Install EventCatalog
title: Install EventCatalog
description: Create a new EventCatalog project from the command line.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';
import ChapterOverview from '@site/src/components/MDX/ChapterOverview';

In this step, you will create an empty EventCatalog project and run it locally.

<ChapterOverview
  items={[
    {
      icon: 'terminal',
      text: 'Create an empty EventCatalog project from the command line.',
    },
    {
      icon: 'folder',
      text: 'Review the files and folders created for a blank catalog.',
    },
    {
      icon: 'eye',
      text: 'Start EventCatalog and open the empty catalog in your browser.',
    },
  ]}
/>

### Create an empty catalog

Run:

```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --empty
```

The `--empty` flag creates a clean catalog without sample domains, services, or messages. This gives us a blank project to build on during the tutorial.

### Project structure

After the install finishes, your empty catalog should look similar to this:

<ProjectTree
  items={[
    {
      name: 'public',
      type: 'folder',
      defaultOpen: true,
      children: [{ name: 'logo.png' }],
    },
    { name: '.env' },
    { name: 'AGENTS.md' },
    { name: 'CLAUDE.md' },
    { name: 'eventcatalog.auth.js' },
    { name: 'eventcatalog.config.js', highlight: true },
    { name: 'eventcatalog.styles.css' },
    { name: 'package.json', highlight: true },
  ]}
/>

For this tutorial, most of your work will happen in new folders that you create later. You will also come back to `eventcatalog.config.js` when you need to change catalog configuration.

### Start EventCatalog

Run commands in your new catalog directory

```bash
cd my-catalog
```

Run:

```bash
npm run dev
```

Open the local URL shown in your terminal. It is usually:

```txt
http://localhost:3000
```

### Expected result

You should see a working EventCatalog site in your browser.

The catalog will be mostly empty. That is expected. In the next steps, you will add the architecture yourself.

<figure style={{ textAlign: "center" }}>
  <img src="/img/tutorial/empty-catalog-home.png" alt="An empty EventCatalog running locally in the browser" style={{ display: "block", margin: "0 auto" }} />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>An empty EventCatalog running locally. Your catalog will start with very little content.</figcaption>
</figure>


### Next

Continue to [Create a service](/docs/tutorial/create-a-service).
