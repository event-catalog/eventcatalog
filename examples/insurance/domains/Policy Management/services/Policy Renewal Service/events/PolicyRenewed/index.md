---
id: policy-renewed-event
name: PolicyRenewedEvent
version: 0.0.1
badges:
  - content: Core Event
    backgroundColor: green
    textColor: white
---

## Overview

The **PolicyRenewedEvent** is triggered when a policy is successfully renewed by the Policy Renewal Service. This event ensures that all relevant systems and services are updated with the latest policy information, maintaining continuity in coverage and billing.

<AccordionGroup>
  <Accordion title="Event Payload">
    ```json
    {
      "policyId": "string",
      "customerId": "string",
      "renewalDate": "string",
      "newEndDate": "string",
      "premium": {
        "amount": "number",
        "frequency": "string"
      }
    }
    ```
  </Accordion>
  
  <Accordion title="Emitted By">
    **Policy Renewal Service:** This event is emitted after a policy has been successfully renewed.
  </Accordion>
  
  <Accordion title="Consumed By">
    - **Premium Billing Service:** Updates the billing cycle for the renewed policy.
    - **Customer Communication Service:** Sends a confirmation of renewal to the customer.
    - **Document Management Service:** Updates the stored policy documentation with new renewal details.
  </Accordion>
  
  <Accordion title="Use Cases">
    - **Billing Update:** Adjusts the billing schedule to reflect the renewed policy.
    - **Customer Notification:** Notifies the customer of their successful renewal.
    - **Document Update:** Ensures that policy records are updated with the latest renewal information.
  </Accordion>
</AccordionGroup>

## Event Flow

1. **Trigger:** The event is triggered upon successful renewal of a policy.
2. **Payload Propagation:** The event payload is consumed by various services for further processing.
3. **Follow-Up Actions:** Subsequent actions include billing updates, customer notifications, and document management.

---

The **PolicyRenewedEvent** is critical for maintaining up-to-date records and ensuring smooth operations following a policy renewal.
