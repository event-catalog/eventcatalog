---
id: update-policy-details-command
name: UpdatePolicyDetailsCommand
version: 0.0.1
summary: |
  Command to update specific details of an existing insurance policy, such as coverage amounts, policyholder information, or premium frequency.
schemaPath: schema.json
---

## Overview

The **UpdatePolicyDetailsCommand** is used to modify the details of an existing insurance policy. This command allows for updates to be made to the policy without needing to create a new one, ensuring that the policy remains accurate and relevant to the customer's needs.

<SchemaViewer schema="schema.json" title="JSON Schema" />

## Command Flow

1. **Initiation:** The command is issued when there is a need to update specific details of an existing policy.
2. **Processing:** The Policy Creation Service processes the command, making the necessary updates to the policy.
3. **Outcome:** The policy is updated with the new details, ensuring that the customer’s coverage remains accurate and up-to-date.

---

The **UpdatePolicyDetailsCommand** is crucial for maintaining the accuracy and relevance of policies, allowing SunnyDay Insurance to respond to customer requests and changing circumstances efficiently.
