import { useState, useEffect, lazy, Suspense } from 'react';
import '@scalar/api-reference-react/style.css';
import './_styles.css';

const ApiReferenceReact = lazy(() =>
  import('@scalar/api-reference-react').then((module) => ({ default: module.ApiReferenceReact }))
);

const OpenAPISpec = ({ spec }: { spec: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });

  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const theme = document.documentElement.getAttribute('data-theme');
          setIsDarkMode(theme === 'dark');
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div>
      {!loaded && <div>Loading...</div>}
      <Suspense fallback={<div>Loading OpenAPI reference...</div>}>
        <ApiReferenceReact
          key={isDarkMode ? 'dark' : 'light'}
          configuration={{
            spec: {
              content: spec,
            },
            theme: 'fastify',
            hideClientButton: true,
            onLoaded: () => {
              setLoaded(true);
            },
            forceDarkModeState: isDarkMode ? 'dark' : 'light',
            darkMode: isDarkMode,
            defaultOpenAllTags: true,
            hideDarkModeToggle: true,
            searchHotKey: 'p',
            showSidebar: true,
          }}
        />
      </Suspense>
    </div>
  );
};

export default OpenAPISpec;
