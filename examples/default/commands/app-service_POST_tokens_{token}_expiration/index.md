---
id: 'app-service_POST_tokens_{token}_expiration'
version: 2.0.0
name: 'app-service_POST_tokens_{token}_expiration'
summary: Expire a token
schemaPath: ''
badges:
  - content: POST
    textColor: blue
    backgroundColor: blue
  - content: 'tag:Payment Tokens'
    textColor: blue
    backgroundColor: blue
---
## Architecture
<NodeGraph />



## POST `(/tokens/{token}/expiration)`

### Parameters
- **limit** (query): The collection items limit
- **offset** (query): The collection items offset




### Responses
**200 Response**
<SchemaViewer file="response-200.json" maxHeight="500" id="response-200" />
      **401 Response**
<SchemaViewer file="response-401.json" maxHeight="500" id="response-401" />
