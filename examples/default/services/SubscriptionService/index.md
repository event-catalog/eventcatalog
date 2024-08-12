---
id: SubscriptionService
version: 0.0.1
name: Subscription Service
summary: |
  Service that handles subscriptions
owners:
    - dboyne
receives:
  - id: SubscribeUser
    version: 0.0.1
sends:
  - id: UserSubscriptionStarted  
    version: 0.0.1
repository:
  language: JavaScript
  url: https://github.com/boyney123/pretend-subscription-service
---

import Footer from '@catalog/components/footer.astro';

## Overview

The subscription Service is responsible for handling customer subscriptions in our system. It handles new subscriptions, cancelling subscriptions and updating htem.

## Architecture diagram 

<NodeGraph />

<Footer />