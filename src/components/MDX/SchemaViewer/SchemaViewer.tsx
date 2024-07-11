import { useEffect, useState } from 'react';

// @ts-ignore
import { JsonSchemaViewer } from '@stoplight/json-schema-viewer';
import styles from './SchemaViewer.module.css';

import '@stoplight/mosaic/styles.css';
import { createPortal } from 'react-dom';

type Props = {
  id: string
  file: string
  renderRootTreeLines?: boolean
  hideExamples?: boolean
  defaultExpandedDepth?: number
  maxHeight?: string
  schema: any
  catalog: any
  title?: string
};

const SchemaViewer = ({
  id,
  maxHeight = "500",
  renderRootTreeLines = true,
  hideExamples = false,
  defaultExpandedDepth = 3,
  catalog,
  title,
  schema,
  file = 'schema.json',
}: Props) => {

    const [elem, setElem] = useState(null);
    useEffect(() => {
      // @ts-ignore
      setElem(document.getElementById(`${id}-SchemaViewer-portal`));
    }, []);

    if (!elem) return null;

    return (
      <div>
        {createPortal(
          <section className="not-prose space-y-2 ">
          {title && <h2 className='text-3xl font-bold'>{title}</h2>}
          <div className="border border-gray-100 p-2 schemaViewer">
            <JsonSchemaViewer
              schema={schema}
              emptyText="No schema defined"
              maxHeight={parseInt(maxHeight, 10)}
              defaultExpandedDepth={defaultExpandedDepth}
              renderRootTreeLines={renderRootTreeLines}
              hideExamples={hideExamples}
              className={styles.schemaViewer}
            />
          </div>
        </section>,
          elem
        )}
      </div>
    );
};

export default SchemaViewer;
