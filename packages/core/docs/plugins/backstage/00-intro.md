---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Getting started
description: Getting started with Backstage plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';

<PluginLicense url="#commercial-use" />

<iframe width="100%" height="415" src="https://www.youtube.com/embed/mjf7qwoSAC4?si=eBZfgjMOQrD75teb" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

Many folks are using [Backstage](https://backstage.spotify.com/) for their internal developer portals. Backstage is a highly configurable platform that allows you to document your architecture in components, apis, services, domains and much more.

Backstage supports plugins, that have a frontend and backend support.

Using the EventCatalog Backstage plugin you can embed your EventCatalog information into backstage.

### Core Features

The EventCatalog Backstage plugin can provide you with many features:

- 📃 Bring [EventCatalog documentation](https://demo.eventcatalog.dev/docs/domains/Orders/0.0.3) into Backstage
- 📃 Custom tabs for your APIs and Services. Embed documentation, visualizations and searchable tables.
- 📊 Embed [EventCatalog visualizer](https://demo.eventcatalog.dev/visualiser/domains/Orders/0.0.3) into your Backstage pages
- 🔎 Embed the [EventCatalog discovery table](https://demo.eventcatalog.dev/discover/events) to quickly find messages for your services
- ⭐ And much more...

### How it works

![Example](/img/integrations/backstage/backstage-eventcatalog.png)

This plugin exposes React components that you can embed on your pages to display information from EventCatalog.

_Your EventCatalog has be hosted and the URL given to the app.config.yml file._

- `<EventCatalogDocumentationEntityPage page="docs/page/visualiser"  />`
  - Used to embed whole pages of EventCatalog into your Backstage instance. You can add these as tabs to your pages, clicking on the tab will show the desired feature.
- `<EventCatalogEntityVisualiserCard />`
  - Used to embed a widget (Card) on your existing pages. This component will display the visualiser on your page.
- `<EventCatalogEntityMessageCard />`
  - Used to embed a widget (Card) on your existing pages. This component will display the explore (table) on your page. Great for displaying a list of messages your service produces/consumes.

_Note: If you want to embed private EventCatalog instances, raise an issue on GitHub and we can explore this_.

---

## Commercial Use

This plugin requires an EventCatalog Scale license key to be used.

You can get a 30-day trial Scale license key by going to [EventCatalog Cloud](https://eventcatalog.cloud).

You can try the Backstage plugin, or use EventCatalog Scale (as it's already included).

After the trial, you can continue using this plugin with EventCatalog Scale. 

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._

