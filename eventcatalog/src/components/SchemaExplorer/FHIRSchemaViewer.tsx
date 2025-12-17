import path from 'path';
import React, { useMemo } from 'react';

interface FHIRSchemaViewerProps {
  structureDefinition: any;
  title?: string;
}

interface FhirElementNode {
  key: string;
  id: string;
  path: string;
  name: string;
  min: number;
  max: string;
  types: string[];
  sliceName?: string;

  short?: string;
  definition?: string;
  comment?: string;
  alias?: string[];
  binding?: {
    strength?: string;
    valueSet?: string;
  };
  mapping?: {
    identity: string;
    map: string;
  }[];

  children: FhirElementNode[];
}
/**
 * Take snapshot.element[] and transform the flat list
 * into a nested tree based on the element paths.
 */
function buildElementTree(elements: any[]): FhirElementNode[] {
  const roots: FhirElementNode[] = [];
  const stack: { depth: number; node: FhirElementNode }[] = [];

  elements.forEach((el: any, index: number) => {
    const pathParts = el.path.split('.');
    const depth = pathParts.length;

    const node: FhirElementNode = {
      key: `${index}`,
      id: el.id,
      path: el.path,
      name: el.sliceName ?? pathParts[pathParts.length - 1],
      min: el.min ?? 0,
      max: el.max ?? '1',
      types: Array.isArray(el.type) ? el.type.map((t: any) => t.code) : [],
      sliceName: el.sliceName,

      short: el.short,
      definition: el.definition,
      comment: el.comment,
      alias: el.alias,
      binding: el.binding
        ? {
            strength: el.binding.strength,
            valueSet: el.binding.valueSet,
          }
        : undefined,
      mapping: el.mapping,

      children: [],
    };

    // Pop stack until we find the correct parent depth
    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ depth, node });
  });

  return roots;
}
/**
 * Simple recursive UI renderer for FHIR element tree.
 */
import { useState } from 'react';

function ElementDetails({ node }: { node: FhirElementNode }) {
  return (
    <div
      style={{
        marginTop: 6,
        padding: '10px 14px',
        background: '#f9fafb',
        borderLeft: '3px solid #3b82f6',
        fontSize: '0.85em',
        borderRadius: 4,
      }}
    >
      {node.short && (
        <div>
          <strong>Short description</strong>
          <br />
          {node.short}
        </div>
      )}

      {node.alias?.length && (
        <div style={{ marginTop: 6 }}>
          <strong>Alternate names</strong>
          <br />
          {node.alias.join(', ')}
        </div>
      )}

      {node.definition && (
        <div style={{ marginTop: 6 }}>
          <strong>Definition</strong>
          <br />
          {node.definition}
        </div>
      )}

      {node.comment && (
        <div style={{ marginTop: 6 }}>
          <strong>Comments</strong>
          <br />
          {node.comment}
        </div>
      )}

      {node.binding && (
        <div style={{ marginTop: 6 }}>
          <strong>Binding</strong>
          <br />
          {node.binding.strength} —{' '}
          <a href={node.binding.valueSet} target="_blank" rel="noreferrer">
            {node.binding.valueSet}
          </a>
        </div>
      )}

      {node.mapping?.length && (
        <div style={{ marginTop: 6 }}>
          <strong>Mappings</strong>
          <ul style={{ marginLeft: 16 }}>
            {node.mapping.map((m, i) => (
              <li key={i}>
                <strong>{m.identity}:</strong> {m.map}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ElementNodeView({ node, depth }: { node: FhirElementNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [selected, setSelected] = useState(false);

  const hasChildren = node.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          lineHeight: '1.6em',
          padding: '2px 4px',
          borderRadius: 4,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f3f4f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        onClick={(e) => {
          e.stopPropagation(); // 🔑 critical
          setSelected(!selected);
        }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{ width: 14, display: 'inline-block', fontSize: 12 }}
          >
            {expanded ? '▼' : '▶'}
          </span>
        ) : (
          <span style={{ width: 14 }} />
        )}

        <span style={{ fontWeight: depth === 0 ? 'bold' : 'normal' }}>{node.name}</span>

        <span style={{ opacity: 0.6, marginLeft: 6 }}>
          ({node.min}..{node.max})
        </span>

        {node.types.length > 0 && (
          <span style={{ marginLeft: 8 }}>
            :
            {node.types.map((t, i) => (
              <a
                key={t}
                href={`/fhir/datatypes/${t}`}
                style={{
                  marginLeft: 4,
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontSize: '0.9em',
                }}
              >
                {t}
                {i < node.types.length - 1 ? ' |' : ''}
              </a>
            ))}
          </span>
        )}
      </div>

      {selected && <ElementDetails node={node} />}

      {expanded && node.children.map((child) => <ElementNodeView key={child.key} node={child} depth={depth + 1} />)}
    </div>
  );
}
/**
 * Main viewer component.
 */
export default function FHIRSchemaViewer({ structureDefinition, title }: FHIRSchemaViewerProps) {
  if (!structureDefinition) {
    return <div>No StructureDefinition provided.</div>;
  }

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{title ?? structureDefinition.title ?? structureDefinition.name}</h3>

      <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>{structureDefinition.description}</div>

      {/* Render root elements */}
      {buildElementTree(structureDefinition.snapshot.element).map((rootNode) => (
        <ElementNodeView key={rootNode.path} node={rootNode} depth={0} />
      ))}
    </div>
  );
}
