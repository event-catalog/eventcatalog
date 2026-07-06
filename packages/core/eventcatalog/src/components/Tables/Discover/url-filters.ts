export interface DiscoverFilterQueryState {
  q: string;
  domains: string[];
  owners: string[];
  producers: string[];
  consumers: string[];
  agentProviders: string[];
  agentModels: string[];
  domainTypes: string[];
  badges: string[];
  properties: string[];
  statuses: string[];
  showOnlyLatest: boolean;
  onlyShowDrafts: boolean;
}

const FILTER_PARAM_NAMES = [
  'q',
  'domain',
  'owner',
  'producer',
  'consumer',
  'agentProvider',
  'agentModel',
  'domainType',
  'badge',
  'property',
  'status',
  'latest',
  'drafts',
];

const uniqueNonEmpty = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const getValues = (params: URLSearchParams, paramName: string) => uniqueNonEmpty(params.getAll(paramName));

const isFalse = (value: string | null) => value === 'false' || value === '0';

const isTrue = (value: string | null) => value === 'true' || value === '1';

export const parseDiscoverFilterSearch = (search: string): DiscoverFilterQueryState => {
  const params = new URLSearchParams(search);

  return {
    q: params.get('q')?.trim() ?? '',
    domains: getValues(params, 'domain'),
    owners: getValues(params, 'owner'),
    producers: getValues(params, 'producer'),
    consumers: getValues(params, 'consumer'),
    agentProviders: getValues(params, 'agentProvider'),
    agentModels: getValues(params, 'agentModel'),
    domainTypes: getValues(params, 'domainType'),
    badges: getValues(params, 'badge'),
    properties: getValues(params, 'property'),
    statuses: getValues(params, 'status'),
    showOnlyLatest: !isFalse(params.get('latest')),
    onlyShowDrafts: isTrue(params.get('drafts')),
  };
};

export const filterKnownValues = (values: string[], knownValues: Set<string>) => values.filter((value) => knownValues.has(value));

export const buildDiscoverFilterSearch = (filters: DiscoverFilterQueryState, currentSearch = '') => {
  const params = new URLSearchParams(currentSearch);
  FILTER_PARAM_NAMES.forEach((paramName) => params.delete(paramName));

  const appendValues = (paramName: string, values: string[]) => {
    uniqueNonEmpty(values).forEach((value) => params.append(paramName, value));
  };

  const q = filters.q.trim();
  if (q) params.set('q', q);
  appendValues('domain', filters.domains);
  appendValues('owner', filters.owners);
  appendValues('producer', filters.producers);
  appendValues('consumer', filters.consumers);
  appendValues('agentProvider', filters.agentProviders);
  appendValues('agentModel', filters.agentModels);
  appendValues('domainType', filters.domainTypes);
  appendValues('badge', filters.badges);
  appendValues('property', filters.properties);
  appendValues('status', filters.statuses);

  if (!filters.showOnlyLatest) params.set('latest', 'false');
  if (filters.onlyShowDrafts) params.set('drafts', 'true');

  const search = params.toString();
  return search ? `?${search}` : '';
};
