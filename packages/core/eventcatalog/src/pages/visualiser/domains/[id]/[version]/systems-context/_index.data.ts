import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { getDomains } from '@utils/collections/domains';

/**
 * A domain gets a System Diagram when it has systems and at least one of those
 * systems takes part in a context graph — i.e. it declares relationships or actors. A
 * domain whose systems have neither has nothing to show, so we don't generate a page.
 * `getDomains` hydrates `data.systems` into full system entries, so read each
 * system's data directly — this must stay in sync with the sidebar's
 * `hasSystemContext` guard so we never link to a page that wasn't generated.
 */
const domainHasSystemContext = (domain: Awaited<ReturnType<typeof getDomains>>[number]) => {
  const systems = (domain.data.systems || []) as any[];

  return systems.some((system) => {
    const data = system?.data ?? system;
    return ((data?.relationships as unknown[]) || []).length > 0 || ((data?.actors as unknown[]) || []).length > 0;
  });
};

export class Page extends HybridPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled() || !isVisualiserEnabled()) {
      return [];
    }

    const domains = await getDomains({ getAllVersions: false });

    return domains
      .filter((domain) => domainHasSystemContext(domain))
      .map((domain) => ({
        params: {
          id: domain.data.id,
          version: domain.data.version,
        },
        props: {
          type: 'domains',
          ...domain,
        },
      }));
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version || !isVisualiserEnabled()) {
      return null;
    }

    const domains = await getDomains({ getAllVersions: false });
    const item = domains.find((i) => i.data.id === id && i.data.version === version);

    if (!item) {
      return null;
    }

    return item;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Domain System Diagram page not found',
    });
  }

  static get clientAuthScript(): string {
    if (!isAuthEnabled() || !isVisualiserEnabled()) {
      return '';
    }

    return `
      if (typeof window !== 'undefined' && !import.meta.env.SSR) {
        fetch('/api/auth/session')
          .then(res => res.json())
          .then(session => {
            if (!session?.user) {
              window.location.href = '/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
            }
          })
          .catch(() => {
            window.location.href = '/auth/login?callbackUrl=' + encodeURIComponent(window.location.pathname);
          });
      }
    `;
  }
}
