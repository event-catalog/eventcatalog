import React, { useMemo } from "react";

import $RefParser from '@apidevtools/json-schema-ref-parser';
import pkg from 'fhir-react';
const {FhirResource, fhirVersions} = pkg;
interface FHIRSchemaViewerProps {
  structureDefinition: any;
  title?: string;
}

interface FhirElementNode {
  id: string;
  path: string;
  name: string;
  min: number;
  max: string;
  types: string []
  sliceName?: string;
  children: FhirElementNode[];
}

/**
 * Take snapshot.element[] and transform the flat list
 * into a nested tree based on the element paths.
 */
function buildElementTree(elements: any[]): FhirElementNode[] {
  const nodeMap = new Map<string, FhirElementNode>();
  const roots: FhirElementNode[] = [];
  console.log(elements.length);
  // First pass: build nodes
  elements.forEach((el: any) => {
    const path = el.path;
    const parts = path.split(".");
    const name = el.sliceName ?? parts[parts.length - 1];
    const node: FhirElementNode = {
      id: el.id,                 // FHIR ID (with slice names)
      path,                      // hierarchical path
      name,                      // display name
      min: el.min ?? 0,
      max: el.max ?? "1",
      types: Array.isArray(el.type)
        ? el.type.map((t: any) => t.code)
        : [],
      sliceName: el.sliceName,
      children: [],
    };

    nodeMap.set(path, node);
  });

  // Second pass: connect nodes into a tree
  elements.forEach((el: any) => {
    const path = el.path;
    const parts = path.split(".");
    const parentPath = parts.slice(0, -1).join(".");

    const node = nodeMap.get(path);

    if (parentPath && nodeMap.has(parentPath)) {
      nodeMap.get(parentPath)!.children.push(node!);
    } else {
      // no parent => top-level root
      roots.push(node!);
    }
  });

  return roots;
}

/**
 * Simple recursive UI renderer for FHIR element tree.
 */
import { useState } from "react";

function ElementNodeView({ node, depth }: { node: FhirElementNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth === 0); // root expanded by default

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          cursor: hasChildren ? "pointer" : "default",
          lineHeight: "1.5em",
        }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand / collapse triangle */}
        {hasChildren ? (
          <span style={{ width: 14, display: "inline-block", fontSize: 12 }}>
            {expanded ? "▼" : "▶"}
          </span>
        ) : (
          <span style={{ width: 14, display: "inline-block" }} />
        )}

        {/* Element path */}
        <span style={{ fontWeight: depth === 0 ? "bold" : "normal" }}>
          {node.path}
        </span>

        {/* Min/max */}
        <span style={{ opacity: 0.6, marginLeft: 6 }}>
          ({node.min}..{node.max})
        </span>

        {/* Type info */}
        {(node.types?.length ?? 0) > 0 && (
          <span style={{ marginLeft: 8, fontSize: "0.9em", opacity: 0.8 }}>
            : {node.types!.join(" | ")}
          </span>
        )}
      </div>

      {/* Child nodes */}
      {expanded &&
        hasChildren &&
        node.children.map((child) => (
          <ElementNodeView key={child.path} node={child} depth={depth + 1} />
        ))}
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
    <div style={{ padding: "1rem", fontFamily: "Arial" }}>
      <h3 style={{ marginBottom: "0.5rem" }}>
        {title ?? structureDefinition.title ?? structureDefinition.name}
      </h3>

      <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: "1rem" }}>
        {structureDefinition.description}
      </div>

      {/* Render root elements */}
      
    <FhirResource
      fhirResource={structureDefinition}
      fhirVersion={fhirVersions.R4}
    />

    </div>
  );
}
