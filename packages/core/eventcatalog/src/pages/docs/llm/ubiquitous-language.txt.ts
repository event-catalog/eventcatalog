import config from '@config';
import type { APIRoute } from 'astro';
import { isLLMSTxtEnabled } from '@utils/feature';
import {
  getTermsDefinedInSeveralDomains,
  getTermSummary,
  getUbiquitousLanguageGlossary,
  type DomainGlossary,
  type UbiquitousLanguageTerm,
} from '@utils/collections/domains';

const formatTerm = (term: UbiquitousLanguageTerm) => {
  const summary = getTermSummary(term);
  return `- ${term.name}${summary ? `: ${summary}` : ''}`;
};

export const GET: APIRoute = async ({ request }) => {
  if (!isLLMSTxtEnabled()) {
    return new Response('ubiquitous-language.txt is not enabled for this Catalog.', { status: 404 });
  }

  const url = new URL(request.url);
  const baseUrl = process.env.LLMS_TXT_BASE_URL || `${url.origin}`;

  const glossary = await getUbiquitousLanguageGlossary();

  const header = [
    `# ${config.organizationName} Ubiquitous Language`,
    '> The business terms used across this organization, grouped by domain. A term only applies within its domain: the same word can mean something different in another domain.',
  ].join('\n');

  if (glossary.length === 0) {
    return new Response(`${header}\n\nNo ubiquitous language terms are defined in this catalog.`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const formatDomain = (domain: DomainGlossary, heading: string) =>
    [
      `${heading} ${domain.name}`,
      ...(domain.terms.length > 0
        ? [`Full definitions: ${baseUrl}/docs/domains/${domain.id}/language.mdx`, ...domain.terms.map(formatTerm)]
        : []),
    ].join('\n');

  const termsInSeveralDomains = [...getTermsDefinedInSeveralDomains(glossary).values()].map((definitions) =>
    [
      `- ${definitions[0].term.name}`,
      ...definitions.map(({ domain, term }) => {
        const summary = getTermSummary(term);
        return `  - ${domain.name}${summary ? `: ${summary}` : ''}`;
      }),
    ].join('\n')
  );

  const sections = [
    header,
    ...(termsInSeveralDomains.length > 0 ? [`## Terms defined in more than one domain\n${termsInSeveralDomains.join('\n')}`] : []),
    ...glossary.flatMap((domain) => [
      formatDomain(domain, '##'),
      ...domain.subdomains.map((subdomain) => formatDomain(subdomain, '###')),
    ]),
  ];

  return new Response(sections.join('\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
