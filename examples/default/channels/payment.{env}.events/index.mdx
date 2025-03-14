---
id: payments.{env}.events
name: Payment Events Channel
version: 1.0.0
summary: |
 All events contain payment ID for traceability and ordered processing.
owners:
 - dboyne
address: payments.{env}.events
protocols: 
 - kafka

parameters:
 env:
   enum:
     - dev
     - sit
     - prod
   description: 'Environment to use for payment events'
---

### Overview
The Payments Events channel is the central stream for all payment lifecycle events. This includes payment initiation, authorization, capture, completion and failure scenarios. Events for a specific payment are guaranteed to be processed in sequence when using paymentId as the partition key.

<ChannelInformation />

### Publishing Events Using Kafka

Here's an example of publishing a payment event:

```python
from kafka import KafkaProducer
import json
from datetime import datetime

# Kafka configuration
bootstrap_servers = ['localhost:9092']
topic = f'payments.{env}.events'

# Create Kafka producer
producer = KafkaProducer(
   bootstrap_servers=bootstrap_servers,
   value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Example payment processed event
payment_event = {
   "eventType": "PAYMENT_PROCESSED",
   "timestamp": datetime.utcnow().isoformat(),
   "version": "1.0",
   "payload": {
       "paymentId": "PAY-123-456", 
       "orderId": "ORD-789",
       "amount": {
           "value": 99.99,
           "currency": "USD"
       },
       "status": "SUCCESS",
       "paymentMethod": {
           "type": "CREDIT_CARD",
           "last4": "4242",
           "expiryMonth": "12",
           "expiryYear": "2025",
           "network": "VISA"
       },
       "transactionDetails": {
           "processorId": "stripe_123xyz",
           "authorizationCode": "AUTH123",
           "captureId": "CAP456"
       }
   },
   "metadata": {
       "correlationId": "corr-123-abc",
       "merchantId": "MERCH-456", 
       "source": "payment_service",
       "environment": "prod",
       "idempotencyKey": "PAY-123-456-2024-11-11-99.99"
   }
}

# Send message - using paymentId as key for partitioning
producer.send(
   topic,
   key=payment_event['payload']['paymentId'].encode('utf-8'),
   value=payment_event
)
producer.flush()
```