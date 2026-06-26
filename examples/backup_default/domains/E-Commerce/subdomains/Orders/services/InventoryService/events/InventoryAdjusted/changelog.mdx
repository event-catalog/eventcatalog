---
createdAt: 2024-08-01
badges:
    - content: ⭐️ JSON Schema
      backgroundColor: purple
      textColor: purple
---

### Added support for JSON Schema

InventoryAdjusted uses Avro but now also supports JSON Draft 7.

```json title="Employee JSON Draft"
// labeled-line-markers.jsx
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Employee",
  "properties": {
    "Name": {
      "type": "string"
    },
    "Age": {
      "type": "integer"
    },
    "Town": {
      "type": "string"
    }
  },
  "required": ["Name", "Age", "Town"]
}

```

Using it with our Kafka Cluster

## 1. Create a new topic

```sh
# Create a topic named 'employee_topic'
kafka-topics.sh --create --topic employee_topic --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

## Step 2: Prepare the JSON Message

Create a JSON file named `employee.json` with the following content:

```json
{
  "Name": "John Doe",
  "Age": 30,
  "Town": "Springfield"
}
```

## Step 3: Produce the Message to Kafka Topic

Use the Kafka producer CLI to send the JSON message:

```sh
cat employee.json | kafka-console-producer.sh --topic employee_topic --bootstrap-server localhost:9092
```

## Step 4: Verify the Message (Optional)

```sh
kafka-console-consumer.sh --topic employee_topic --from-beginning --bootstrap-server localhost:9092
```
