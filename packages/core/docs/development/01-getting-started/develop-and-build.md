---
sidebar_position: 5
keywords:
- EventCatalog Develop and build
sidebar_label: Develop and build
title: Develop and build
description: Understanding how to develop and build EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Edit your project

To make changes to your project, open your project folder in your code editor. Working in development mode with the dev server running allows you to see updates to your site as you edit the code.

## Starting the development server

EventCatalog comes with a built-in development server that has everything you need for project development. The `eventcatalog dev` CLI command will start the local development server so that you can see your new website in action for the very first time.

Every starter template comes with a pre-configured script that will run `eventcatalog dev` for you. After navigating into your project directory, run this command and start the EventCatalog development server:

```bash
npm run dev
```
If all goes well, EventCatalog will now be serving your project on http://localhost:3000/. Visit that link in your browser and see your new site!

## Build and preview your catalog

To check the version of your site that will be created at build time, quit the dev server (Ctrl + C) and run the appropriate build command in your terminal:

```bash
npm run build
```

EventCatalog will build a deploy-ready version of your site in a separate folder (dist/ by default) and you can watch its progress in the terminal. This will alert you to any build errors in your project before you deploy to production.

When the build is finished, run the appropriate preview command (e.g. npm run preview) in your terminal and you can view the built version of your site locally in the same browser preview window.

Note that this previews your code as it existed when the build command was last run. This is meant to give you a preview of how your site will look when it is deployed to the web. Any later changes you make to your code after building will not be reflected while you preview your site until you run the build command again.

Use (Ctrl + C) to quit the preview and run another terminal command, such as restarting the dev server to go back to working in development mode which does update as you edit to show a live preview of your code changes.


## EventCatalog static vs server output

By default, EventCatalog will build a static website. This means you can [host this website](/docs/development/deployment/hosting-options) anywhere you like.

Some features of EventCatalog (e.g SSO) require a to run EventCatalog as a server.

You can opt into which build mode you want to use by setting the [`output` property in your `eventcatalog.config.js` file](/docs/api/config#output).


<!-- ## Supported plugins

EventCatalog uses [MDX](https://mdxjs.com/) file format for documentation.

If you are using VSCode you can install the [MDX](https://marketplace.visualstudio.com/items?itemName=unifiedjs.vscode-mdx) plugin, for the `.mdx` files.

Recommended Plugins:
    - https://marketplace.visualstudio.com/items?itemName=unifiedjs.vscode-mdx
    - https://marketplace.visualstudio.com/items?itemName=astro-build.astro-vscode -->

## Next Steps

Success! You are now ready to start building with EventCatalog! 🥳

Here are a few things that we recommend exploring next. You can read them in any order. You can even leave our documentation for a bit and go play in your new EventCatalog project codebase, coming back here whenever you run into trouble or have a question.

- [Create your first domain](/docs/development/guides/domains/creating-domains/adding-domains)
- [Create your first service](/docs/development/guides/services/adding-services)
- [Create your first message](/docs/messages)