export type LlmsVersionedItem = {
  data: {
    id: string;
    name: string;
    version: string;
    summary?: string;
    protocols?: string[];
  };
};

export type UbiquitousLanguageTerm = {
  name: string;
  summary?: string;
};

export const joinLlmsItems = (items: string[]): string => items.join('\n');

export const ubiquitousLanguageMarkdownUrl = (baseUrl: string, domainId: string): string =>
  `${baseUrl}/docs/domains/${domainId}/language.mdx`;

export const formatVersionedItem = (baseUrl: string, item: LlmsVersionedItem, type: string, extraParams?: string): string => {
  const params = extraParams || '';
  return `- [${item.data.name} - ${item.data.id} - ${item.data.version} ${params ? `- ${params}` : ''}](${baseUrl}/docs/${type}/${item.data.id}/${item.data.version}.mdx) ${item.data.summary ? `- ${item.data.summary}` : ''}`;
};

export const renderUbiquitousLanguages = (
  baseUrl: string,
  domains: Array<{ id: string; data: { id: string; name: string } }>,
  ubiquitousLanguages: Record<string, Array<{ properties: UbiquitousLanguageTerm[] | Record<string, UbiquitousLanguageTerm> }>>
): string => {
  return Object.entries(ubiquitousLanguages)
    .map(([collectionId, items]) => {
      const domain = domains.find((entry) => entry.id === collectionId);
      const domainName = domain?.data.name || collectionId;
      const domainId = domain?.data.id || collectionId;
      const itemsList = items
        .map((item) => {
          const propertiesList = Object.entries(item.properties || {})
            .map(([, value]) => `    - [${value.name}: - ${value.summary}](${ubiquitousLanguageMarkdownUrl(baseUrl, domainId)})`)
            .join('\n');
          return propertiesList;
        })
        .join('\n');
      return `- ${domainName} Domain\n${itemsList}`;
    })
    .join('\n');
};
