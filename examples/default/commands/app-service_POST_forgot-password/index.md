---
id: app-service_POST_forgot-password
version: 2.0.0
name: app-service_POST_forgot-password
summary: Sends an email with a link containing a token to reset user password
schemaPath: ''
badges:
  - content: POST
    textColor: blue
    backgroundColor: blue
  - content: 'tag:Users'
    textColor: blue
    backgroundColor: blue
---
## Architecture
<NodeGraph />



## POST `(/forgot-password)`

### Parameters
- **limit** (query): The collection items limit
- **offset** (query): The collection items offset




### Responses
**200 Response**
<SchemaViewer file="response-200.json" maxHeight="500" id="response-200" />
      **401 Response**
<SchemaViewer file="response-401.json" maxHeight="500" id="response-401" />
