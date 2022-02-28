import React, { useEffect, useMemo, useState } from 'react';

import { JsonSchemaViewer, RowAddonRenderer } from '@stoplight/json-schema-viewer';
import { injectStyles } from '@stoplight/mosaic';
import { useRouter } from 'next/router';
import styles from './SchemaViewer.module.css';

// Inject Stoplight styles
injectStyles();

const targetBase = 'event-definition-';

type Props = {
  schema: any;
  renderRootTreeLines?: boolean;
  hideExamples?: boolean;
  defaultExpandedDepth?: number;
  maxHeight?: number;
};

function SchemaViewer({ schema, maxHeight, renderRootTreeLines = false, hideExamples = false, defaultExpandedDepth = 1 }: Props) {
  const JsonSchema = useMemo(() => JSON.parse(schema as string), [schema]);

  const [initialScrollTo, setInitialScrollTo] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (router.isReady && window.location.hash.startsWith(`#${targetBase}`)) {
      setInitialScrollTo(window.location.hash);
    }
  }, [router.isReady]);

  useEffect(() => {
    if (!initialScrollTo) return;
    const element = document.querySelector(initialScrollTo);
    element.scrollIntoView();
  }, [initialScrollTo]);

  return (
    <JsonSchemaViewer
      key={initialScrollTo}
      schema={JsonSchema}
      emptyText="No schema defined"
      maxHeight={maxHeight}
      defaultExpandedDepth={initialScrollTo ? Infinity : defaultExpandedDepth}
      renderRowAddon={renderRowAddon}
      renderRootTreeLines={renderRootTreeLines}
      hideExamples={hideExamples}
      className={styles.schemaViewer}
    />
  );
}

const renderRowAddon: RowAddonRenderer = ({ schemaNode }) => {
  const segments: string[] = [];
  let node = schemaNode;
  while (node) {
    const segment = node.subpath.slice(-1)[0];
    if (!segment) break;
    segments.unshift(segment);
    node = node.parent;
  }
  const id = `${targetBase}${segments.join('-')}`;

  return (
    <a id={id} href={`#${id}`} aria-hidden="true" className="ml-2">
      #
    </a>
  );
};

export default SchemaViewer;
