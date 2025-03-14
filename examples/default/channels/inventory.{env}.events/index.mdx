---
id: inventory.{env}.events
name: Inventory Events Channel
version: 1.0.0
summary: |
  Central event stream for all inventory-related events including stock updates, allocations, and adjustments
owners:
  - dboyne
address: inventory.{env}.events
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
The Inventory Events channel is the central stream for all inventory-related events across the system. This includes stock level changes, inventory allocations, adjustments, and stocktake events. Events for a specific SKU are guaranteed to be processed in sequence when using productId as the partition key.

<ChannelInformation />

### Publishing and Subscribing to Events

#### Publishing Example
```python
from kafka import KafkaProducer
import json
from datetime import datetime

# Kafka configuration
bootstrap_servers = ['localhost:9092']
topic = f'inventory.{env}.events'

# Create a Kafka producer
producer = KafkaProducer(
    bootstrap_servers=bootstrap_servers,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Example inventory update event
inventory_event = {
    "eventType": "STOCK_LEVEL_CHANGED",
    "timestamp": datetime.utcnow().isoformat(),
    "version": "1.0",
    "payload": {
        "productId": "PROD-456",
        "locationId": "WH-123",
        "previousQuantity": 100,
        "newQuantity": 95,
        "changeReason": "ORDER_FULFILLED",
        "unitOfMeasure": "EACH",
        "batchInfo": {
            "batchId": "BATCH-789",
            "expiryDate": "2025-12-31"
        }
    },
    "metadata": {
        "source": "warehouse_system",
        "correlationId": "inv-xyz-123",
        "userId": "john.doe"
    }
}

# Send the message - using productId as key for partitioning
producer.send(
    topic, 
    key=inventory_event['payload']['productId'].encode('utf-8'),
    value=inventory_event
)
producer.flush()

print(f"Inventory event sent to topic {topic}")

```

### Subscription example

```python
from kafka import KafkaConsumer
import json
from datetime import datetime

class InventoryEventConsumer:
    def __init__(self):
        # Kafka configuration
        self.topic = f'inventory.{env}.events'
        self.consumer = KafkaConsumer(
            self.topic,
            bootstrap_servers=['localhost:9092'],
            group_id='inventory-processor-group',
            auto_offset_reset='earliest',
            enable_auto_commit=False,
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            key_deserializer=lambda x: x.decode('utf-8') if x else None
        )

    def process_event(self, event):
        """Process individual inventory events based on type"""
        event_type = event.get('eventType')
        
        if event_type == 'STOCK_LEVEL_CHANGED':
            self.handle_stock_level_change(event)
        elif event_type == 'LOW_STOCK_ALERT':
            self.handle_low_stock_alert(event)
        # Add more event type handlers as needed

    def handle_stock_level_change(self, event):
        """Handle stock level change events"""
        payload = event['payload']
        print(f"Stock level change detected for product {payload['productId']}")
        print(f"New quantity: {payload['newQuantity']}")
        # Add your business logic here

    def handle_low_stock_alert(self, event):
        """Handle low stock alert events"""
        payload = event['payload']
        print(f"Low stock alert for product {payload['productId']}")
        print(f"Current quantity: {payload['currentQuantity']}")
        # Add your business logic here

    def start_consuming(self):
        """Start consuming messages from the topic"""
        try:
            print(f"Starting consumption from topic: {self.topic}")
            for message in self.consumer:
                try:
                    # Process the message
                    event = message.value
                    print(f"Received event: {event['eventType']} for product: {event['payload']['productId']}")
                    
                    # Process the event
                    self.process_event(event)
                    
                    # Commit the offset after successful processing
                    self.consumer.commit()
                    
                except Exception as e:
                    print(f"Error processing message: {str(e)}")
                    # Implement your error handling logic here
                    # You might want to send to a DLQ (Dead Letter Queue)
        
        except Exception as e:
            print(f"Consumer error: {str(e)}")
        finally:
            # Clean up
            self.consumer.close()

if __name__ == "__main__":
    # Create and start the consumer
    consumer = InventoryEventConsumer()
    consumer.start_consuming()
  ```