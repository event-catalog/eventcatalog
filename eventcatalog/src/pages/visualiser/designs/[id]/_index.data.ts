import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { isAuthEnabled } from '@utils/feature';

export class Page extends HybridPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled()) {
      return [];
    }

    const { getDesigns } = await import('@utils/collections/designs');

    const designs = await getDesigns();

    return designs.map((item) => ({
      params: {
        type: 'designs',
        id: item.data.id,
      },
      props: {
        type: 'designs',
        ...item,
      },
    }));
  }

  protected static async fetchData(params: any) {
    const { id } = params;

    if (!id) {
      return null;
    }

    const { getDesigns } = await import('@utils/collections/designs');
    const designs = await getDesigns();

    const design = designs.find((design) => design.data.id === id);

    if (!design) {
      return null;
    }

    return {
      type: 'designs',
      ...design,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Design not found',
    });
  }

  static get clientAuthScript(): string {
    if (!isAuthEnabled()) {
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
