---
sidebar_position: 4
keywords:
- components
sidebar_label: Using reference objects
title: Using reference objects
description: Understanding reference objects with AsyncAPI
---

AsyncAPI supports reusable parts in your AsyncAPI files using [References Objects](https://www.asyncapi.com/docs/concepts/asyncapi-document/reusable-parts).

EventCatalog also supports reference with EventCatalog. For example you can keep your message schemas outside of your AsyncAPI file, as seen in this example.

```yaml title="/asyncapi.yml"
channels:
  signUp:
    address: user/signedup
    messages:
      UserSignup:
        $ref: './message-schema.yaml#/UserSignup'
operations:
  user/signedup.publish:
    action: receive
    channel:
      $ref: '#/channels/signUp'
    messages:
      - $ref: '#/channels/signUp/messages/UserSignup'
```

```yaml title="/message-schema.yaml"
UserSignup:
  name: UserSignup
  title: User signup
  summary: Action to sign a user up.
  description: A longer description
  contentType: application/json
  payload: null
```

You can see the example [EventCatalog AsyncAPI GitHub project for a demo](https://github.com/event-catalog/generators/tree/main/examples/generator-asyncapi).

---

Note: When the AsyncAPI file is written against your EventCatalog service, all refs are removed. This allows EventCatalog to render the AsyncAPI UI without the need to store and track references. 

