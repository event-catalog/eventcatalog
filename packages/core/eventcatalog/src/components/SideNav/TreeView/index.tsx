import { gray } from 'tailwindcss/colors';
import { TreeView } from '@components/TreeView';
import { navigate } from 'astro:transitions/client';
import type { TreeNode as RawTreeNode } from './getTreeView';
import { getIconForCollection } from '@utils/collections/icons';
import { useEffect, useState } from 'react';

type TreeNode = RawTreeNode & { isLabel?: true; isDefaultExpanded?: boolean; isExpanded?: boolean };

function isCurrentNode(node: TreeNode, currentPathname: string) {
  return currentPathname === node.href;
}

function TreeNode({ node }: { node: TreeNode }) {
  const Icon = getIconForCollection(node.type ?? '');
  const [isCurrent, setIsCurrent] = useState(document.location.pathname === node.href);

  useEffect(() => {
    const abortCtrl = new AbortController();
    // prettier-ignore
    document.addEventListener(
      'astro:page-load', 
      () => setIsCurrent(document.location.pathname === node.href), 
      { signal: abortCtrl.signal },
    );
    return () => abortCtrl.abort();
  }, [document, node]);

  return (
    <TreeView.Item
      key={node.id}
      id={node.id}
      current={isCurrent}
      defaultExpanded={node?.isExpanded || node?.isDefaultExpanded}
      onSelect={node?.isLabel || !node?.href ? undefined : () => navigate(node.href!)}
    >
      {!node?.isLabel && (
        <TreeView.LeadingVisual>
          <Icon className="w-3 -ml-1" />
        </TreeView.LeadingVisual>
      )}
      <span
        className={node?.isLabel ? ' capitalize  text-[13px]  text-purple-900 font-extrabold' : 'font-light text-[14px] -ml-0.5'}
      >
        {node.name} {node.isLabel ? `(${node.children.length})` : ''}
      </span>
      {(node.children || []).length > 0 && (
        <TreeView.SubTree>
          {node.children!.map((childNode) => (
            <TreeNode key={childNode.id} node={childNode} />
          ))}
        </TreeView.SubTree>
      )}
    </TreeView.Item>
  );
}

export function SideNavTreeView({ tree }: { tree: TreeNode }) {
  function bubbleUpExpanded(parentNode: TreeNode) {
    if (isCurrentNode(parentNode, document.location.pathname)) return true;
    return (parentNode.isDefaultExpanded = parentNode.children.some(bubbleUpExpanded));
  }
  bubbleUpExpanded(tree);

  return (
    <nav id="resources-tree" className="px-2 py-2">
      <TreeView
        truncate={false}
        style={{
          // @ts-expect-error inline css var
          '--base-size-8': '0.5rem',
          '--base-size-12': '0.75rem',
          '--borderColor-muted': '#fff',
          '--borderRadius-medium': '0.375rem',
          '--borderWidth-thick': '0.125rem',
          '--borderWidth-thin': '0.0625rem',
          '--boxShadow-thick': 'inset 0 0 0 var(--borderWidth-thick)',
          '--control-transparent-bgColor-hover': '#656c7626',
          '--control-transparent-bgColor-selected': '#656c761a',
          // '--fgColor-accent': purple[700],
          '--fgColor-default': gray[600],
          '--fgColor-muted': gray[600],
          '--text-body-size-medium': '0.875rem',
          '--stack-gap-condensed': '0.5rem',
          '--treeViewItem-leadingVisual-iconColor-rest': 'var(--fgColor-muted)',
        }}
      >
        {tree.children.map((n) => (
          <TreeNode key={n.id} node={n} />
        ))}
      </TreeView>
    </nav>
  );
}
