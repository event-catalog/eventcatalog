import { buildUrl } from '@utils/url-builder';

const docsPathByType: Record<string, string> = {
  channel: 'channels',
  command: 'commands',
  container: 'containers',
  'data-product': 'data-products',
  domain: 'domains',
  entity: 'entities',
  event: 'events',
  flow: 'flows',
  query: 'queries',
  service: 'services',
};

export const getUrlForSearchItem = (node: { href?: string }, key: string) => {
  const parts = key.split(':');
  if (parts.length < 2) return null;

  const type = parts[0];
  const id = parts[1];
  const version = parts[2];

  if (type === 'list') return null;

  if (!version) return null;

  if (node.href) return node.href;

  const docsPath = docsPathByType[type];
  if (!docsPath) return null;

  return buildUrl(`/docs/${docsPath}/${id}/${version}`);
};
