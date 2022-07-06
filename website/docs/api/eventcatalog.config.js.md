---
sidebar_position: 0
id: eventcatalog.config.js
description: API reference for EventCatalog configuration file.
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

## Optional fields {#optional-fields}

### `editUrl` {#editUrl}

- Type: `string`

URL used when people want to edit the documentation. For example your GitHub repo and branch.

```js title="eventcatalog.config.js"
module.exports = {
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
};
```

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

### `homepageLink` {#homepageLink}

- Type: `string`

URL used when people want to link the logo & title in the top navigation to the homepage of a website.

```js title="eventcatalog.config.js"
module.exports = {
  homepageLink: 'https://eventcatalog.dev',
};
```

### `primaryCTA` {#primaryCTA}

- Type: `Link`

The primary call to action seen on the homescreen of EventCatalog. You can override the default by passing in the `primaryCTA` into your config file. 

It will always default to `Explore Events` if you do not specify the primaryCTA.

```js title="eventcatalog.config.js"
module.exports = {
  primaryCTA: {
    'href': "/events",
    'label': "Explore Events"
  }
};
```

### `secondaryCTA` {#secondaryCTA}

- Type: `Link`

The secondary call to action seen on the homescreen of EventCatalog. You can set this to any internal EventCatalog page or external URL you want.

If you do not pass in the `secondaryCTA` value, then no button will be shown.

```js title="eventcatalog.config.js"
module.exports = {
  secondaryCTA: {
    'href': "/services",
    'label': "Explore Services"
  }
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

### `headerLinks` {#header-links}

- Type: `Link[]`

- Type: `Link`
  - `label`: value that gets rendered on the UI
  - `href`: URL for link

```js title="eventcatalog.config.js"
module.exports = {
  headerLinks: [
    { label: 'Events', href: '/events' },
    { label: 'Services', href: '/services' },
    { label: 'Domains', href: '/domains' },
    { label: 'Visualiser', href: '/visualiser' },
    { label: '3D Node Graph', href: '/overview' },
  ],
};
```

:::tip Adding or Removing Pages from the Navigation Bar
Using the `headerLinks` configuration you can add or remove any links you like in your header bar. If you want to remove a link to the page simplify just remove that item from the array.
:::

### `footerLinks` {#footer-links}

- Type: `FooterLink[]`

- Type: `FooterLink`
  - `label`: value that gets rendered on the UI
  - `href`: URL for link

```js title="eventcatalog.config.js"
module.exports = {
  footerLinks: [
    { label: 'Events', href: '/events' },
    { label: 'Services', href: '/services' },
    { label: '3D Node Graph', href: '/overview' },
    { label: 'GitHub', href: 'https://github.com/boyney123/eventcatalog-demo/edit/master' },
  ],
};
```

### `analytics` {#analytics}

- Type: `googleAnalyticsTrackingId`: value for the Google Analytics tracking ID

```js title="eventcatalog.config.js"
module.exports = {
  analytics: { googleAnalyticsTrackingId: 'GA-XXXXX-X' },
};
```

### `basePath` {#basepath}

Set the `basePath` in order to be able to deploy the eventcatalog under a sub-path of the domain.

```js title="eventcatalog.config.js"
module.exports = {
  basePath: '/my-catalog',
};
```

### `trailingSlash` {#trailingslash}

Changes the [trailing slash](https://nextjs.org/docs/api-reference/next.config.js/trailing-slash) behaviour of next.js.

```js title="eventcatalog.config.js"
module.exports = {
  trailingSlash: true,
};
```

### `openGraph` {#opengraph}

Manage the Open Graph tags that are used for social media sharing.

- Type: `openGraphConfig`
  - `ogTitle`: Open Graph title, this is the title that is shown in previews on Facebook & Slack. Defaults to `title` as set in the config.
  - `ogDescription`: Open Graph description, this is used for the description meta tag. Defaults to `tagline` as set in the config.
  - `ogUrl`: Open Graph URL, the homepage of your website. Defaults to `homepageLink` as set in the config.
  - `ogImage`: Open Graph image location (can be relative or absolute)

```js title="eventcatalog.config.js"
module.exports = {
  openGraph: {
    ogTitle: 'EventCatalog | Discover, Explore and Document your Event Driven Architectures.',
    ogDescription: 'An open source tool powered by markdown to document your Event Driven Architecture.',
    ogUrl: 'https://eventcatalog.dev/',
    ogImage: 'https://eventcatalog.dev/img/opengraph.png',
  },
};
```
