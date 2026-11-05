---
sidebar_position: 2.5
slug: /development/getting-started/adopting-eventcatalog
keywords:
- EventCatalog adoption
- rollout
- champion
- Federation
sidebar_label: Adopting EventCatalog
title: Adopting EventCatalog in your organization
description: How organizations usually adopt EventCatalog, from one champion and one pain point to a catalog that grows across teams.
---

import { RolloutJourney } from '@site/src/components/Rollout';
import { OrgTopology } from '@site/src/components/AgentOutputs';

Most organizations adopt EventCatalog step by step. This is the pattern we see most often.

<RolloutJourney />

## 1. Start with a champion

A champion drives EventCatalog in your organization. It can be one person or a team. They set up the first catalog, and help other teams start using it.

## 2. Solve one pain point

The champion picks one workflow or pain point, and documents around it. For example, teams can't find the schemas for your events, so the first catalog documents your events and their schemas.

Starting small means the catalog is useful from day one, and you learn what your organization needs from it.

## 3. Share it and get feedback

Once the pain point is solved, share the catalog with other teams and ask for feedback. Teams will tell you what they want to see next, and some will start contributing.

## 4. Grow your catalog over time

Build the catalog up over time: add [domains](/docs/development/guides/domains/introduction), [systems](/docs/development/guides/systems/introduction), services, [flows](/docs/development/guides/resources/flows/introduction) and owners. The more you add, the more your catalog connects, and the more valuable it becomes.

To keep it up to date as it grows, generate parts of it from your [specifications and schema registries](/integrations), and keep it in sync with your code with [EventCatalog Agents](/docs/development/agents/set-up-code-to-docs).

## One catalog, or many

You can have one catalog for your whole organization, or a catalog per team combined with [Federation](/docs/federation/overview). With Federation, each team controls its own documentation, and you still get one view of your whole architecture.

<OrgTopology />

Most organizations start with one central catalog and a couple of champions, then roll it out to more teams.

## Talk to us

If you want to discuss how to roll out EventCatalog in your organization, [contact us at hello@eventcatalog.dev](mailto:hello@eventcatalog.dev). We're happy to walk you through the options and advise you.
