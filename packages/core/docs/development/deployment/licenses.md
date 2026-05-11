---
sidebar_position: 5
keywords:
- licenses
sidebar_label: License Validation
title: EventCatalog Licenses
description: This document describes how EventCatalog licenses work online and offline.
---

EventCatalog is an open source project with a [community edition and a commercial edition](/pricing) and also supports a range of integrations (plugins) which have their own licenses.

If you are using the commercial edition of EventCatalog, then you don't need to worry about licenses and can skip this page.

If you are using EventCatalog Starter, EventCatalog Scale, EventCatalog Enterprise or any of the integrations (plugins) you will need to set up a license key.

:::tip Want to try commercial features?
All licenses have a 14 day free trial. You can get a free trial license key by going to [EventCatalog Cloud](https://eventcatalog.cloud).

If you wish to continue using the commercial features after the trial period, you will need to purchase a license.

You can email us at `hello@eventcatalog.dev` to enquire about a license.
:::


### How to set up a license keys

1. Go to [EventCatalog Cloud](https://eventcatalog.cloud) and sign up for a free trial.
1. Once you are logged in, you can select any license you want to use or integration.
1. Selecting the plan or integration will give you a license key. 
1. Store the license key in your `.env` file or as an environment variable.

### How EventCatalog validates licenses keys

##### Online License Validation (recommended)

By default, EventCatalog will validate your license key online.

Your keys are read from your `.env` file and verified against our API.

##### Offline License Validation

If you are behind a firewall or can't access the EventCatalog API, then your license keys can be validated offline.

To get offline validation working you will need to:

1. Get in contact with us at `hello@eventcatalog.dev` to get a license key `(license.jwt)`.
1. Once you have you license key `(license.jwt)` you put this into the root of your catalog directory.
1. EventCatalog will then validate your license key offline.

Your key will expire after a year of purchase, and you will need to get a new license key.
