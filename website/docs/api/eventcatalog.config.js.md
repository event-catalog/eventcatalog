---
sidebar_position: 0
id: eventcatalog.config.js
description: API reference for Docusaurus configuration file.
slug: /api/eventcatalog-config
---

# `eventcatalog.config.js`

## Overview {#overview}

`eventcatalog.config.js` contains configurations for your site and is placed in the root directory of your site.

## Required fields {#required-fields}

### `title` {#title}

- Type: `string`

Title for your website.

```js title="eventcatalog.config.js"
module.exports = {
  title: 'EventCatalog',
};
```

### `organizationName` {#organizationName}

- Type: `string`

Your organization name.

```js title="eventcatalog.config.js"
module.exports = {
  organizationName: 'Your Company',
};
```

### `editUrl` {#editUrl}

- Type: `string`

URL used when people want to edit the documentation. For example your GitHub repo and branch.

```js title="eventcatalog.config.js"
module.exports = {
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
};
```

## Optional fields {#optional-fields}

### `tagline` {#tagline}

Tagline that is shown on your homepage.

```js title="eventcatalog.config.js"
module.exports = {
  tagline: 'Discover, Explore and Document your Event Driven Architectures',
};
```

### `logo` {#logo}

Alt and path to your company logo.

Example, if your logo is in `public/logo.png`:

_EventCatalog will look inside the public directory, no need to put this into your string value_

```js title="eventcatalog.config.js"
module.exports = {
  logo: {
    src: '/logo.png',
    alt: 'My Company Logo',
  },
};
```

### `users` {#users}

Add user information here. You can reference these inside your Event and Service markdown files. 

```js title="eventcatalog.config.js"
module.exports = {
  users: [
    {
      id: 'dboyne',
      name: 'David Boyne',
      avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      role: 'Developer',
      summary: 'Currently building tools for Event Architectures.',
    },
  ],
};
```

### `generators` {#generators}

- Type: `any[]`

```js title="eventcatalog.config.js"
module.exports = {
  generators: [],
};
```
