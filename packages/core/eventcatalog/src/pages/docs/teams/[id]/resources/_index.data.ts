import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { ownsResources } from '@utils/collections/owned-resources';

// The Owned Resources page lists everything a team owns. Teams that own nothing 404.
export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: { id: string }; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const { getTeams } = await import('@utils/collections/teams');
    const teams = await getTeams();

    return teams.filter(ownsResources).map((team) => ({ params: { id: team.data.id }, props: team }));
  }

  protected static async fetchData(params: { id?: string }) {
    if (!params.id) return null;

    const { getTeams } = await import('@utils/collections/teams');
    const team = (await getTeams()).find((t) => t.data.id === params.id);

    return team && ownsResources(team) ? team : null;
  }
}
