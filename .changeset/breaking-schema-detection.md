---
"@eventcatalog/breaking-changes": minor
"@eventcatalog/cli": minor
---

feat: add breaking schema change detection with governance webhooks

New `schema_breaking_change` governance trigger that detects breaking JSON Schema changes per compatibility strategy (BACKWARD, FORWARD, FULL, NONE). Users configure `compatibility.strategy` in governance.yaml and subscribe to breaking change webhooks with detailed diff information.
