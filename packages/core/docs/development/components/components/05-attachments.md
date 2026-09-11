---
sidebar_position: 5
keywords:
- attachments
- documentation
- ADR
- diagrams
sidebar_label: Attachments
title: Attachments
description: Learn how to add attachments to your EventCatalog resources
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.57.2" />

The Attachments component allows you to link related documents, diagrams, and resources to any EventCatalog resource. This is perfect for connecting Architecture Decision Records (ADRs), design documents, external diagrams, or any other relevant documentation.

Attachments can be a url (string) or an object with additional properties.

Here we have a domain with two attachments, one is a simple url and the other is an object with additional properties.

```md title="domains/E-Commerce/index.mdx"
---
id: E-Commerce
name: E-Commerce Domain
attachments:
  - https://example.com/adr/001-microservices-architecture
  - url: https://example.com/adr/001
    title: ADR-001 - Use Kafka for asynchronous messaging
    description: Learn more about why we chose Kafka for asynchronous messaging in this architecture decision record.
    type: 'architecture-decisions'
    icon: FileTextIcon
---

## Domain Overview

This domain handles all e-commerce operations.

<Attachments />

```

### Output

![Example output](./img/attachments.png)

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `title` (optional)                 | `string`  | (empty)           | Title to render in your attachments block                             |
| `description` (optional)             | `string`  | (empty)           | Any additional description to render in your attachments block|

## Support

The `<Attachments />` component is supported in all EventCatalog resources, and custom documentation pages.
