import React, { useMemo } from 'react';

import { JsonSchemaViewer } from '@stoplight/json-schema-viewer';
import { injectStyles } from '@stoplight/mosaic';
import styles from './SchemaViewer.module.css';

// Inject Stoplight styles
injectStyles();

type Props = {
  schema: any;
  renderRootTreeLines?: boolean;
  hideExamples?: boolean;
  defaultExpandedDepth?: number;
};

function SchemaViewer({ schema, renderRootTreeLines = false, hideExamples = false, defaultExpandedDepth = 1 }: Props) {
  const JsonSchema = useMemo(() => JSON.parse(schema as string), [schema]);

  return (
    <JsonSchemaViewer
      schema={JsonSchema}
      emptyText="No schema defined"
      defaultExpandedDepth={defaultExpandedDepth}
      // viewMode='standalone'
      renderRootTreeLines={Boolean(renderRootTreeLines)}
      hideExamples={Boolean(hideExamples)}
      className={styles.schemaViewer}
    />
  );
}

export default SchemaViewer;
