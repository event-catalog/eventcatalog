---
id: claims-submission-service
name: Claims Submission Service
version: 0.0.1
summary: |
  The Claims Submission Service allows customers to submit insurance claims, providing a user-friendly interface for entering claim details and uploading necessary documentation. It initiates the claims processing workflow within SunnyDay Insurance.
receives:
  - id: claim-submitted-command
    version: 0.0.1
  - id: customer-details-updated
    version: 0.0.1
sends:
  - id: claim-received-event
    version: 0.0.1
  - id: claim-submission-failed-event
    version: 0.0.1
repository:
  language: JavaScript
  url: https://github.com/sunnydayinsurance/claims-submission-service
---

## Overview

The **Claims Submission Service** is the entry point for customers to submit their insurance claims. This service captures all necessary details, validates the information, and initiates the claims processing workflow. It plays a critical role in ensuring that claims are handled efficiently and that customers have a smooth experience.

<AccordionGroup>
  <Accordion title="Key Functions">
    - **Data Capture:** Collects all required claim details from customers, including personal information, incident descriptions, and supporting documents.
    - **Validation:** Ensures that the submitted information is complete and accurate before proceeding with the claim.
    - **Workflow Initiation:** Triggers the claims processing workflow by emitting relevant events to other services.
  </Accordion>

  <Accordion title="Integration with Other Services">
    - **Claims Assessment Service:** Passes validated claim information to the Claims Assessment Service for further processing.
    - **Customer Management Domain:** Verifies customer details and updates the customer service team about the new claim.
  </Accordion>
</AccordionGroup>

## Event-Driven Architecture

This service operates within an event-driven architecture, emitting and consuming several key messages:

### Sends:

#### ClaimReceivedEvent
Emitted when a claim is successfully submitted and validated.

#### ClaimSubmissionFailedEvent
Emitted when there is an issue with submitting or validating the claim.

### Receives:

#### ClaimSubmittedCommand
Triggered when a customer submits a claim, initiating the process.

#### CustomerDetails
