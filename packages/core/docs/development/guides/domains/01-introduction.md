---
sidebar_position: 1
keywords:
- EventCatalog domains
sidebar_label: What are domains?
title: What are domains?
description: What are domains? Why are they useful for event-driven architectures?
---

In EventCatalog a domain describes a business boundary (term from Domain-Driven Design).

For example, an e-commerce architecture may have domains such as `Fulfilment`, `Ordering`, `Payments` or `Shopping` and these domains may contain their own language, systems, services, events, and many more lower level resources.

Documenting domains (and subdomains) in EventCatalog can help your teams understand busiess boundaries, team ownership and how these boundaries fit together in your organization.

You can assign resources to your domains (e.g systems, services, messages) that can help your team dive deeper into a domain to understand implmentation details.

<details>
    <summary>What is Domain Driven Design?</summary>

    Domain-Driven Design (DDD) is a software development approach that focuses on deeply understanding and accurately modelling the business domain. This methodology aims to enhance software quality by ensuring it aligns closely with the business requirements it supports. Eric Evans introduced DDD to the software development community in 2003 through his influential book, [Domain-Driven Design: Tackling Complexity in the Heart of Software](https://www.amazon.co.uk/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215).

The essence of domain-driven design lies in managing complexity by centering software development around the ‘domain,’ which is the specific business context where the software is used. DDD promotes the use of a [ubiquitous language](https://martinfowler.com/bliki/UbiquitousLanguage.html), a shared vocabulary between developers and business stakeholders. This common language is used throughout the design and implementation process, ensuring that the software accurately represents the business domain it is designed to serve.

Domain-driven design has some core building blocks including entities, value objects, bounded context and aggregates.

  </details>
