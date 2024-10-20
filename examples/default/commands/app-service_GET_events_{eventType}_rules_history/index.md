---
id: 'app-service_GET_events_{eventType}_rules_history'
version: 2.0.0
name: 'app-service_GET_events_{eventType}_rules_history'
summary: Retrieve the change history of the set of rules
schemaPath: ''
badges:
  - content: GET
    textColor: blue
    backgroundColor: blue
  - content: 'tag:Events'
    textColor: blue
    backgroundColor: blue
  - content: 'tag:Rules'
    textColor: blue
    backgroundColor: blue
---
## Architecture
<NodeGraph />



## GET `(/events/{eventType}/rules/history)`

### Parameters
- **limit** (query): The collection items limit
- **offset** (query): The collection items offset




### Responses
**200 Response**
<SchemaViewer file="response-200.json" maxHeight="500" id="response-200" />
      **401 Response**
<SchemaViewer file="response-401.json" maxHeight="500" id="response-401" />
