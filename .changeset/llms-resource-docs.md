---
'@eventcatalog/core': patch
---

feat(llm): include resource docs in llms.txt and expose raw markdown routes

Resource docs (domain/service/event/... `docs/` pages) are now listed in `llms.txt` and `llms-full.txt`, grouped under their parent resource as subheadings with links to the resource's `.mdx` page. New `.md` and `.mdx` route handlers at `/docs/[type]/[id]/[version]/[docType]/[docId].mdx` expose the raw markdown so LLMs can fetch resource doc content directly.
