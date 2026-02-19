---
title: Remote fetching of models
description: Compose .ec files by importing model definitions from remote URLs.
---

Use remote imports when you want to reuse shared model definitions (services, messages, channels) from another source of truth.

## How it works

In `.ec`, you can import named definitions from a URL:

```ec title="main.ec"
import { PaymentService, PaymentProcessed, PaymentFailed } from "https://gist.githubusercontent.com/boyney123/f5aa33c20a656f6c1d9dbba7f30f5569/raw/a8a6830f19649ded18221c69525a73016364b63a/gistfile1.txt"

visualizer main {
  name "Remote import example"

  service PaymentService

  service NotificationService {
    version 1.0.0
    receives event PaymentProcessed
    receives event PaymentFailed
  }
}
```

## Recommended workflow

1. Import only the resources you need (`import { A, B } from "..."`).
2. Pin immutable URLs (commit hashes/tags), not moving `main` branches.
3. Review imported model changes in PRs before import to EventCatalog.
4. Keep a local fallback copy for environments that block outbound network.

## Try it quickly

- EventCatalog Modelling example: `https://playground.eventcatalog.dev/#example=8`

## Using with CLI import

After your model is ready, import your entry file into EventCatalog:

```bash
npx @eventcatalog/cli --dir ./catalog import ./main.ec
```

If your runtime environment cannot reach remote URLs, fetch remote content first and switch to local imports before running CLI import.
