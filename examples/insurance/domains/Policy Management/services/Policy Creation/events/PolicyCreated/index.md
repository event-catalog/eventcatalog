---
id: policy-created-event
name: PolicyCreatedEvent
version: 0.0.1
badges:
  - content: Core Event
    backgroundColor: green
    textColor: white
schemaPath: schema.json
---

## Overview

The **PolicyCreatedEvent** is as critical event in the SunnyDay Insurance ecosystem, emitted by the Policy Creation Service when a new insurance policy is successfully created. This event carries essential information about the newly issued policy, which is used by other services to initiate related processes like billing, customer notifications, and more.

<NodeGraph />

## Event Schema
<SchemaViewer file="schema.json"/>

## Event Flow

1. **Trigger:** The event is triggered when a policy is created by the Policy Creation Service.
2. **Payload Propagation:** The event payload is consumed by various services for further processing.
3. **Follow-Up Actions:** Subsequent actions, such as billing initiation and customer notifications, are carried out by consuming services.

---

The **PolicyCreatedEvent** ensures that all necessary processes are initiated immediately after a policy is created, enabling a seamless flow of operations across SunnyDay Insurance.
