---
id: OutOfStock
name: Inventory out of stock
version: 0.0.3
summary: |
  Indicates inventory is out of stock
owners:
    - dboyne
    - msmith
    - asmith
    - full-stack
    - mobile-devs
badges:
    - content: Recently updated!
      backgroundColor: green
      textColor: green
    - content: Channel:Apache Kafka
      backgroundColor: yellow
      textColor: yellow
---

## Overview

The `Inventory Adjusted` event is triggered whenever there is a change in the inventory levels of a product. This could occur due to various reasons such as receiving new stock, sales, returns, or manual adjustments by the inventory management team. The event ensures that all parts of the system that rely on inventory data are kept up-to-date with the latest inventory levels.

<NodeGraph />

### Payload
The payload of the `Inventory Adjusted` event includes the following fields:

```json title="Example of payload" frame="terminal"
{
  "event_id": "string",
  "timestamp": "ISO 8601 date-time",
  "product_id": "string",
  "adjusted_quantity": "integer",
  "new_quantity": "integer",
  "adjustment_reason": "string",
  "adjusted_by": "string"
}
```

### Producing the Event

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