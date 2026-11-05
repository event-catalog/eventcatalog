---
'@eventcatalog/core': minor
---

feat(core): give agents the ubiquitous language of the whole organization. The new `/docs/llm/ubiquitous-language.txt` lists every domain's and subdomain's terms, and puts the terms defined in more than one domain together. The `explainUbiquitousLanguageTerms` MCP tool can now find one term across every domain or return the whole glossary, and returns each term's id, summary and long description.

Fixes the MCP tool leaving out the terms of subdomains. Fixes `llms.txt` running resources together on one line, linking to the wrong page for domains with a hyphen in their id, and printing `undefined` for terms with no summary. Fixes the stray `}` after each message link in `schemas.txt`.
