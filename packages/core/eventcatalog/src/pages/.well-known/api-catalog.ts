import type { APIRoute } from 'astro';
import yaml from 'js-yaml';
import { getServices, getSpecificationsForService } from '@utils/collections/services';
import { getDomains, getSpecificationsForDomain } from '@utils/collections/domains';
import type { ProcessedSpecification } from '@utils/collections/util';
import { buildUrl } from '@utils/url-builder';
import { readResourceFile } from '@utils/resource-files';
import { isEventCatalogMCPEnabled } from '@utils/feature';

const RFC_9727_PROFILE = 'https://www.rfc-editor.org/info/rfc9727';
const LINKSET_CONTENT_TYPE = `application/linkset+json; profile="${RFC_9727_PROFILE}"`;

type LinkTarget = {
  href: string;
  type?: string;
  title?: string;
};

type ApiCatalogEntry = {
  anchor: string;
  'service-desc': LinkTarget[];
  'service-doc'?: LinkTarget[];
};

type ApiCatalogResource = Awaited<ReturnType<typeof getServices>>[number] | Awaited<ReturnType<typeof getDomains>>[number];

const absoluteUrl = (request: Request, pathOrUrl: string) => new URL(pathOrUrl, request.url).toString();

const getSpecificationMediaType = (specification: ProcessedSpecification) => {
  const extension = specification.filename.split('.').pop()?.toLowerCase();

  if (specification.type === 'graphql') return 'application/graphql';
  if (extension === 'json') return 'application/json';
  if (extension === 'yaml' || extension === 'yml') return 'application/yaml';

  return 'text/plain';
};

const getSpecificationIdentifier = (specification: ProcessedSpecification) => {
  return `${specification.type}-${Buffer.from(specification.path).toString('base64url')}`;
};

const parseSpecification = (rawSpecification: string, path: string): unknown => {
  if (path.endsWith('.json')) {
    return JSON.parse(rawSpecification);
  }

  return yaml.load(rawSpecification);
};

const toHttpUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  if (!/^https?:\/\//i.test(value)) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const getSpecificationsForResource = (resource: ApiCatalogResource) => {
  if (resource.collection === 'domains') {
    return getSpecificationsForDomain(resource);
  }

  return getSpecificationsForService(resource);
};

const getEndpointFromSpecification = (request: Request, resource: ApiCatalogResource) => {
  const specifications = getSpecificationsForResource(resource);

  for (const specification of specifications) {
    if (specification.type !== 'openapi' && specification.type !== 'asyncapi') continue;

    const rawSpecification = readResourceFile(resource, specification.path);
    if (!rawSpecification) continue;

    try {
      const parsedSpecification = parseSpecification(rawSpecification, specification.path) as any;

      if (specification.type === 'openapi') {
        const serverUrl = parsedSpecification?.servers?.find((server: any) => typeof server?.url === 'string')?.url;
        const endpoint = toHttpUrl(serverUrl);
        if (endpoint) return endpoint;
      }

      if (specification.type === 'asyncapi') {
        const servers = Object.values(parsedSpecification?.servers ?? {}) as any[];
        const serverUrl = servers.find((server) => typeof server?.url === 'string')?.url;
        const endpoint = toHttpUrl(serverUrl);
        if (endpoint) return endpoint;
      }
    } catch {
      // Invalid or unsupported specifications should not prevent catalog discovery.
    }
  }
};

const getResourceDocumentationUrl = (request: Request, resource: ApiCatalogResource) => {
  return absoluteUrl(request, buildUrl(`/docs/${resource.collection}/${resource.data.id}/${resource.data.version}`, true));
};

const getResourceMarkdownUrl = (request: Request, resource: ApiCatalogResource) => {
  return absoluteUrl(request, buildUrl(`/docs/${resource.collection}/${resource.data.id}/${resource.data.version}.md`, true));
};

const toApiCatalogEntry = (request: Request, resource: ApiCatalogResource): ApiCatalogEntry | null => {
  const specifications = getSpecificationsForResource(resource);
  if (specifications.length === 0) return null;

  const resourceDocumentationUrl = getResourceDocumentationUrl(request, resource);
  const resourceMarkdownUrl = getResourceMarkdownUrl(request, resource);

  return {
    anchor: getEndpointFromSpecification(request, resource) ?? resourceDocumentationUrl,
    'service-desc': specifications.map((specification) => ({
      href: absoluteUrl(
        request,
        buildUrl(
          `/.well-known/api-catalog/specifications/${resource.collection}/${resource.data.id}/${resource.data.version}/${getSpecificationIdentifier(specification)}`,
          true
        )
      ),
      type: getSpecificationMediaType(specification),
      title: `${resource.data.name || resource.data.id} ${specification.name}`,
    })),
    'service-doc': [
      {
        href: resourceMarkdownUrl,
        type: 'text/markdown',
        title: `${resource.data.name || resource.data.id} documentation`,
      },
      {
        href: resourceDocumentationUrl,
        type: 'text/html',
        title: `${resource.data.name || resource.data.id} documentation`,
      },
    ],
  };
};

const getMcpCatalogEntry = (request: Request): ApiCatalogEntry | null => {
  if (!isEventCatalogMCPEnabled()) return null;

  const mcpUrl = absoluteUrl(request, buildUrl('/docs/mcp', true));

  return {
    anchor: mcpUrl,
    'service-desc': [
      {
        href: mcpUrl,
        type: 'application/json',
        title: 'EventCatalog MCP Server',
      },
    ],
  };
};

export const GET: APIRoute = async ({ request }) => {
  const [services, domains] = await Promise.all([getServices({ getAllVersions: true }), getDomains({ getAllVersions: true })]);
  const resources = [...services, ...domains];
  const linkset = resources
    .map((resource) => toApiCatalogEntry(request, resource))
    .filter((entry): entry is ApiCatalogEntry => entry !== null);

  const mcpEntry = getMcpCatalogEntry(request);
  if (mcpEntry) {
    linkset.push(mcpEntry);
  }

  return new Response(JSON.stringify({ linkset }, null, 2), {
    headers: {
      'Content-Type': LINKSET_CONTENT_TYPE,
    },
  });
};

export const HEAD: APIRoute = async ({ request }) => {
  return new Response(null, {
    headers: {
      'Content-Type': LINKSET_CONTENT_TYPE,
      Link: `<${absoluteUrl(request, buildUrl('/.well-known/api-catalog', true))}>; rel="api-catalog"`,
    },
  });
};
