import fs from 'fs';
import path from 'path';

const Schema = ({ file = 'schema.json', catalog, title }: any) => {
  try {
    const exists = fs.existsSync(path.join(catalog.filePath, file));

    if (exists) {
      const text = fs.readFileSync(path.join(catalog.filePath, file), 'utf-8');
      return (
        <div className="not-prose max-w-4xl overflow-x-auto">
          <pre className="expressive-code" data-language="json">
            <figure className="frame has-title">
              <figcaption className="header">
                {title && <span className="title">{title}</span>}
                {!title && <span className="title">{file}</span>}
              </figcaption>
              <pre data-language="js">
                <code>
                  <div className="ec-line">
                    <div className="code">{text}</div>
                  </div>
                </code>
              </pre>
              <div className="copy">
                <button title="Copy to clipboard" data-copied="Copied!" data-code={text}>
                  <div></div>
                </button>
              </div>
            </figure>
          </pre>
        </div>
      );
    } else {
      return (
        <div className="italic">Tried to load schema from {path.join(catalog.filePath, file)}, but no schema can be found</div>
      );
    }
  } catch (error) {
    console.log('Failed to load schema file', error);
    return null;
  }
};

export default Schema;
