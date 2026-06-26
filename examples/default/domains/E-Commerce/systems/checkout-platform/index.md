---
id: checkout-platform
name: Checkout Platform
version: 1.0.0
summary: A system defined inside the E-Commerce domain. Systems can live in any folder, so you can co-locate them with the domain whose services they group — even though systems are orthogonal to domains.
owners:
  - dboyne
services:
  - id: OrdersService
relationships:
  - id: core-monolith
    label: reads catalog from
  - id: payments-platform
    label: authorizes payments via
---

## Overview

The **Checkout Platform** groups the services that power checkout. It is
defined inside the E-Commerce domain folder to keep related resources together,
but a system is not tied to a single domain — it can group services from
multiple domains.
