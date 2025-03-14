---
id: orders.{env}.events
name: Order Events Channel
version: 1.0.1
summary: |
  Central event stream for all order-related events in the order processing lifecycle
owners:
  - dboyne
address: orders.{env}.events
protocols: 
  - kafka

parameters:
  env:
    enum:
      - dev
      - sit
      - prod
    description: 'Environment to use'
---

### Overview
The Orders Events channel is the central stream for all order-related events across the order processing lifecycle. This includes order creation, updates, payment status, fulfillment status, and customer communications. All events related to a specific order are guaranteed to be processed in sequence when using orderId as the partition key.

<ChannelInformation />

### Publishing a message using Kafka

Here is an example of how to publish an order event using Kafka:

```python
from kafka import KafkaProducer
import json
from datetime import datetime

# Kafka configuration
bootstrap_servers = ['localhost:9092']
topic = f'orders.{env}.events'

# Create a Kafka producer
producer = KafkaProducer(
    bootstrap_servers=bootstrap_servers,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Example order created event
order_event = {
    "eventType": "ORDER_CREATED",
    "timestamp": datetime.utcnow().isoformat(),
    "version": "1.0",
    "payload": {
        "orderId": "12345",
        "customerId": "CUST-789",
        "items": [
            {
                "productId": "PROD-456",
                "quantity": 2,
                "price": 29.99
            }
        ],
        "totalAmount": 59.98,
        "shippingAddress": {
            "street": "123 Main St",
            "city": "Springfield",
            "country": "US"
        }
    },
    "metadata": {
        "source": "web_checkout",
        "correlationId": "abc-xyz-123"
    }
}

# Send the message - using orderId as key for partitioning
producer.send(
    topic, 
    key=order_event['payload']['orderId'].encode('utf-8'),
    value=order_event
)
producer.flush()

print(f"Order event sent to topic {topic}")