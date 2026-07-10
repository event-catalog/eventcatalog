---
sidebar_position: 1
keywords:
- EventCatalog custom documentation
sidebar_label: Introduction
title: Introduction
description: Customize documentation in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<AddedIn version="2.33.0" />
<PlanBanner plan="Scale" />

<iframe width="100%" height="415" src="https://www.youtube.com/embed/auzmEf0AdJg?si=wHe-3X6b6uLN39sB" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

---

High level documentation is a way to add catalog-wide custom documentation pages to your catalog.

This can be a great way to extend your catalog beyond what is provided, and bring your own documentation to EventCatalog, rather than having documentation spread across multiple tools.


![Example](./img/custom-docs.png)
<a class="block" href="https://demo.eventcatalog.dev/docs/custom/technical-architecture-design/architecture-decision-records/published/01-api-gateway-pattern">View demo</a>

High level documentation is not limited, here are some examples of what you can do:

- Document infrastructure & operations
- Document CI/CD pipelines
- Document user journeys
- Document API documentation
- Document technical debt
- Document team processes
- Document onboarding information
- Document best practices
- Document standards

It's really up to you what you add here.

### How high level documentation can help

EventCatalog provides the ability to document your architecture with domains, services and messages. 

Users still have third party tools to document other parts of their architecture (e.g confluence, Google docs, etc), so this is an option to help you keep all your documentation in one place.

### What can I do with high level documentation in EventCatalog?

You can add any custom documentation to your catalog, this also gives you access to the [EventCatalog components](/docs/components).
Your custom documentation is powered by markdown, meaning you can use EventCatalog components within your documentation.

### Roadmap for high level documentation

This is the initial version of high level documentation in EventCatalog.

We plan to add the following features:

- Add support to embed EventCatalog visualizations into your documentation pages
- Embed EventCatalog resources into your custom documentation pages
- Add ability to add runtime blocks into your pages (e.g making requests to get third party data to display)
