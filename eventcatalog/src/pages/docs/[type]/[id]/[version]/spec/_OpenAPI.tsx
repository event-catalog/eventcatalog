import { useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import './_styles.css';
const OpenAPISpec = ({ spec }: { spec: string }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div>
      {!loaded && <div>Loading...</div>}
      <ApiReferenceReact
        configuration={{
          spec: {
            content: spec,
          },
          theme: 'fastify',
          hideClientButton: true,
          onLoaded: () => {
            setLoaded(true);
          },
          forceDarkModeState: 'light',
          darkMode: false,
          defaultOpenAllTags: true,
          hideDarkModeToggle: true,
          searchHotKey: 'p',
          showSidebar: true,
          customCss: 'bg-red-500',
        }}
      />
    </div>
  );
};

export default OpenAPISpec;
