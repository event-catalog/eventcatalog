---
name: UserCreated
version: 0.0.1
summary: |
  Event is created when we do something useful.
producers:
    - User API
    - Customer Portal
    - Random
consumers:
    - Email Platform
domains:
    - User
owners:
    - label: dboyne
---

<Admonition type="info">
  Make sure you set the correlation id on the field.
</Admonition>

<EventFlowDiagram />

<Schema />

## Contributing

If you would like to contribute to this event then make sure you do it right :)


