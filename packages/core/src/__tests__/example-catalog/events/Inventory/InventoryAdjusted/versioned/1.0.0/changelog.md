---
createdAt: 2024-07-11
badges:
    - content: New field
      backgroundColor: green
      textColor: green
---

### Added new field to schema

We added the new town property to the schema for downstream consumers. 

```json ins={"New: Added new Town property to schema:":9-10}
// labeled-line-markers.jsx
{
  "type" : "record",
  "namespace" : "Tutorialspoint",
  "name" : "Employee",
  "fields" : [
     { "name" : "Name" , "type" : "string" },
     { "name" : "Age" , "type" : "int" },

     { "name" : "Town" , "type" : "string" },
  ]
}
```
