---
id: 'app-service_PUT_files_{id}'
version: 2.0.0
name: 'app-service_PUT_files_{id}'
summary: >-
  Update the File with predefined ID. Note that file can be uploaded with POST
  only.
schemaPath: ''
badges:
  - content: PUT
    textColor: blue
    backgroundColor: blue
  - content: 'tag:Files'
    textColor: blue
    backgroundColor: blue
---
## Architecture
<NodeGraph />



## PUT `(/files/{id})`

### Parameters
- **limit** (query): The collection items limit
- **offset** (query): The collection items offset




### Responses
**200 Response**
<SchemaViewer file="response-200.json" maxHeight="500" id="response-200" />
      **401 Response**
<SchemaViewer file="response-401.json" maxHeight="500" id="response-401" />
