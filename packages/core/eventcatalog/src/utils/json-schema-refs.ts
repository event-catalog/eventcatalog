type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

type ResolveSchemaRefsOptions = {
  baseUrl: string;
  headers?: HeadersInit;
  fetcher?: Fetcher;
  maxDepth?: number;
};

type ResolveContext = Required<Pick<ResolveSchemaRefsOptions, 'baseUrl' | 'fetcher' | 'maxDepth'>> & {
  headers?: HeadersInit;
  cache: Map<string, unknown>;
};

type RefTarget = {
  schema: unknown;
  root: unknown;
  baseUrl: string;
  refKey: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const decodeJsonPointerSegment = (segment: string) => decodeURIComponent(segment).replace(/~1/g, '/').replace(/~0/g, '~');

const resolveJsonPointer = (document: unknown, pointer: string): unknown => {
  if (!pointer || pointer === '#') return document;

  const path = pointer.startsWith('#') ? pointer.slice(1) : pointer;
  if (!path) return document;
  if (!path.startsWith('/')) return undefined;

  return path
    .slice(1)
    .split('/')
    .map(decodeJsonPointerSegment)
    .reduce<unknown>((current, segment) => {
      if (current === undefined || current === null) return undefined;
      if (Array.isArray(current)) return current[Number(segment)];
      if (isObject(current)) return current[segment];
      return undefined;
    }, document);
};

const splitRef = (ref: string, baseUrl: string) => {
  const [urlPart = '', fragmentPart = ''] = ref.split('#');
  const url = urlPart ? new URL(urlPart, baseUrl).toString() : baseUrl;
  return {
    url,
    fragment: `#${fragmentPart}`,
    refKey: `${url}#${fragmentPart}`,
  };
};

const loadRemoteDocument = async (url: string, context: ResolveContext) => {
  if (context.cache.has(url)) return context.cache.get(url);

  const response = await context.fetcher(url, {
    headers: context.headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch referenced schema: ${response.status} ${response.statusText}`);
  }

  const document = await response.json();
  context.cache.set(url, document);
  return document;
};

const resolveRef = async (
  ref: string,
  root: unknown,
  currentBaseUrl: string,
  context: ResolveContext
): Promise<RefTarget | undefined> => {
  const { url, fragment, refKey } = splitRef(ref, currentBaseUrl);
  const isCurrentDocument = url === currentBaseUrl;
  const document = isCurrentDocument ? root : await loadRemoteDocument(url, context);
  const schema = resolveJsonPointer(document, fragment);

  if (schema === undefined) return undefined;

  return {
    schema,
    root: document,
    baseUrl: url,
    refKey,
  };
};

const resolveNode = async (
  node: unknown,
  root: unknown,
  currentBaseUrl: string,
  context: ResolveContext,
  seenRefs: Set<string>,
  depth: number
): Promise<unknown> => {
  if (depth > context.maxDepth) return node;

  if (Array.isArray(node)) {
    return Promise.all(node.map((item) => resolveNode(item, root, currentBaseUrl, context, seenRefs, depth)));
  }

  if (!isObject(node)) return node;

  const ref = typeof node.$ref === 'string' ? node.$ref : undefined;
  if (ref) {
    const target = await resolveRef(ref, root, currentBaseUrl, context);
    if (!target || seenRefs.has(target.refKey)) return { ...node };

    const nextSeenRefs = new Set(seenRefs);
    nextSeenRefs.add(target.refKey);

    const resolvedSchema = await resolveNode(target.schema, target.root, target.baseUrl, context, nextSeenRefs, depth + 1);
    const siblingEntries = Object.entries(node).filter(([key]) => key !== '$ref');
    const resolvedSiblings = Object.fromEntries(
      await Promise.all(
        siblingEntries.map(async ([key, value]) => [
          key,
          await resolveNode(value, root, currentBaseUrl, context, seenRefs, depth),
        ])
      )
    );

    if (isObject(resolvedSchema)) {
      return {
        ...resolvedSchema,
        ...resolvedSiblings,
      };
    }

    return Object.keys(resolvedSiblings).length > 0 ? resolvedSiblings : resolvedSchema;
  }

  return Object.fromEntries(
    await Promise.all(
      Object.entries(node).map(async ([key, value]) => [
        key,
        await resolveNode(value, root, currentBaseUrl, context, seenRefs, depth),
      ])
    )
  );
};

export const resolveSchemaRefs = async (schema: unknown, options: ResolveSchemaRefsOptions): Promise<unknown> => {
  const context: ResolveContext = {
    baseUrl: options.baseUrl,
    headers: options.headers,
    fetcher: options.fetcher ?? fetch,
    maxDepth: options.maxDepth ?? 25,
    cache: new Map([[options.baseUrl, schema]]),
  };

  return resolveNode(schema, schema, options.baseUrl, context, new Set(), 0);
};
