---
sidebar_position: 1
keywords:
- license
- license.jwt
- EC_LICENSE
- trial
- offline license
sidebar_label: License file
title: License file
description: Where to put your license.jwt file, how EventCatalog verifies it, and how EventCatalog shows your license and trial status.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="5.0.0" />

From v5, EventCatalog is licensed under the Business Source License 1.1 and every feature is included (on a paid plan, federation is Enterprise only). Your license is a signed file called `license.jwt`. EventCatalog reads it to show who the catalog is licensed to and when the license expires.

This page covers how the file works. To find out whether you need a commercial license, read the [licensing FAQ](/license-faq). For prices, see [pricing](/pricing).

:::info Using v4 license keys?

License keys such as `EVENTCATALOG_SCALE_LICENSE_KEY` are covered in [License Keys (v4)](/docs/development/license-keys/overview).

:::

## Get a license file

Get your `license.jwt` from [EventCatalog Cloud](https://eventcatalog.cloud). Free users confirm their eligibility there, and commercial customers get a file with their license. See [license keys in the FAQ](/license-faq#keys).

One file covers your whole organization. You don't need a file per catalog or per environment.

## Add the file to your catalog

Put `license.jwt` in the root of your catalog, next to `eventcatalog.config.js`.

```txt
my-catalog/
├── domains/
├── services/
├── eventcatalog.config.js
└── license.jwt
```

To keep the file somewhere else, set `EC_LICENSE` to the path of the file. `EC_LICENSE` is a file path, not the contents of the file.

```bash title=".env"
EC_LICENSE=/etc/secrets/eventcatalog/license.jwt
```

EventCatalog loads `.env` before it checks the license, so you can set `EC_LICENSE` there or in your shell.

### Use the file in CI/CD

You can commit `license.jwt` with your catalog. If you prefer not to, store its contents as a CI secret, write it to a file during the job, and point `EC_LICENSE` at that file:

```bash
# LICENSE_JWT is a CI secret that holds the contents of license.jwt
echo "$LICENSE_JWT" > "$RUNNER_TEMP/license.jwt"
export EC_LICENSE="$RUNNER_TEMP/license.jwt"

npx eventcatalog build
```

## How the file is verified

EventCatalog verifies the file offline, against a public key built into EventCatalog. It checks the signature, the issuer, the audience, and the dates the license is valid from and until.

There are no calls home: the license works air-gapped, and nothing about your catalog is sent to EventCatalog to verify it.

When you change the file, EventCatalog verifies it again.

## License status in the terminal

`eventcatalog dev` and `eventcatalog build` print the catalog's license status when they start.

With a valid license, they show who it's licensed to and when it expires:

```txt
   ╭────── EventCatalog Commercial License ──────╮
   │                                             │
   │   Licensed to Acme Ltd                      │
   │   Valid until Oct 1, 2027 (359 days left)   │
   │                                             │
   ╰─────────────────────────────────────────────╯
```

| Status | What the terminal shows |
| --- | --- |
| Valid license | A green **EventCatalog Commercial License** box with who it's licensed to and the expiry date. |
| Expires in fewer than 30 days | A yellow box with the days left and a link to [eventcatalog.cloud](https://eventcatalog.cloud) to renew it. |
| Expired license | A yellow **EventCatalog License Expired** box with the date it expired, a link to renew it, and the trial status. |
| Invalid license | A yellow **EventCatalog license** box with the reason, the trial status, and a link to the licensing FAQ. |
| No license | An **EventCatalog trial** box with the days left of the trial and when it ends. |

A license is invalid when it can't be verified, for example when:

- the file is empty
- it is not valid yet
- its signature is invalid
- it was not issued by EventCatalog
- it has no expiry date

## License status in the catalog

### Header badge

While you run `eventcatalog dev`, the header shows a badge for your license or trial. The badge never appears in built or served catalogs.

| Status | Badge | Links to |
| --- | --- | --- |
| No license | **Trial · N days left**, counting down the trial | [Licensing FAQ](/license-faq) |
| No license, trial over | **Trial ended** | [Licensing FAQ](/license-faq) |
| Valid license, 30 or more days left | No badge | |
| Valid license, fewer than 30 days left | **License · N days left** | Settings > License |
| Expired license | **License expired** | Settings > License |

### Settings > License

**Settings > License** (`/settings/license`) shows the catalog's license. For a valid license it lists:

- **Licensed to**
- **License ID**
- **Issued**
- **Expires**
- **Time left**

When the license has fewer than 30 days left, or has expired, the page shows a callout with a **Renew license** button that opens [EventCatalog Cloud](https://eventcatalog.cloud). When the file can't be verified, the page shows the reason.

Without a valid license, the page also shows the trial: its length, when it started, when it ends and the time left.

In a static build, the page shows the license as it was when you built the catalog. The days left are counted in the browser, so they stay current.

## The trial

Without a valid license, EventCatalog counts down a trial, starting from when you first ran your catalog.

The trial countdown in EventCatalog is a reminder. The terms of the evaluation, and what to do when it ends, are in the [licensing FAQ](/license-faq#production).

## When a trial or license ends

Your catalog keeps building and running. EventCatalog never fails a build, or turns features off, because a trial ended or a license expired. It shows reminders in the terminal, in the dev header and on Settings > License.

To renew a license, get a new `license.jwt` from [EventCatalog Cloud](https://eventcatalog.cloud) and replace the file.

## v4 license keys

EventCatalog checks for a `license.jwt` first. If there isn't a valid one, it still recognizes a Scale or Starter license key (`EVENTCATALOG_SCALE_LICENSE_KEY` or `EVENTCATALOG_STARTER_LICENSE_KEY`). With one of those keys, EventCatalog shows no trial, and Settings > License shows the plan as active.

These keys are verified online, as they were in v4. See [License Keys (v4)](/docs/development/license-keys/overview).
