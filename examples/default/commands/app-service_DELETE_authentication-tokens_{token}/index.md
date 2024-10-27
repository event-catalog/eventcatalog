---
id: 'app-service_DELETE_authentication-tokens_{token}'
version: 2.0.0
name: 'app-service_DELETE_authentication-tokens_{token}'
summary: Logout a user
schemaPath: ''
badges:
  - content: DELETE
    textColor: blue
    backgroundColor: blue
  - content: 'tag:Customer Authentication'
    textColor: blue
    backgroundColor: blue
---
## Architecture
<NodeGraph />



## DELETE `(/authentication-tokens/{token})`

### Parameters
- **limit** (query): The collection items limit
- **offset** (query): The collection items offset




### Responses
**200 Response**
<SchemaViewer file="response-200.json" maxHeight="500" id="response-200" />
      **401 Response**
<SchemaViewer file="response-401.json" maxHeight="500" id="response-401" />
