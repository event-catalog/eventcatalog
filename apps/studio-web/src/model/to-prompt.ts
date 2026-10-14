/**
 * The prompt that turns a diagram into a real EventCatalog: the user copies it into their coding agent, which
 * creates the catalog with the EventCatalog skills (https://github.com/event-catalog/skills).
 */
import { type Model } from '@eventcatalog/visualiser/model';

export const SKILLS_REPO = 'event-catalog/skills';

// Only what the catalog needs, without empty fields, to keep the prompt short
const compact = (model: Model) =>
  JSON.stringify(
    {
      title: model.title,
      resources: model.resources.map((r) => Object.fromEntries(Object.entries(r).filter(([, value]) => value !== undefined && value !== ''))),
      relations: model.relations.map((r) => Object.fromEntries(Object.entries(r).filter(([, value]) => value !== undefined && value !== false))),
      ...(model.notes?.length && { notes: model.notes }),
      ...(model.hotspots?.length && { hotspots: model.hotspots.map(({ severity, title, description, resource }) => ({ severity, title, description, resource })) }),
    },
    null,
    2
  );

export function toCatalogPrompt(model: Model) {
  return `Create a new EventCatalog (https://eventcatalog.dev) that documents this architecture: "${model.title}".

1. If you don't have the EventCatalog skills, install them: \`npx skills add ${SKILLS_REPO}\`
2. Ask me whether to add this to an existing catalog. If not, create one: \`npx @eventcatalog/create-eventcatalog@latest my-eventcatalog\`
3. Use the catalog-documentation-creator skill to document every resource and relation below:
   - domains (subdomains sit in their parent domain) and the systems in them
   - services, in their system or domain, with the messages they send and receive
   - events, commands and queries, and the channels they go through (routes-through)
   - data stores (type "container"), and which services read from or write to them
4. Keep the ids and names. Add each resource's evidence (where it was found in the code or specs) to its page. Relations marked "inferred": true were guessed: document them, but flag them for me to confirm.
5. Add the notes to the pages of the resources they're about, and the hotspots too, as callouts (critical and warning as warnings, info as info), so readers see them.
6. Start the catalog (\`npm run dev\`) and tell me where to open it.

The architecture, as JSON (EventCatalog's vocabulary, from the EventCatalog MCP server):

\`\`\`json
${compact(model)}
\`\`\`
`;
}
