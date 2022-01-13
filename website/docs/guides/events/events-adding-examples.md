---
id: adding-examples
title: Code Examples
sidebar_label: Code Examples
slug: /events/adding-examples
---

EventCatalog allows you to add code examples into your Event documentation page.

Here are some reasons why you might want to add code examples:

- Give developers examples of events
- Give developers examples of how to trigger the event
- Give developers the ability to quickly copy and paste commands

EventCatalog is all about event discovery and documentation for your team. 

Giving them code examples might help them get up and running with your architecture easier.

**EventCatalog supports any programming language for your code examples.**

## Adding Code Examples

To add code examples to your event you will need to create a new folder called `examples` inside your `event` folder.

You will need to add the files inside the examples directory

- `/events/{Event Name}/examples/{any-file}` 
  - (example `/events/UserSignedUp/examples/FiringEventExample.js`) 

:::tip
Within the `examples` folder you can add any file and any programming language you want. EventCatalog will read the directory and render the example code into the UI.
:::

Once you create your examples you will need to render them within your Event documentation.

You can choose where you want to render it within your markdown file and you just need to include the `<Examples />` MDX Component.

### Example of Adding Code to your Events

Let's say we have a `UserCreated` event in `/events/UserCreated/index.md`.

```mdx title="/events/UserCreated/index.md"
---
name: UserCreated
version: 0.0.1
summary: |
  Tells us when the user has been created
consumers:
    - Email Platform
producers:
    - User Service
---

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id
tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus.
Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget
neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium.
Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.

<EventExamples title="How to trigger event" />

```

Let's add the Example for this Event in `/events/UserCreated/examples/Example.js`

```js
var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://test.mosquitto.org')

client.on('connect', function () {
  client.subscribe('presence', function (err) {
    if (!err) {
      client.publish('presence', 'Hello mqtt')
    }
  })
})

client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString())
  client.end()
})
```

_This is just an example of a JavaScript file connecting to MQTT broker, this is just dummy code_

:::tip
Remember the name of the file and extension of the example does not matter, you can have any file you like. EventCatalog will read the examples directory and render anything inside it
:::

Let's see how the code example will render in the document.



![UserSignedUp with Code Example](/img/guides/events/UserSignedUpExampleWithExamples.png)



