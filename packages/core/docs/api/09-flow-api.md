---
sidebar_position: 5
sidebar_label: Flow API
title: Flow frontmatter API
description: Understanding the API for flows.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Overview {#overview}

Flows are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of of a basic flow.

```md title="/events/InventoryOutOfStock/index.mdx (example)"
---
# id of the flow
id: "CancelSubscriptionFlow"

# Display name of the flow, rendered in EventCatalog
name: "User Cancels Subscription"

# version for your flow 
version: "0.0.1"

# Short summary of your event
summary: "Flow for when a user has cancelled a subscription"

# A list of steps for your flow
steps:
  
  # id of your step, required for linking between stages in your flow
  - id: "cancel_subscription_initiated"
    # rendered title of your step
    title: "Cancels Subscription"
    # Short summary of a step
    summary: "User cancels their subscription"
    # Defining an actor will render an actor node in the graph.
    actor:
      name: "User"
    # What happens next? Define the next step  
    next_step: 
      id: "cancel_subscription_request"
      label: "Initiate subscription cancellation"

  - id: "cancel_subscription_request"
    title: "Cancel Subscription"
    # This step is a message, include the message and version
    message:
      id: "CancelSubscription"
      version: "0.0.1"
    next_step: 
      id: "subscription_service"
      label: "Proceed to subscription service"

  - id: "stripe_integration"
    title: "Stripe"
    # This is an external system (e.g Stripe)
    externalSystem:
      name: "Stripe"
      summary: "3rd party payment system"
      url: "https://stripe.com/"
    next_step: 
      id: "subscription_service"
      label: "Return to subscription service"

  - id: "subscription_service"
    title: "Subscription Service"
    # This node is a service, include that.
    service:
      id: "SubscriptionService"
      version: "0.0.1"
    # Define multiple steps
    next_steps:
      - id: "stripe_integration"
        label: "Cancel subscription via Stripe"
      - id: "subscription_cancelled"
        label: "Successful cancellation"
      - id: "subscription_rejected"
        label: "Failed cancellation"

  - id: "subscription_cancelled"
    title: "Subscription has been Cancelled"
    message:
      id: "UserSubscriptionCancelled"
      version: "0.0.1"
    next_step:
      id: "notification_service"
      label: "Email customer"

  - id: "subscription_rejected"
    title: "Subscription cancellation has been rejected"

  - id: "notification_service"
    title: "Notifications Service"
    service:
      id: "NotificationService"
      version: "0.0.2"

---

This flow documents what happens when a User Cancels Subscription in our system. 

<NodeGraph />

<!-- Add any markdown you want, the workflow will also render in its own page /docs/flows/{Flow}/{version} -->


```

## Required fields {#required-fields}

### `id` {#id}

- Type: `CancelSubscriptionFlow`

Unqiue id of the flow. EventCatalog uses this for references and slugs.

```mdx title="Example"
---
  id: InventoryOutOfStock
---
```

### `name` {#name}

- Type: `string`

Name of the flow this is used to display the name on the UI.

```mdx title="Example"
---
  name: User Cancels Subscription
---
```

### `version` {#version}

- Type: `string`

Version of the flow. 

```mdx title="Example"
---
  version: 0.0.1
---
```

### `steps` {#steps}

- Type: `Step[]`

List of steps for your flow. 

```md title="Example"
---
steps:
  - id: "cancel_subscription_initiated"
    title: "Cancels Subscription"
    summary: "User cancels their subscription"
    # Define a single step that happens next
    next_step: 
      id: "cancel_subscription_request"
      label: "Initiate subscription cancellation"
    # OR define a multiple next steps
    next_steps:
        - id: "stripe_integration"
          label: "Cancel subscription via Stripe"
        - id: "subscription_cancelled"
          label: "Successful cancellation"
        - id: "subscription_rejected"
          label: "Failed cancellation"
---
```

#### Actor Nodes

Flows allow you to create [Actor nodes](https://en.wikipedia.org/wiki/Event_storming). Actors represent A person who executes a command or flow.

```md title="Example"
---
  steps:
    - id: "cancel_subscription_initiated"
      title: "Cancels Subscription"
      summary: "User cancels their subscription"
      # Defining an actor will render an actor node in the graph.
      actor:
        name: "User"
      next_step: 
        id: "cancel_subscription_request"
        label: "Initiate subscription cancellation"
---
```

#### External Services Nodes

Flows allow you to create External Service. These services tend to be other external services you may interact with that are not part of your business domain. (e.g Stripe API)

```md title="Example"
---
  steps:
    - id: "stripe_integration"
      title: "Stripe"
      # This is an external system (e.g Stripe)
      externalSystem:
        name: "Stripe"
        summary: "3rd party payment system"
        url: "https://stripe.com/"
      next_step: 
        id: "subscription_service"
        label: "Return to subscription service"
---
```

_[See example of Actor node in a workflow](https://demo.eventcatalog.dev/visualiser/flows/CancelSubscription/0.0.1)._

#### Message Nodes

Flows allow you to create [message nodes](/docs/messages). Messages link to your commands or events.

```md title="Example"
---
  steps:
    - id: "cancel_subscription_request"
      title: "Cancel Subscription"
      # This step is a message, include the message and version
      message:
        id: "CancelSubscription"
        version: "0.0.1"
      next_step: 
        id: "subscription_service"
        label: "Proceed to subscription service"
---
```

_[See example of Message node in a workflow](https://demo.eventcatalog.dev/visualiser/flows/CancelSubscription/0.0.1)._

#### Service Nodes

Flows allow you to create [service nodes](/docs/services). Services link to your defined services in EventCatalog.

```md title="Example"
---
  - id: "subscription_service"
      title: "Subscription Service"
      # This node is a service, include that.
      service:
        id: "SubscriptionService"
        version: "0.0.1"
      # Define multiple steps
      next_steps:
        - id: "stripe_integration"
          label: "Cancel subscription via Stripe"
        - id: "subscription_cancelled"
          label: "Successful cancellation"
        - id: "subscription_rejected"
          label: "Failed cancellation"
---
```

_[See example of Message node in a workflow](https://demo.eventcatalog.dev/visualiser/flows/CancelSubscription/0.0.1)._



## Optional fields {#optional-fields}

### `summary` {#summary}

Short summary of your flow, shown on flow summary pages.

```mdx title="Example"
---
  summary: |
    Flow that explains how a user unsubscribes to our system
---
```

### `badges` {#badges}

An array of badges that get rendered on the page.

```md title="Example"
---
  badges:
    - content: My badge
      backgroundColor: blue
      textColor: blue
      # Optional icon to display (from https://heroicons.com/)
      # Or the name of the broker (e.g Kafka, EventBridge, etc)
      icon: BoltIcon
---
```

### `editUrl` {#editUrl}

<AddedIn version="2.49.4" />

Override the default edit url for the page. This is used to navigate the user to the edit page for the page (e.g GitHub, GitLab url).

```mdx title="Example"
---
  editUrl: https://github.com/event-catalog/eventcatalog/edit/main/flows/CancelSubscription/index.mdx
---
```

### `detailsPanel` {#detailsPanel}

<AddedIn version="2.53.0" />

Override the default details panel for the page. You can use this show/hide areas of the details panel.

![Details panel](./img/domain-details-panel.png)

```mdx title="Example"
---
  detailsPanel:
    owners:
      visible: false
---
```

Options:

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `owners` | `object` | No | An object with a `visible` property to show/hide the owners section |  
| `versions` | `object` | No | An object with a `visible` property to show/hide the versions section |  
| `changelog` | `object` | No | An object with a `visible` property to show/hide the changelog button |  

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