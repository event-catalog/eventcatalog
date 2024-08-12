---
id: policy-renewal-request-command
name: PolicyRenewalRequestCommand
version: 0.0.1
badges:
  - content: Core Command
    backgroundColor: blue
    textColor: white
---

## Overview

The **PolicyRenewalRequestCommand** is used to initiate the renewal process for an existing insurance policy. This command includes all necessary details to evaluate and process the renewal, ensuring that the customer's coverage is extended as required.

<AccordionGroup>
  <Accordion title="Command Payload">
    ```json
    {
      "policyId": "string",
      "customerId": "string",
      "requestedRenewalDate": "string",
      "newCoverageDetails": {
        "type": "string",
        "amount": "number",
        "startDate": "string",
        "endDate": "string"
      },
      "newPremium": {
        "amount": "number",
        "frequency": "string"
      }
    }
    ```
  </Accordion>
  
  <Accordion title="Triggers">
    - **Policy Renewal Process:** Starts the renewal process for the specified policy, including risk assessment and premium adjustment if necessary.
  </Accordion>
  
  <Accordion title="Expected Outcome">
    If the command is processed successfully, it will lead to the policy being renewed and the emission of a `PolicyRenewedEvent`. If it fails, a `PolicyRenewalFailedEvent` is emitted.
  </Accordion>
  
  <Accordion title="Use Cases">
    - **Customer-Initiated Renewal:** Used when a customer requests to renew their policy.
    - **Automated Renewal:** May be used in automated processes where policies are renewed based on predefined criteria.
  </Accordion>
</AccordionGroup>

## Command Flow

1. **Initiation:** The command is issued when a renewal is requested for an existing policy.
2. **Processing:** The Policy Renewal Service processes the command, updating policy details and extending coverage.
3. **Outcome:** The result is either a renewed policy (`PolicyRenewedEvent`) or a failure (`PolicyRenewalFailedEvent`).

---

The **PolicyRenewalRequestCommand** is essential for managing the lifecycle of policies, ensuring that customers can easily continue their coverage.
