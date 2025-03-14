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


<SchemaViewer file="schema.yml" title="JSON Schema" maxHeight="500" />

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

Select the language you want to produce the event in to see an example.

<Tabs>
  <TabItem title="Python">

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
  </TabItem>
  <TabItem title="TypeScript">

    ```typescript title="Produce event in TypeScript" frame="terminal"
    import { Kafka } from 'kafkajs';

    // Kafka configuration
    const kafka = new Kafka({
      clientId: 'inventory-producer',
      brokers: ['localhost:9092']
    });

    const producer = kafka.producer();

    // Event data
    const eventData = {
      event_id: "abc123",
      timestamp: new Date().toISOString(),
      product_id: "prod987", 
      adjusted_quantity: 10,
      new_quantity: 150,
      adjustment_reason: "restock",
      adjusted_by: "user123"
    };

    // Send event to Kafka topic
    async function produceEvent() {
      await producer.connect();
      await producer.send({
        topic: 'inventory.adjusted',
        messages: [
          { value: JSON.stringify(eventData) }
        ],
      });
      await producer.disconnect();
    }

    produceEvent().catch(console.error);
    ```
  </TabItem>
  <TabItem title="Java">

    ```java title="Produce event in Java" frame="terminal"
    import org.apache.kafka.clients.producer.*;
    import org.apache.kafka.common.serialization.StringSerializer;
    import com.fasterxml.jackson.databind.ObjectMapper;
    import java.util.Properties;
    import java.util.HashMap;
    import java.util.Map;
    import java.time.Instant;

    public class InventoryProducer {
        public static void main(String[] args) {
            // Kafka configuration
            Properties props = new Properties();
            props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
            props.put(ProducerConfig.CLIENT_ID_CONFIG, "inventory-producer");
            props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
            props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

            Producer<String, String> producer = new KafkaProducer<>(props);
            ObjectMapper mapper = new ObjectMapper();

            try {
                // Event data
                Map<String, Object> eventData = new HashMap<>();
                eventData.put("event_id", "abc123");
                eventData.put("timestamp", Instant.now().toString());
                eventData.put("product_id", "prod987");
                eventData.put("adjusted_quantity", 10);
                eventData.put("new_quantity", 150);
                eventData.put("adjustment_reason", "restock");
                eventData.put("adjusted_by", "user123");

                // Create producer record
                ProducerRecord<String, String> record = new ProducerRecord<>(
                    "inventory.adjusted",
                    mapper.writeValueAsString(eventData)
                );

                // Send event to Kafka topic
                producer.send(record, (metadata, exception) -> {
                    if (exception != null) {
                        System.err.println("Error producing message: " + exception);
                    }
                });

            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                producer.flush();
                producer.close();
            }
        }
    }
    ```
  </TabItem>
</Tabs>



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