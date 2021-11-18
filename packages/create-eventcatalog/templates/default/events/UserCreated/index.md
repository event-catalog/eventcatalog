---
name: UserCreated
version: 0.0.1
summary: |
  Event is created when we do something useful. We can use this tool to explain what this event is all about and go further and deeper.
producers:
    - id: User API
    - id: Customer Portal
consumers:
    - id: Email Platform
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


