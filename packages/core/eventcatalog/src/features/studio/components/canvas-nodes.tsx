import { createContext, memo, useCallback, useContext } from 'react';
import { NodeResizer, type NodeProps, type NodeTypes } from '@xyflow/react';
import { DomainCardNode, Note, nodeComponents, SystemGroupNode, type NoteNode as NoteNodeType } from '@eventcatalog/visualiser';
import { GROUP_TYPES, nodeDefinitions } from '../node-types';

/** How the canvas draws each kind of node: the visualiser's nodes, editable notes and resizable containers */

export type UpdateNodeData = (id: string, updater: (data: Record<string, unknown>) => Record<string, unknown>) => void;

// Notes are edited in place, so their callbacks need to reach the shared design
export const UpdateNodeDataContext = createContext<UpdateNodeData>(() => {});

// Which container something dragged would drop into, to highlight it
export const DropTargetContext = createContext<string | null>(null);

// The visualiser types its node components' props as nodes (Node<Data>) rather than React Flow's NodeProps, so
// they don't type-check as NodeTypes, though that's what React Flow renders them with
const visualiserNodes = nodeComponents as unknown as NodeTypes;
const SystemGroupComponent: NodeTypes[string] = SystemGroupNode;

const NoteNode = memo(function NoteNode(props: NodeProps<NoteNodeType>) {
  const updateNodeData = useContext(UpdateNodeDataContext);
  const onTextChange = useCallback(
    (id: string, text: string) => updateNodeData(id, (data) => ({ ...data, text })),
    [updateNodeData]
  );
  const onColorChange = useCallback(
    (id: string, color: string) => updateNodeData(id, (data) => ({ ...data, color })),
    [updateNodeData]
  );
  return <Note {...props} onTextChange={onTextChange} onColorChange={onColorChange} />;
});

/**
 * A domain or system as a container: resizable when selected, highlighted when something's dragged over it.
 * Like frames in design tools, it's moved and selected by its header, and dragging inside it draws a selection
 * box (its body lets the pointer through to the canvas: see studio.css).
 */
const GroupNode = memo(function GroupNode(props: NodeProps) {
  const isDropTarget = useContext(DropTargetContext) === props.id;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <NodeResizer
        isVisible={props.selected}
        minWidth={240}
        minHeight={160}
        lineClassName="!border-[rgb(var(--ec-accent))]"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !bg-[rgb(var(--ec-card-bg))] !border-[rgb(var(--ec-accent))]"
      />
      <SystemGroupComponent {...props} />
      {/* The header (and the badge on its border) */}
      <div className="ec-group-grip absolute inset-x-0 -top-3 h-[60px] cursor-grab" />
      {(isDropTarget || props.selected) && (
        <div
          className={`pointer-events-none absolute inset-0 rounded-[14px] ${
            isDropTarget
              ? 'ring-4 ring-[rgb(var(--ec-accent)/0.5)] bg-[rgb(var(--ec-accent)/0.05)]'
              : 'ring-2 ring-[rgb(var(--ec-accent)/0.7)]'
          }`}
        />
      )}
    </div>
  );
});

export const nodeTypes: NodeTypes = {
  ...Object.fromEntries(
    nodeDefinitions.map((definition) => [
      definition.type,
      definition.type === 'note' ? NoteNode : visualiserNodes[definition.type],
    ])
  ),
  // Only dropped in from the catalog
  system: visualiserNodes.system,
  'context-domain': DomainCardNode,
  // Domains and systems as containers
  [GROUP_TYPES.domain]: GroupNode,
  [GROUP_TYPES.system]: GroupNode,
};
