import { createContext, memo, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { NodeResizeControl, NodeResizer, ResizeControlVariant, useStoreApi, type NodeProps, type NodeTypes } from '@xyflow/react';
import { diagramNodeComponents, DomainCardNode, memoNode, SystemGroupNode } from '@eventcatalog/visualiser';
import { GROUP_PADDING } from '../grouping';
import { getNodeName, GROUP_TYPES } from '../node-types';

/** How the canvas draws each kind of node: the visualiser's nodes, notes and text written on the canvas, and resizable containers */

export type UpdateNodeData = (id: string, updater: (data: Record<string, unknown>) => Record<string, unknown>) => void;

// Notes are edited in place, so their callbacks need to reach the shared design
export const UpdateNodeDataContext = createContext<UpdateNodeData>(() => {});

// Which container something dragged would drop into, to highlight it
export const DropTargetContext = createContext<string | null>(null);

const SystemGroupComponent: NodeTypes[string] = SystemGroupNode;

/** The handles that set a node's width, on either side (its height follows what's written in it) */
function WidthHandles() {
  return (
    <>
      {/* Horizontal only: otherwise React Flow saves the height too, and it stops growing with what's written */}
      <NodeResizeControl
        position="left"
        variant={ResizeControlVariant.Line}
        resizeDirection="horizontal"
        minWidth={80}
        className="studio-width-handle"
      />
      <NodeResizeControl
        position="right"
        variant={ResizeControlVariant.Line}
        resizeDirection="horizontal"
        minWidth={80}
        className="studio-width-handle"
      />
    </>
  );
}

/**
 * What's written on a note or text, and writing it: Enter starts a new line, Escape or ⌘/Ctrl + Enter (or clicking
 * away) finishes, and it's saved for everyone then
 */
function Writing({
  id,
  text,
  editing,
  onDone,
  placeholder,
  className,
}: {
  id: string;
  text: string;
  editing: boolean;
  onDone: () => void;
  placeholder: string;
  className: string;
}) {
  const updateNodeData = useContext(UpdateNodeDataContext);
  // The box grows with what's written (the node's height follows it)
  const fit = (area: HTMLTextAreaElement) => {
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  };
  if (!editing) return <p className={className}>{text || <span className="opacity-50">{placeholder}</span>}</p>;
  return (
    <textarea
      ref={(area) => {
        if (area) fit(area);
      }}
      autoFocus
      defaultValue={text}
      placeholder={placeholder}
      onFocus={(event) => event.currentTarget.select()}
      onInput={(event) => fit(event.currentTarget)}
      onBlur={(event) => {
        const value = event.currentTarget.value;
        onDone();
        if (value !== text) updateNodeData(id, (current) => ({ ...current, text: value }));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || (event.key === 'Enter' && (event.metaKey || event.ctrlKey))) event.currentTarget.blur();
      }}
      className={`nodrag nopan nowheel block w-full resize-none overflow-hidden bg-transparent outline-none ${className}`}
    />
  );
}

/** A sticky note's colours: soft paper colours, readable in light and dark themes (the names are the visualiser's) */
const NOTE_COLORS: Record<string, { fill: string; border: string }> = {
  yellow: { fill: '#fef9c3', border: '#fde047' },
  blue: { fill: '#dbeafe', border: '#93c5fd' },
  green: { fill: '#dcfce7', border: '#86efac' },
  pink: { fill: '#fce7f3', border: '#f9a8d4' },
  purple: { fill: '#ede9fe', border: '#c4b5fd' },
  gray: { fill: '#f3f4f6', border: '#d1d5db' },
};

/**
 * A sticky note: a few lines on paper, about as wide as a card and as tall as what's on it. Double click it to
 * write; when it's selected, its colour can be changed and its width set.
 */
const StickyNote = memo(function StickyNote({ id, data, selected }: NodeProps) {
  const updateNodeData = useContext(UpdateNodeDataContext);
  const [editing, setEditing] = useState(false);
  const colorName = typeof data.color === 'string' && NOTE_COLORS[data.color] ? data.color : 'yellow';
  const color = NOTE_COLORS[colorName];
  return (
    <div
      className="studio-note"
      style={{ background: color.fill, borderColor: color.border }}
      onDoubleClick={() => setEditing(true)}
    >
      {selected && !editing && (
        <>
          <WidthHandles />
          <div className="nodrag nopan studio-note-colors" role="radiogroup" aria-label="Note colour">
            {Object.entries(NOTE_COLORS).map(([name, { fill, border }]) => (
              <button
                key={name}
                role="radio"
                aria-checked={name === colorName}
                title={name.charAt(0).toUpperCase() + name.slice(1)}
                onClick={() => updateNodeData(id, (current) => ({ ...current, color: name }))}
                className="studio-note-color"
                style={{ background: fill, borderColor: name === colorName ? 'rgb(var(--ec-page-text))' : border }}
              />
            ))}
          </div>
        </>
      )}
      <Writing
        id={id}
        text={String(data.text ?? '')}
        editing={editing}
        onDone={() => setEditing(false)}
        placeholder="Double-click to write a note"
        className="studio-note-body"
      />
    </div>
  );
});

/**
 * Text written straight on the canvas (titles, labels, notes to self): double click it to write. Its width is set
 * with the handles on either side; its height follows what's written.
 */
const TextNode = memo(function TextNode({ id, data, selected }: NodeProps) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="studio-text" onDoubleClick={() => setEditing(true)}>
      {selected && !editing && <WidthHandles />}
      <Writing
        id={id}
        text={String(data.text ?? '')}
        editing={editing}
        onDone={() => setEditing(false)}
        placeholder="Double-click to write"
        className="studio-text-body"
      />
    </div>
  );
});

/** A domain inside another one is a subdomain (badged as one, like the visualiser), unless its data says otherwise */
const useDomainData = ({ type, data, parentId }: Pick<NodeProps, 'type' | 'data' | 'parentId'>) =>
  useMemo(() => {
    const isDomain = type === GROUP_TYPES.domain || type === 'context-domain';
    return isDomain && parentId && data.subdomain === undefined ? { ...data, subdomain: true } : data;
  }, [type, data, parentId]);

/** A domain card, badged as a subdomain when it's in another domain */
const DomainCard = memo(function DomainCard(props: NodeProps) {
  return <DomainCardNode {...props} data={useDomainData(props)} />;
});

/**
 * A domain or system as a container: resizable when selected, highlighted when something's dragged over it.
 * Like frames in design tools, it's moved and selected by its header, and dragging inside it draws a selection
 * box (its body lets the pointer through to the canvas: see studio.css).
 */
const GroupNode = memo(function GroupNode(props: NodeProps) {
  const isDropTarget = useContext(DropTargetContext) === props.id;
  const data = useDomainData(props);
  const store = useStoreApi();
  // Where what's inside has to stay (with room around it and for the header), in the container's parent's
  // coordinates: found when a resize starts, so it can't be resized smaller than what's in it
  const contents = useRef<{ left: number; top: number; right: number; bottom: number } | null>(null);
  const onResizeStart = useCallback(() => {
    const { nodeLookup } = store.getState();
    const container = nodeLookup.get(props.id);
    const children = [...nodeLookup.values()].filter((node) => node.parentId === props.id);
    if (!container || children.length === 0) {
      contents.current = null;
      return;
    }
    const { x, y } = container.position;
    const size = (node: (typeof children)[number]) => ({
      width: node.measured.width ?? node.width ?? 0,
      height: node.measured.height ?? node.height ?? 0,
    });
    const own = size(container);
    // A side already closer in than that (e.g. something placed in the padding) can still move out, just not in
    contents.current = {
      left: Math.max(x + Math.min(...children.map((node) => node.position.x)) - GROUP_PADDING.left, x),
      top: Math.max(y + Math.min(...children.map((node) => node.position.y)) - GROUP_PADDING.top, y),
      right: Math.min(
        x + Math.max(...children.map((node) => node.position.x + size(node).width)) + GROUP_PADDING.right,
        x + own.width
      ),
      bottom: Math.min(
        y + Math.max(...children.map((node) => node.position.y + size(node).height)) + GROUP_PADDING.bottom,
        y + own.height
      ),
    };
  }, [store, props.id]);
  const shouldResize = useCallback(
    (_: unknown, { x, y, width, height }: { x: number; y: number; width: number; height: number }) => {
      const bounds = contents.current;
      return !bounds || (x <= bounds.left && y <= bounds.top && x + width >= bounds.right && y + height >= bounds.bottom);
    },
    []
  );
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <NodeResizer
        isVisible={props.selected}
        onResizeStart={onResizeStart}
        shouldResize={shouldResize}
        minWidth={240}
        minHeight={160}
        lineClassName="!border-[rgb(var(--ec-accent))]"
        handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-2 !bg-[rgb(var(--ec-card-bg))] !border-[rgb(var(--ec-accent))]"
      />
      <SystemGroupComponent {...props} data={data} />
      {/* The header (and the badge on its border) */}
      <div className="ec-group-grip absolute inset-x-0 -top-3 h-[60px] cursor-grab" />
      {isDropTarget ? (
        // What's dragged over it goes in it when it's dropped
        <div className="ec-drop-target">
          <span className="ec-drop-target-label">Drop to add to {getNodeName(props.type, props.data, 'this container')}</span>
        </div>
      ) : (
        props.selected && <div className="ec-group-selected" />
      )}
    </div>
  );
});

const components: NodeTypes = {
  // Everything the visualiser draws, drawn the same (so a diagram's levels look as they do there). It types its
  // components' props as nodes (Node<Data>) rather than React Flow's NodeProps, which they're rendered with.
  ...(diagramNodeComponents as unknown as NodeTypes),
  // Written on the canvas
  note: StickyNote,
  text: TextNode,
  // Actors look like the visualiser's actors on its architecture diagrams
  actor: diagramNodeComponents['context-actor'] as NodeTypes[string],
  'context-domain': DomainCard,
  // Domains and systems as containers
  [GROUP_TYPES.domain]: GroupNode,
  [GROUP_TYPES.system]: GroupNode,
};

// React Flow gives every node its position, which changes on every frame it moves (dragged, in a dragged container,
// or gliding to a layout): like the visualiser's, nodes render again only when something else changes
export const nodeTypes: NodeTypes = Object.fromEntries(
  Object.entries(components).map(([type, component]) => [type, memoNode(component)])
);
