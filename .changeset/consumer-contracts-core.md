---
'@eventcatalog/core': minor
---

feat(core): add consumer contracts. A service, agent or domain can attach a contract file (such as a Pact) to a message it receives (`receives[].contract` with `path`, `name` and `type`), saying what it relies on from that message. Messages list their consumers' contracts in a new "Consumer Contracts" sidebar section under Consumers, and each contract has its own page with a diagram of the producers, the message and the consumer above the file.

For a Pact file (Pact Specification versions 2 to 4), the contract page also has a Fields tab: each interaction with what the consumer expects, the provider and the provider states, and the fields it relies on, worked out from the example and matching rules.

The MCP server and AI Chat have a new `getConsumerContracts` tool, to ask for contracts by message or by consumer, and `getConsumersOfMessage` and `analyzeChangeImpact` mention each consumer's contract.

The example catalog has Pact contracts for the consumers of Order Ready For Shipping, and OpenAPI files for the Shipping API and Notification Service.
