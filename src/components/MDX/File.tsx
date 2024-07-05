import fs from 'fs';
import path from 'path';

const File = ({ file, catalog, title }: any) => {
  try {
    const exists = fs.existsSync(path.join(catalog.filePath, file));

    if (exists) {
      const text = fs.readFileSync(path.join(catalog.filePath, file), 'utf-8');
      return (
        <div className="not-prose">
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
      return <div className="italic">Tried to load file from {path.join(catalog.filePath, file)}, but no file can be found</div>;
    }
  } catch (error) {
    console.log('Failed to load file', error);
    return null;
  }
};

export default File;
