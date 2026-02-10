import { findAndReplace } from 'mdast-util-find-and-replace';

/**
 * Remark plugin that transforms [[type|Name]] or [[Name]] syntax into ResourceRef MDX components.
 *
 * Supported patterns:
 * - [[entity|Order]] -> <ResourceRef type="entity">Order</ResourceRef>
 * - [[service|OrderService@1.0.0]] -> <ResourceRef type="service" version="1.0.0">OrderService</ResourceRef>
 * - [[diagram|target-architecture]] -> <ResourceRef type="diagram">target-architecture</ResourceRef>
 * - [[Order]] -> <ResourceRef type="entity">Order</ResourceRef> (defaults to entity)
 * - [[Order@0.0.1]] -> <ResourceRef type="entity" version="0.0.1">Order</ResourceRef>
 */
export function remarkResourceRef() {
  return function (tree: any) {
    // First pass: match [[type|Name]] or [[type|Name@version]] pattern
    findAndReplace(tree, [
      /\[\[([a-z]+)\|([\w-]+)(?:@([\d.]+))?\]\]/g,
      // @ts-ignore: Types are complex but it works
      function (_match: string, type: string, resourceId: string, version?: string) {
        const attributes: any[] = [{ type: 'mdxJsxAttribute', name: 'type', value: type }];
        if (version) {
          attributes.push({ type: 'mdxJsxAttribute', name: 'version', value: version });
        }
        return {
          type: 'mdxJsxTextElement',
          name: 'ResourceRef',
          attributes,
          children: [{ type: 'text', value: resourceId }],
        };
      },
    ]);

    // Second pass: match [[Name]] or [[Name@version]] pattern (defaults to entity)
    findAndReplace(tree, [
      /\[\[([\w-]+)(?:@([\d.]+))?\]\]/g,
      // @ts-ignore: Types are complex but it works
      function (_match: string, resourceId: string, version?: string) {
        const attributes: any[] = [{ type: 'mdxJsxAttribute', name: 'type', value: 'entity' }];
        if (version) {
          attributes.push({ type: 'mdxJsxAttribute', name: 'version', value: version });
        }
        return {
          type: 'mdxJsxTextElement',
          name: 'ResourceRef',
          attributes,
          children: [{ type: 'text', value: resourceId }],
        };
      },
    ]);
  };
}
