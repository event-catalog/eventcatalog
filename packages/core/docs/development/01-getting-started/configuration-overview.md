---
sidebar_position: 6
keywords:
- EventCatalog configuration
sidebar_label: Configuration
title: Configuration
description: Understand how to configure EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Most new EventCatalog projects are ready to run as soon as they are created. You only need to change configuration when you want to adjust how the catalog behaves, where it builds, or which features are enabled.

Configuration lives in `eventcatalog.config.js` at the root of your project. You can read the [full reference documentation](/docs/api/config) to learn what can be changed.

## Configuring environment variables {#configuring-environment-variables}

Some features need values that should not live directly in `eventcatalog.config.js`, such as license keys or provider credentials.

Put those values in a `.env` file in the root of your catalog. EventCatalog loads `.env` when it runs locally and when it builds.

```bash title=".env (example)"
EVENTCATALOG_SCALE_LICENSE_KEY=your-api-key
```

Do not commit real secrets to source control.

## Related configuration

EventCatalog has a linter that can be used to validate your EventCatalog documentation.

You can read more about the EventCatalog Linter in the [EventCatalog Linter documentation](/docs/development/developer-tools/eventcatalog-linter).
