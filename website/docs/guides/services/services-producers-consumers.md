---
id: producers-consumers
title: Producers and Consumers
sidebar_label: Producers and Consumers
slug: /services/producers-consumers
---

In your service markdown files you can use the `<Mermaid />` MDX component to show the service relationship between your service and events it consumes/publishes.

The relationship of the events are stored within the Event itself and not the service.

**If you want to add consumers/producers you must do this in the Event markdown files**

_This allows us to keep one source of truth about the flow of data, if the relationships were in both services and events EventCatalog would not know where to get the information from_.

### Showing the Producers and Consumers

Let's take a look at an example.

![Service Example](/img/guides/services/ServiceEmailPlatformExample.png)

As you can see above, this service `Email Platform` publishes 1 event (EmailSent) and subscribes to two events (UserCreated and UserSignedUp).

:::info
In this example the EmailSent, UserCreated and UserSignedUp events hold the relationship information between the events and this service.
:::

Using the `<Mermaid />` MDX component we can render the diagram to show the service and the events coming in and out of it.