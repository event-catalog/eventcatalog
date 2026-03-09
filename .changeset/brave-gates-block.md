---
"@eventcatalog/core": patch
---

Add `type: fail` governance action to block CI/CD pipelines when rules trigger. Supports optional `message` field with `$ENV_VAR` interpolation. Rules without a fail action continue to exit 0 (backward compatible).
