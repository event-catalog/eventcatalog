---
id: Testing
name: Testing
version: 1.0.1
summary: |
  Indicates a change in inventory level
owners:
    - dboyne
    - msmith
    - asmith
    - full-stack
    - mobile-devs
channels:
  - id: inventory.{env}.events
badges:
    - content: Recently updated!
      backgroundColor: green
      textColor: green
    - content: Channel:Apache Kafka
      backgroundColor: yellow
      textColor: yellow
schemaPath: 'schema.avro'
---

import Footer from '@catalog/components/footer.astro';

## Overview

Hello

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />