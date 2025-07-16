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

    const { getTeams } = await import('@utils/teams');
    const teams = await getTeams();

    return teams.map((team) => ({
      params: { id: team.data.id },
      props: team,
    }));
  }

  protected static async fetchData(params: any) {
    const { id } = params;

    if (!id) {
      return null;
    }

    const { getTeams } = await import('@utils/teams');
    const teams = await getTeams();

    // Find the specific team by id
    const team = teams.find((t) => t.data.id === id);

    return team || null;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Team not found',
    });
  }
}
