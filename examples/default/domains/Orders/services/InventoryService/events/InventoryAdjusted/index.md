---
id: InventoryAdjusted
name: Inventory adjusted
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

The `Inventory Adjusted` event is triggered whenever there is a change in the inventory levels of a product. This could occur due to various reasons such as receiving new stock, sales, returns, or manual adjustments by the inventory management team. The event ensures that all parts of the system that rely on inventory data are kept up-to-date with the latest inventory levels.

<Tiles >
    <Tile icon="UserGroupIcon" href="/docs/teams/full-stack" title="Contact the team" description="Any questions? Feel free to contact the owners" />
    <Tile icon="DocumentIcon" href={`/generated/events/Inventory/${frontmatter.id}/schema.avro`} title="View the schema" description="View the schema directly in your browser" />
</Tiles>

## Architecture diagram

<NodeGraph />

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />

## Payload example

Event example you my see being published.

```json title="Payload example"
{
  "Name": "John Doe",
  "Age": 30,
  "Department": "Engineering",
  "Position": "Software Engineer",
  "Salary": 85000.50,
  "JoinDate": "2024-01-15"
}
```

## Schema (avro)

<Schema file="schema.avro" title="Inventory Adjusted Schema (avro)" />

## Producing the Event

To produce an Inventory Adjusted event, use the following example Kafka producer configuration in Python:

```python title="Produce event in Python" frame="terminal"
from kafka import KafkaProducer
import json
from datetime import datetime

# Kafka configuration
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Event data
event_data = {
  "event_id": "abc123",
  "timestamp": datetime.utcnow().isoformat() + 'Z',
  "product_id": "prod987",
  "adjusted_quantity": 10,
  "new_quantity": 150,
  "adjustment_reason": "restock",
  "adjusted_by": "user123"
}

# Send event to Kafka topic
producer.send('inventory.adjusted', event_data)
producer.flush()
```

### Consuming the Event

To consume an Inventory Adjusted event, use the following example Kafka consumer configuration in Python:

```python title="Consuming the event with python" frame="terminal"
from kafka import KafkaConsumer
import json

# Kafka configuration
consumer = KafkaConsumer(
    'inventory.adjusted',
    bootstrap_servers=['localhost:9092'],
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    group_id='inventory_group',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Consume events
for message in consumer:
    event_data = json.loads(message.value)
    print(f"Received Inventory Adjusted event: {event_data}")
```

<Footer />