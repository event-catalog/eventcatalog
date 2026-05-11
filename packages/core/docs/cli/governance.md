---
id: cli-governance
title: Governance
sidebar_label: Governance
sidebar_position: 20
---

# Governance CLI Commands

Manage governance in your EventCatalog from the command line.

## governanceCheck

Compare the current catalog (or a target branch) against a base branch and evaluate governance rules defined in governance.yaml (or governance.yml)

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| --base | string | No | Base branch to compare against (default: main) |
| --format | string | No | Output format: text or json (default: text) |



---
