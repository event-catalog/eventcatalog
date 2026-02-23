/**
 * DSL-managed frontmatter keys by resource type.
 *
 * Keys listed here are controlled by DSL import and should not be preserved
 * from existing frontmatter when omitted by the incoming DSL.
 */
const MESSAGE_MANAGED_KEYS: ReadonlySet<string> = new Set(['id', 'name', 'version', 'owners', 'deprecated', 'draft', 'summary']);

export const DSL_MANAGED_KEYS_BY_TYPE: Record<string, ReadonlySet<string>> = {
  domain: new Set(['id', 'name', 'version', 'owners', 'deprecated', 'draft', 'summary', 'services', 'domains']),
  event: MESSAGE_MANAGED_KEYS,
  command: MESSAGE_MANAGED_KEYS,
  query: MESSAGE_MANAGED_KEYS,
};
