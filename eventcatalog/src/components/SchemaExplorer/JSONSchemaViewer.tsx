import { useState, useEffect, useRef, useMemo } from 'react';

interface JSONSchemaViewerProps {
  schema: any;
  title?: string;
  maxHeight?: string;
  expand?: boolean | string;
  search?: boolean | string;
  id?: string;
  onOpenFullscreen?: () => void;
}

interface SchemaPropertyProps {
  name: string;
  details: any;
  isRequired: boolean;
  level: number;
  isListItem?: boolean;
  expand: boolean;
}

// Helper function to count properties recursively
function countProperties(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;

  let count = 0;
  if (obj.properties) {
    count += Object.keys(obj.properties).length;
    Object.values(obj.properties).forEach((prop: any) => {
      count += countProperties(prop);
    });
  }
  if (obj.items) {
    count += countProperties(obj.items);
  }
  if (obj._isRootArrayItem && obj._rootArraySchema?.items) {
    // Don't double count
  }
  return count;
}

// Schema processing functions
function mergeAllOfSchemas(schemaWithProcessor: any): any {
  const { processSchema: processor, ...schema } = schemaWithProcessor;
  if (!schema.allOf) return schema;

  const mergedSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
    description?: string;
    [key: string]: any;
  } = {
    type: schema.type || 'object',
    properties: {},
    required: [],
    description: schema.description,
  };

  // Copy base schema properties first (excluding allOf)
  Object.keys(schema).forEach((key) => {
    if (key !== 'allOf' && key !== 'properties' && key !== 'required' && key !== 'description') {
      mergedSchema[key] = schema[key];
    }
  });

  // Copy base properties if they exist
  if (schema.properties) {
    mergedSchema.properties = { ...schema.properties };
  }
  if (schema.required) {
    mergedSchema.required = [...schema.required];
  }

  schema.allOf.forEach((subSchema: any) => {
    const processedSubSchema = processor ? processor(subSchema) : subSchema;

    if (processedSubSchema.properties) {
      mergedSchema.properties = {
        ...mergedSchema.properties,
        ...processedSubSchema.properties,
      };
    }
    if (processedSubSchema.required) {
      mergedSchema.required = [...new Set([...mergedSchema.required, ...processedSubSchema.required])];
    }
    if (processedSubSchema.description && !mergedSchema.description) {
      mergedSchema.description = processedSubSchema.description;
    }

    Object.keys(processedSubSchema).forEach((key) => {
      if (key !== 'properties' && key !== 'required' && key !== 'description' && key !== 'type') {
        if (!mergedSchema[key]) {
          mergedSchema[key] = processedSubSchema[key];
        }
      }
    });
  });

  return mergedSchema;
}

function processSchema(schema: any, rootSchema?: any): any {
  if (!schema) return schema;

  const root = rootSchema || schema;

  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref;
    let resolvedSchema = null;
    let defName = '';

    // Try draft-7 style first: #/definitions/
    if (refPath.startsWith('#/definitions/')) {
      defName = refPath.replace('#/definitions/', '');
      if (root.definitions && root.definitions[defName]) {
        resolvedSchema = root.definitions[defName];
      }
    }
    // Try 2020-12 style: #/$defs/
    else if (refPath.startsWith('#/$defs/')) {
      defName = refPath.replace('#/$defs/', '');
      if (root.$defs && root.$defs[defName]) {
        resolvedSchema = root.$defs[defName];
      }
    }
    // Try other common patterns
    else if (refPath.startsWith('#/components/schemas/')) {
      defName = refPath.replace('#/components/schemas/', '');
      if (root.components && root.components.schemas && root.components.schemas[defName]) {
        resolvedSchema = root.components.schemas[defName];
      }
    }

    if (resolvedSchema) {
      const processedSchema = processSchema(resolvedSchema, root);
      return {
        ...processedSchema,
        _refPath: refPath,
        _refName: defName,
        _originalRef: schema.$ref,
      };
    }

    return {
      type: 'string',
      description: `Reference to ${refPath} (definition not found in root schema)`,
      title: defName || refPath.split('/').pop(),
      _refPath: refPath,
      _refName: defName,
      _refNotFound: true,
    };
  }

  if (schema.allOf) {
    return mergeAllOfSchemas({ ...schema, processSchema: (s: any) => processSchema(s, root) });
  }

  if (schema.oneOf) {
    const processedVariants = schema.oneOf.map((variant: any) => {
      const processedVariant = processSchema(variant, root);
      return {
        title: processedVariant.title || variant.title || 'Unnamed Variant',
        required: processedVariant.required || variant.required || [],
        properties: processedVariant.properties || {},
        ...processedVariant,
      };
    });

    const allProperties: Record<string, any> = {};
    processedVariants.forEach((variant: any) => {
      if (variant.properties) {
        Object.assign(allProperties, variant.properties);
      }
    });

    return {
      ...schema,
      type: schema.type || 'object',
      properties: {
        ...(schema.properties || {}),
        ...allProperties,
      },
      variants: processedVariants,
    };
  }

  // Process nested schemas in properties
  if (schema.properties) {
    const processedProperties: Record<string, any> = {};
    Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
      processedProperties[key] = processSchema(prop, root);
    });
    schema = { ...schema, properties: processedProperties };
  }

  // Process array items
  if (schema.type === 'array' && schema.items) {
    schema = { ...schema, items: processSchema(schema.items, root) };
  }

  return schema;
}

// SchemaProperty component
const SchemaProperty = ({ name, details, isRequired, level, isListItem = false, expand }: SchemaPropertyProps) => {
  const [isExpanded, setIsExpanded] = useState(expand);
  const contentId = useRef(`prop-${name}-${level}-${Math.random().toString(36).substring(2, 7)}`).current;

  useEffect(() => {
    setIsExpanded(expand);
  }, [expand]);

  const hasNestedProperties = details.type === 'object' && details.properties && Object.keys(details.properties).length > 0;
  const hasArrayItems = details.type === 'array' && details.items;
  const hasArrayItemProperties =
    hasArrayItems &&
    ((details.items.type === 'object' && details.items.properties) ||
      details.items.allOf ||
      details.items.oneOf ||
      details.items.$ref);
  const isCollapsible = hasNestedProperties || hasArrayItemProperties;

  const indentationClass = `pl-${level * 3}`;

  return (
    <div className={`property-container mb-1.5 border-l border-gray-100 relative ${indentationClass}`}>
      <div className="flex items-start space-x-1.5">
        {isCollapsible ? (
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={contentId}
            onClick={() => setIsExpanded(!isExpanded)}
            className="property-toggle text-gray-500 hover:text-gray-700 pt-0.5 focus:outline-none w-3 text-center flex-shrink-0"
          >
            <span className={`icon-collapsed font-mono text-xs ${isExpanded ? 'hidden' : ''}`}>&gt;</span>
            <span className={`icon-expanded font-mono text-xs ${!isExpanded ? 'hidden' : ''}`}>v</span>
          </button>
        ) : (
          <div className="w-3 h-4 flex-shrink-0" />
        )}

        <div className="flex-grow">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-semibold text-gray-800 text-sm">{name}</span>
              <span className="ml-1.5 text-purple-600 font-mono text-xs">
                {details.type}
                {details.type === 'array' && details.items?.type ? `[${details.items.type}]` : ''}
                {details.format ? `<${details.format}>` : ''}
                {details._refPath && <span className="text-blue-600 ml-1">→ {details._refName || details._refPath}</span>}
                {details._refNotFound && <span className="text-red-600 ml-1">❌ ref not found</span>}
                {details.const !== undefined && (
                  <span>
                    constant: <code>{details.const}</code>
                  </span>
                )}
              </span>
            </div>
            {isRequired && <span className="text-red-600 text-xs ml-3 flex-shrink-0">required</span>}
          </div>

          {details.description && <p className="text-gray-500 text-xs mt-0.5">{details.description}</p>}
          {details.title && details.title !== details.description && (
            <p className="text-gray-500 text-xs mt-0.5 italic">Title: {details.title}</p>
          )}

          <div className="text-xs text-gray-500 mt-0.5 space-y-0">
            {details.pattern && (
              <div>
                Match pattern: <code className="bg-gray-100 px-1 rounded text-gray-800 font-thin py-0.5">{details.pattern}</code>
              </div>
            )}
            {details.minimum !== undefined && (
              <div>
                Minimum: <code className="bg-gray-100 px-1 rounded text-gray-800 font-thin py-0.5">{details.minimum}</code>
              </div>
            )}
            {details.maximum !== undefined && (
              <div>
                Maximum: <code className="bg-gray-100 px-1 rounded text-gray-800 font-thin py-0.5">{details.maximum}</code>
              </div>
            )}
            {details.minLength !== undefined && (
              <div>
                Min length: <code className="bg-gray-100 px-1 rounded text-gray-800 font-thin py-0.5">{details.minLength}</code>
              </div>
            )}
            {details.maxLength !== undefined && (
              <div>
                Max length: <code className="bg-gray-100 px-1 rounded text-gray-800 font-thin py-0.5">{details.maxLength}</code>
              </div>
            )}
            {details.enum && (
              <div>
                <span className="text-xs inline-block">Allowed values:</span>
                {details.enum.map((val: any, idx: number) => (
                  <span key={idx} className="text-xs">
                    {' '}
                    <code className="bg-gray-100 px-1 rounded text-gray-800 font-thin py-0.5">{val}</code>
                  </span>
                ))}
              </div>
            )}
          </div>

          {(hasNestedProperties || hasArrayItems) && (
            <div id={contentId} className={`nested-content mt-1 ${isCollapsible && !isExpanded ? 'hidden' : ''}`}>
              {hasNestedProperties &&
                details.properties &&
                Object.entries(details.properties).map(([nestedName, nestedDetails]: [string, any]) => (
                  <SchemaProperty
                    key={nestedName}
                    name={nestedName}
                    details={nestedDetails}
                    isRequired={details.required?.includes(nestedName) ?? false}
                    level={level + 1}
                    expand={expand}
                  />
                ))}

              {hasArrayItemProperties && (
                <div className="mt-1 border-l border-dashed border-gray-400 pl-3 ml-1.5">
                  <span className="text-xs italic text-gray-500 block mb-1">Item Details:</span>
                  {details.items.properties &&
                    Object.entries(details.items.properties).map(([itemPropName, itemPropDetails]: [string, any]) => (
                      <SchemaProperty
                        key={itemPropName}
                        name={itemPropName}
                        details={itemPropDetails}
                        isRequired={details.items.required?.includes(itemPropName) ?? false}
                        level={level + 1}
                        isListItem={true}
                        expand={expand}
                      />
                    ))}
                  {(details.items.allOf || details.items.oneOf || details.items.$ref) && !details.items.properties && (
                    <div className="text-xs text-gray-500 mt-1">
                      Complex array item schema detected. The properties should be processed by the parent SchemaViewer.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main JSONSchemaViewer component
export default function JSONSchemaViewer({
  schema,
  title,
  maxHeight,
  expand = false,
  search = true,
  id,
  onOpenFullscreen,
}: JSONSchemaViewerProps) {
  // Convert string props to booleans (MDX passes strings)
  const expandBool = expand === true || expand === 'true';
  const searchBool = search !== false && search !== 'false';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(expandBool);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [currentMatches, setCurrentMatches] = useState<HTMLElement[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const propertiesContainerRef = useRef<HTMLDivElement>(null);

  const processedSchema = useMemo(() => processSchema(schema), [schema]);

  // Handle root-level array schemas
  const { displaySchema, isRootArray } = useMemo(() => {
    let display = processedSchema;
    let isArray = false;

    if (processedSchema.type === 'array' && processedSchema.items) {
      isArray = true;
      if (processedSchema.items.type === 'object' && processedSchema.items.properties) {
        display = {
          ...processedSchema.items,
          description: processedSchema.description || processedSchema.items.description,
          _isRootArrayItem: true,
          _rootArraySchema: processedSchema,
        };
      } else if (processedSchema.items.allOf || processedSchema.items.oneOf || processedSchema.items.$ref) {
        display = {
          ...processSchema(processedSchema.items),
          description: processedSchema.description || processedSchema.items.description,
          _isRootArrayItem: true,
          _rootArraySchema: processedSchema,
        };
      }
    }

    return { displaySchema: display, isRootArray: isArray };
  }, [processedSchema]);

  const { description, properties, required = [], variants } = displaySchema;
  const totalProperties = useMemo(() => countProperties(displaySchema), [displaySchema]);

  // Search functionality
  useEffect(() => {
    if (!propertiesContainerRef.current) return;

    const propertyContainers = propertiesContainerRef.current.querySelectorAll('.property-container');
    const matches: HTMLElement[] = [];

    if (searchQuery === '') {
      // Reset search
      propertyContainers.forEach((container) => {
        container.classList.remove('search-match', 'search-no-match', 'search-current-match', 'search-dimmed');
        const nameEl = container.querySelector('.font-semibold');
        if (nameEl) {
          nameEl.innerHTML = nameEl.textContent || '';
        }
      });
      setCurrentMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const query = searchQuery.toLowerCase().trim();

    propertyContainers.forEach((container) => {
      const nameEl = container.querySelector('.font-semibold');
      if (!nameEl) return;

      const propName = (nameEl.textContent || '').toLowerCase();

      if (propName.includes(query)) {
        container.classList.add('search-match');
        container.classList.remove('search-dimmed');
        matches.push(container as HTMLElement);

        // Highlight the search term
        const regex = new RegExp(`(${query})`, 'gi');
        nameEl.innerHTML = (nameEl.textContent || '').replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');

        // Expand parent containers and remove dimming from them
        let parent = container.parentElement;
        while (parent && parent !== propertiesContainerRef.current) {
          if (parent.classList.contains('nested-content') && parent.classList.contains('hidden')) {
            const parentPropertyContainer = parent.closest('.property-container');
            if (parentPropertyContainer) {
              const toggleBtn = parentPropertyContainer.querySelector('.property-toggle');
              if (toggleBtn && toggleBtn.getAttribute('aria-expanded') === 'false') {
                (toggleBtn as HTMLButtonElement).click();
              }
            }
          }
          // Remove dimming from parent property containers so they're fully visible
          if (parent.classList.contains('property-container')) {
            parent.classList.remove('search-dimmed');
          }
          parent = parent.parentElement;
        }
      } else {
        container.classList.remove('search-match', 'search-current-match');
        container.classList.add('search-dimmed');
        nameEl.innerHTML = nameEl.textContent || '';
      }
    });

    setCurrentMatches(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchQuery]);

  // Update match highlighting
  useEffect(() => {
    currentMatches.forEach((match, index) => {
      if (index === currentMatchIndex) {
        match.classList.add('search-current-match');
      } else {
        match.classList.remove('search-current-match');
      }
    });

    if (currentMatchIndex >= 0 && currentMatches[currentMatchIndex]) {
      currentMatches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatchIndex, currentMatches]);

  const handleExpandAll = () => {
    setExpandAll(true);
  };

  const handleCollapseAll = () => {
    setExpandAll(false);
  };

  const handlePrevMatch = () => {
    if (currentMatchIndex > 0) {
      setCurrentMatchIndex(currentMatchIndex - 1);
    }
  };

  const handleNextMatch = () => {
    if (currentMatchIndex < currentMatches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    }
  };

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 p-8">
        <p className="text-sm">Unable to parse JSON schema</p>
      </div>
    );
  }

  const containerStyle = maxHeight
    ? {
        maxHeight: maxHeight.includes('px') ? maxHeight : `${maxHeight}px`,
        minHeight: '15em',
      }
    : {};

  // Use h-full when no maxHeight (SchemaExplorer context), otherwise size based on content (MDX context)
  const heightClass = maxHeight ? '' : 'h-full';
  const overflowClass = maxHeight ? 'overflow-hidden' : '';

  return (
    <div
      id={id}
      className={`${heightClass} ${overflowClass} flex flex-col bg-white border border-gray-100 rounded-md shadow-sm`}
      style={containerStyle}
    >
      {/* Toolbar */}
      {searchBool && (
        <div className="flex-shrink-0 bg-white pt-4 px-4 mb-4 pb-3 border-b border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties..."
                className="w-full px-3 py-1.5 pr-20 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handlePrevMatch();
                    } else {
                      handleNextMatch();
                    }
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={handlePrevMatch}
                  disabled={currentMatches.length === 0 || currentMatchIndex <= 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous match"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextMatch}
                  disabled={currentMatches.length === 0 || currentMatchIndex >= currentMatches.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next match"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onOpenFullscreen && (
                <button
                  onClick={onOpenFullscreen}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  title="Open in fullscreen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 inline-block"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={handleExpandAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Collapse All
              </button>
              <div className="text-xs text-gray-500">
                {totalProperties} {totalProperties === 1 ? 'property' : 'properties'}
              </div>
            </div>
          </div>
          {searchQuery && (
            <div className="mt-2 text-xs text-gray-600">
              {currentMatches.length > 0
                ? `${currentMatchIndex + 1} of ${currentMatches.length} ${currentMatches.length === 1 ? 'match' : 'matches'}`
                : 'No properties found'}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        {isRootArray && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 font-medium text-sm">Array Schema</span>
              <span className="text-blue-500 font-mono text-xs">array[object]</span>
            </div>
            <p className="text-blue-700 text-xs mt-1">
              This schema defines an array of objects. Each item in the array has the properties shown below.
            </p>
          </div>
        )}
        {description && <p className="text-gray-600 text-xs mb-5">{description}</p>}

        {variants && (
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">(one of)</span>
              <select
                value={selectedVariantIndex}
                onChange={(e) => setSelectedVariantIndex(parseInt(e.target.value))}
                className="form-select text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                {variants.map((variant: any, index: number) => (
                  <option key={index} value={index}>
                    {variant.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {properties ? (
          <div ref={propertiesContainerRef}>
            {Object.entries(properties).map(([name, details]: [string, any]) => (
              <SchemaProperty
                key={name}
                name={name}
                details={details}
                isRequired={
                  variants ? variants[selectedVariantIndex]?.required?.includes(name) || false : required.includes(name)
                }
                level={0}
                expand={expandAll}
              />
            ))}
          </div>
        ) : !isRootArray ? (
          <p className="text-gray-500 text-sm">Schema does not contain any properties.</p>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm">
              <p>
                This array contains items of type:{' '}
                <span className="font-mono text-blue-600">{processedSchema.items?.type || 'unknown'}</span>
              </p>
              {processedSchema.items?.description && (
                <p className="text-xs mt-2 text-gray-600">{processedSchema.items.description}</p>
              )}
            </div>
          </div>
        )}

        {searchQuery && currentMatches.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p>No properties match your search</p>
              <p className="text-xs mt-1">Try a different search term or clear the search to see all properties</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .search-dimmed {
          opacity: 0.4;
          transition: opacity 0.2s ease;
        }

        .search-match {
          opacity: 1;
          transition: opacity 0.2s ease;
        }

        .search-current-match {
          background-color: rgba(59, 130, 246, 0.1);
          border-left: 3px solid #3b82f6;
          padding-left: 8px;
          margin-left: -11px;
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}
