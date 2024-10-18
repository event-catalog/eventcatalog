---
id: app-service_POST_payment-cards-migrations_migrate
version: 2.0.0
name: app-service_POST_payment-cards-migrations_migrate
summary: Migrate payment cards to another gateway account
schemaPath: ''
badges:
  - content: POST
    textColor: blue
    backgroundColor: blue
  - content: 'tag:Migrate payment cards'
    textColor: blue
    backgroundColor: blue
---
## Architecture
<NodeGraph />



## POST `(/payment-cards-migrations/migrate)`

### Parameters
- **limit** (query): The collection items limit
- **offset** (query): The collection items offset




### Responses
**200 Response**
<SchemaViewer file="response-200.json" maxHeight="500" id="response-200" />
      **401 Response**
<SchemaViewer file="response-401.json" maxHeight="500" id="response-401" />
