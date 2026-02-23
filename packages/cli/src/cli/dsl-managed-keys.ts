/**
 * DSL-managed frontmatter keys by resource type.
 *
 * Keys listed here are controlled by DSL import and should not be preserved
 * from existing frontmatter when omitted by the incoming DSL.
 */
export const DSL_MANAGED_KEYS_BY_TYPE: Record<string, ReadonlySet<string>> = {
  domain: new Set(['id', 'name', 'version', 'owners', 'schemaPath', 'deprecated', 'draft', 'summary', 'services', 'domains']),
};
