---
id: app-service_GET_payment-cards-migrations
version: 2.0.0
name: app-service_GET_payment-cards-migrations
summary: Retrieve a list of payment cards ready for migration
schemaPath: ''
badges:
  - content: GET
    textColor: blue
    backgroundColor: blue
  - content: 'tag:Migrate payment cards'
    textColor: blue
    backgroundColor: blue
---
## Architecture
<NodeGraph />



## GET `(/payment-cards-migrations)`

### Parameters
- **limit** (query): The collection items limit
- **offset** (query): The collection items offset




### Responses
**200 Response**
<SchemaViewer file="response-200.json" maxHeight="500" id="response-200" />
      **401 Response**
<SchemaViewer file="response-401.json" maxHeight="500" id="response-401" />
