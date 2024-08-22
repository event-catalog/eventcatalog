---
id: create-policy-command
name: CreatePolicy
version: 0.0.1
summary: |
  Command to initiate the creation of a new insurance policy. This command includes all necessary information to generate a new policy, including customer details, coverage options, and premium settings.
schemaPath: schema.json
---

## Overview

The **CreatePolicyCommand** is used to initiate the creation of a new insurance policy within the Policy Creation Service. This command is essential for starting the policy creation workflow, which involves customer data processing, risk assessment, and policy document generation.

<SchemaViewer schema="schema.json" title="JSON Schema" />

## Command Flow

1. **Initiation:** The command is issued when a new policy needs to be created, typically after a customer selects their desired coverage and provides necessary details.
2. **Processing:** The Policy Creation Service processes the command, performing risk assessment and generating the policy.
3. **Outcome:** The result is either a new policy (triggering `PolicyCreatedEvent`) or a failure (triggering `PolicyCreationFailedEvent`).

---

The **CreatePolicyCommand** is a fundamental part of the policy creation process, enabling SunnyDay Insurance to generate new policies based on customer needs and inputs.
