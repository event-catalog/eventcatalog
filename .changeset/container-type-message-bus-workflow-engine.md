---
"@eventcatalog/core": minor
"@eventcatalog/sdk": minor
"@eventcatalog/linter": minor
"@eventcatalog/language-server": minor
"@eventcatalog/visualiser": patch
---

Add `messageBus` and `workflowEngine` to the `container-type` enum so message brokers (Kafka, NATS, RabbitMQ, SQS/SNS, Pub/Sub) and workflow engines (Temporal, Airflow, Step Functions) can be classified as first-class C4 containers instead of falling back to `externalSaaS`.
