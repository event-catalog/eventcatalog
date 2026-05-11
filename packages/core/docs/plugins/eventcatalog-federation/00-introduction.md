---
sidebar_position: 1
keywords:
- EventCatalog Federation
sidebar_label: Introduction
title: Introduction
description: Merge multiple EventCatalog instances into a single catalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';

<!-- <Beta /> -->
<AddedIn version="2.18.0" />
<PluginLicense url="#commercial-use" />

<iframe width="100%" height="415" src="https://www.youtube.com/embed/KnTQkrt-7cc?si=RjEasqw_KJ6AN4cr" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

**EventCatalog Federation** is a feature that allows you to merge multiple EventCatalog instances into a single catalog. 


This is useful if you:

- Have **multiple teams** that want to own there own EventCatalog / Documentation
- Want to **keep your documentation close to your code**
- Want to **give ownership of documentation to different teams** and still have a single source of truth

![EventCatalog Federation](/img/federation-example.png)

<!-- ![Example](/img/integrations/openapi/openapi.png) -->

## How it works

EventCatalog Federation is powered by the [EventCatalog Federation Generator](https://github.com/event-catalog/generators).

1. Your teams create their own EventCatalog instances
2. Your teams document their services, messages and domains in their own EventCatalog
3. Your teams commit their EventCatalog to a git repository, either in the same repo as your code or in a separate repo
4. You setup a main catalog that will be the source of truth for your documentation
5. You use the federation generator to merge your teams catalogs into the main catalog
6. You setup CI/CD to keep your main catalog up to date with your teams catalogs (or just rebuild every X time)

To use the federation generator you will need a License Key from [EventCatalog Cloud](https://eventcatalog.cloud).
You can get a free 14 day trial license key for the plugin.

You can read more documentation:

- [Configuring your main catalog](/docs/plugins/eventcatalog-federation/configuration)
    - This is the main catalog for your organization. It will pull in and merge documentation from your teams catalogs.
- [Configuring your team catalogs](/docs/plugins/eventcatalog-federation/setup-team-catalog)
    - This is the documentation for how to setup your team catalogs

## Commercial Use

This plugin requires a license key to be used. 

You can get a 14 day trial license key to try the plugin out by going to [EventCatalog Cloud](https://eventcatalog.cloud).

After the trial you can purchase a license to continue using this plugin, we have different plans to suit your organization. 

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._


<a href="https://eventcatalog.cloud" target="_blank" className="bg-purple-500 hover:bg-purple-100 cursor-pointer hover:text-white !hover:underline px-2 py-1 rounded-md text-white ">Login to EventCatalog Dashboard</a>