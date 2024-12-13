---
createdAt: 2024-07-01
badges:
    - content: Breaking change
      backgroundColor: red
      textColor: red
---

### Removed fields from schema, added new owners

`Gender` property has been removed from the Schema of the event

Also added the [full stackers](/docs/teams/full-stack) team as owners of this event

```diff lang="json"
  {
    "type" : "record",
    "namespace" : "Tutorialspoint",
    "name" : "Employee",
    "fields" : [
      { "name" : "Name" , "type" : "string" },
      { "name" : "Age" , "type" : "int" },
-     { "name" : "Gender" , "type" : "string" },
    ]
  }
```




