---
id: policy-creation-failed-event
name: PolicyCreationFailedEvent
version: 0.0.1
badges:
  - content: Error Event
    backgroundColor: red
    textColor: white
schemaPath: schema.json
---

## Overview

The **PolicyCreationFailedEvent** is emitted by the Policy Creation Service when an attempt to create a new insurance policy fails. This event is crucial for triggering compensating actions and ensuring that the failure is handled gracefully, either by retrying the process or notifying the relevant parties.

<SchemaViewer file="schema.json" title="JSON Schema" />

## Event Flow

1. **Trigger:** The event is triggered when the policy creation process fails due to validation errors, system issues, or other factors.
2. **Payload Propagation:** The event payload is distributed to consuming services to manage the failure appropriately.
3. **Follow-Up
