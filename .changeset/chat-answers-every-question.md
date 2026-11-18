---
'@eventcatalog/core': patch
---

fix(core): the assistant now always answers, even when a question needs more lookups than it's allowed. Before, it could stop with no reply, most often with GPT-5. It also uses fewer tokens and model calls:

- follow-up questions are suggested by one small call with just the question and answer, after the answer. Before, the model had to call a tool for them, which cost a model call per answer and often left it suggesting questions instead of answering
- links to channels and other resources in a diagram work: the diagram tool gives each resource's docs link, rather than the model building one from Mermaid ids
- answers about how things connect (who produces and consumes a message, what a change affects, the steps of a flow) include a small diagram, drawn in the chat and opened full size with a click
- answers are easier to read: clearer spacing, lighter tables and links, code blocks in one box, and diagrams in EventCatalog's colours that stay readable in the side panel
- answers appear word by word, as they're written. With Anthropic models, an answer written after a lookup arrives all at once, so before it appeared in one go
- answers no longer show which tools were used ("Used getResources +2 more") under the question
- text written before a lookup (e.g. "Let me check the catalog.") no longer runs into the answer
- looking up who produces or consumes a message returns a short summary rather than whole catalog entries, and the producers lookup no longer returns only producers under a name that promised both
- it can now say who owns something and how to contact them, what a change to a message affects and which teams to talk to, and what a domain's business terms mean (the `findResourcesByOwner`, `getTeam`, `analyzeChangeImpact` and `explainUbiquitousLanguageTerms` tools the MCP server already had)
- it can search resources by name and page through big collections, and when an id isn't found (e.g. "OMS") it's told which resources were probably meant (also in the MCP server)
- the instructions are cached by Anthropic models, and the page the user is on comes last so other providers can cache the rest
- `topP`, `topK`, `frequencyPenalty`, `presencePenalty` and `maxTokens` in `eventcatalog.chat.js`'s `configuration` are now passed to the model, as the docs describe. Settings you don't set use your model provider's defaults: a temperature is no longer sent unless you set one (it was 0.4, or 0.7), since reasoning models don't take one. If you set a small `maxTokens`, answers can now be cut short, and reasoning models can run out before writing anything
