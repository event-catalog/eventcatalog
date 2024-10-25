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
  - id: CancelSubscription
    version: 0.0.1
  - id: GetSubscriptionStatus  
sends:
  - id: UserSubscriptionStarted
    version: 0.0.1
  - id: UserSubscriptionCancelled  
    version: 0.0.1
repository:
  language: JavaScript
  url: https://github.com/event-catalog/pretend-subscription-service
---

import Footer from '@catalog/components/footer.astro';

## Overview

The subscription Service is responsible for handling customer subscriptions in our system. It handles new subscriptions, cancelling subscriptions and updating them.

<Tiles >
    <Tile icon="DocumentIcon" href={`/docs/services/${frontmatter.id}/${frontmatter.version}/changelog`}  title="View the changelog" description="Want to know the history of this service? View the change logs" />
    <Tile icon="UserGroupIcon" href="/docs/teams/full-stack" title="Contact the team" description="Any questions? Feel free to contact the owners" />
    <Tile icon="BoltIcon" href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Sends ${frontmatter.sends.length} messages`} description="This service sends messages to downstream consumers" />
    <Tile icon="BoltIcon"  href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Receives ${frontmatter.receives.length} messages`} description="This service receives messages from other services" />
</Tiles>

## Architecture diagram 

<NodeGraph />

<Footer />