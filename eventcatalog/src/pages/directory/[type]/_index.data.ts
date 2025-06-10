// pages/directory/[type]/index.page.ts
import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';

export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    const { getUsers } = await import('@utils/users');
    const { getTeams } = await import('@utils/teams');

    const loaders = {
      users: getUsers,
      teams: getTeams,
    };

    const itemTypes = ['users', 'teams'] as const;
    const allItems = await Promise.all(itemTypes.map((type) => loaders[type]()));

    return allItems.flatMap((items, index) => ({
      params: {
        type: itemTypes[index],
      },
      props: {
        data: items,
        type: itemTypes[index],
      },
    }));
  }

  protected static async fetchData(params: any) {
    const { type } = params;

    if (!type) {
      return null;
    }

    const { getUsers } = await import('@utils/users');
    const { getTeams } = await import('@utils/teams');

    const loaders = {
      users: getUsers,
      teams: getTeams,
    };

    // Get all items of the specified type
    const items = await loaders[type as keyof typeof loaders]();

    return {
      type,
      data: items,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Directory type not found',
    });
  }
}
