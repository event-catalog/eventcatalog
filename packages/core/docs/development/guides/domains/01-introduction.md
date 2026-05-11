---
sidebar_position: 1
keywords:
- EventCatalog events
sidebar_label: What are domains?
title: Understanding domains
description: What are domains? Why are they useful for event-driven architectures?
---

Domain-Driven Design (DDD) is a software development approach that focuses on deeply understanding and accurately modelling the business domain. This methodology aims to enhance software quality by ensuring it aligns closely with the business requirements it supports. Eric Evans introduced DDD to the software development community in 2003 through his influential book, [Domain-Driven Design: Tackling Complexity in the Heart of Software](https://www.amazon.co.uk/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215).

The essence of domain-driven design lies in managing complexity by centering software development around the ‘domain,’ which is the specific business context where the software is used. DDD promotes the use of a [ubiquitous language](https://martinfowler.com/bliki/UbiquitousLanguage.html), a shared vocabulary between developers and business stakeholders. This common language is used throughout the design and implementation process, ensuring that the software accurately represents the business domain it is designed to serve.

Domain-driven design has some core building blocks including entities, value objects, bounded context and aggregates.

**EventCatalog uses domains as a way to group services into a bounded context.**

**EventCatalog support subdomains, which can be used to group domains together.**

Using domains in EventCatalog gives you a better way to manage your services and define their bounded context. 

Domains can also directly specify the messages they send and receive, providing a high-level view of domain interactions.
