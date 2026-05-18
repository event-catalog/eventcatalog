---
sidebar_position: 5
sidebar_label: Entity API
title: Entity frontmatter API
description: Understanding the API for entities.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Overview {#overview}

Entities are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of of a basic entity.

```md title="/entities/User/index.mdx (example)"
---
# id of the entity
id: "User"

# Display name of the entity, rendered in EventCatalog
name: "User"

# version for your entity 
version: "1.0.0"

# Short summary of your entity
summary: "Represents a user in the system"

# Whether this entity is an aggregate root
aggregateRoot: true

# The unique identifier for this entity
identifier: "userId"

# Properties of the entity
properties:
  - name: "userId"
    type: "string"
    required: true
    description: "Unique identifier for the user"
  - name: "email"
    type: "string"
    required: true
    description: "User's email address"
  - name: "firstName"
    type: "string"
    required: true
    description: "User's first name"
  - name: "lastName"
    type: "string"
    required: true
    description: "User's last name"
  - name: "dateOfBirth"
    type: "date"
    required: false
    description: "User's date of birth"
  - name: "profileId"
    type: "string"
    required: false
    description: "Reference to user's profile"
    references: "Profile"
    referencesIdentifier: "profileId"
    relationType: "one-to-one"

# Badges to display
badges:
  - content: "Core Entity"
    backgroundColor: "blue"
    textColor: "white"
---

The User entity represents a user in our system and serves as an aggregate root for user-related operations.

This entity contains core user information and is referenced by multiple services across the platform.

<!-- Add any markdown you want, the entity will render in its own page /docs/entities/{Entity}/{version} -->
```

## Required fields {#required-fields}

### `id` {#id}

- Type: `string`

Unique id of the entity. EventCatalog uses this for references and slugs.

```mdx title="Example"
---
  id: User
---
```

### `name` {#name}

- Type: `string`

Name of the entity this is used to display the name on the UI.

```mdx title="Example"
---
  name: User
---
```

### `version` {#version}

- Type: `string`

Version of the entity. 

```mdx title="Example"
---
  version: 1.0.0
---
```

## Optional fields {#optional-fields}

### `summary` {#summary}

Short summary of your entity, shown on entity summary pages.

```mdx title="Example"
---
  summary: |
    Represents a user in the system with personal information and authentication details
---
```

### `aggregateRoot` {#aggregateroot}

- Type: `boolean`

Indicates whether this entity is an aggregate root in Domain-Driven Design terms.

```mdx title="Example"
---
  aggregateRoot: true
---
```

### `identifier` {#identifier}

- Type: `string`

The unique identifier property for this entity.

```mdx title="Example"
---
  identifier: userId
---
```

### `properties` {#properties}

- Type: `Property[]`

List of properties that define the structure of the entity.

```md title="Example"
---
properties:
  - name: "userId"
    type: "string"
    required: true
    description: "Unique identifier for the user"
  - name: "email"
    type: "string"
    required: true
    description: "User's email address"
  - name: "profileId"
    type: "string"
    required: false
    description: "Reference to user's profile"
    references: "Profile"
    referencesIdentifier: "profileId"
    relationType: "one-to-one"
---
```

Each property can have the following fields:
- `name` (required): The name of the property
- `type` (required): The data type of the property
- `required` (optional): Whether the property is required
- `description` (optional): Description of the property
- `references` (optional): References another entity
- `referencesIdentifier` (optional): The identifier used for the reference
- `relationType` (optional): Type of relationship (e.g., "one-to-one", "one-to-many")

### `badges` {#badges}

<AddedIn version="3.39.4" />

An array of badges that get rendered on the page.

```md title="Example"
---
  badges:
    - content: Core Entity
      backgroundColor: green
      textColor: green
      # Optional icon to display (from https://heroicons.com/)
      icon: BoltIcon
---
```

#### Use named colors

Set `backgroundColor` or `textColor` to a named palette token for automatic light/dark mode adaptation.

Supported names: `slate`, `gray`, `zinc`, `neutral`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`.

```md title="Named color example"
---
  badges:
    - content: Critical
      backgroundColor: red
      textColor: red
---
```

#### Use any CSS color

You can also pass any valid CSS color value directly: hex (`#ff0000`), `rgb()`, `hsl()`, `oklch()`, or a CSS variable (`var(--my-color)`).

```md title="CSS color example"
---
  badges:
    - content: Custom
      backgroundColor: "#6366f1"
      textColor: "#ffffff"
---
```


### `editUrl` {#editUrl}

<AddedIn version="2.49.4" />

Override the default edit url for the page. This is used to navigate the user to the edit page for the page (e.g GitHub, GitLab url).

```mdx title="Example"
---
  editUrl: https://github.com/event-catalog/eventcatalog/edit/main/entities/User/index.mdx
---
```

### `detailsPanel` {#detailsPanel}

<AddedIn version="2.53.0" />

Override the default details panel for the page. You can use this show/hide areas of the details panel.

![Details panel](./img/domain-details-panel.png)

```mdx title="Example"
---
  detailsPanel:
    domains:
      visible: false
    services:
      visible: false
    messages:
      visible: false
    versions:
      visible: false
    owners:
      visible: false
---
```

Options:

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `domains` | `object` | No | An object with a `visible` property to show/hide the domains section |  
| `services` | `object` | No | An object with a `visible` property to show/hide the services section |  
| `messages` | `object` | No | An object with a `visible` property to show/hide the messages section |  
| `versions` | `object` | No | An object with a `visible` property to show/hide the versions section |  
| `changelog` | `object` | No | An object with a `visible` property to show/hide the changelog button |  
| `owners` | `object` | No | An object with a `visible` property to show/hide the owners section |  

### `attachments` {#attachments}

<AddedIn version="2.57.2" />

An array of attachments for this resource type.

```mdx title="Example"
---
  attachments:
    - url: https://example.com/adr/001
      title: ADR-001 - Use Kafka for asynchronous messaging
      description: Learn more about why we chose Kafka for asynchronous messaging in this architecture decision record.
      type: 'architecture-decisions'
      icon: FileTextIcon
    - https://example.com/adr/002
---

```

Options:

The attachments can be a url (string) or an object with additional properties.

Object properties:

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `url` | `string` | Yes | The url of the attachment |
| `title` | `string` | optional | The title of the attachment |
| `description` | `string` | optional | The description of the attachment |
| `type` | `string` | optional | The type of the attachment, this will be used to group attachments together in the UI |
| `icon` | `string` | optional | The icon of the attachment, you can pick from the [lucide icons](https://lucide.dev/icons/) library. |