// pages/teams/[id]/index.page.ts
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const { getUsers } = await import('@utils/users');
    const users = await getUsers();

    return users.map((user) => ({
      params: { id: user.data.id },
      props: user,
    }));
  }

  protected static async fetchData(params: any) {
    const { id } = params;

    if (!id) {
      return null;
    }

    const { getUsers } = await import('@utils/users');
    const users = await getUsers();

    // Find the specific team by id
    const user = users.find((u) => u.data.id === id);

    return user || null;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'User not found',
    });
  }
}
