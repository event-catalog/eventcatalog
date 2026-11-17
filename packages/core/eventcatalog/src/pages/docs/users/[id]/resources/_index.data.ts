import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { ownsResources } from '@utils/collections/owned-resources';

// The Owned Resources page lists everything a user (or their teams) owns. Users who own nothing 404.
export class Page extends HybridPage {
  static get prerender(): boolean {
    return !isSSR();
  }

  static async getStaticPaths(): Promise<Array<{ params: { id: string }; props: any }>> {
    if (isSSR()) {
      return [];
    }

    const { getUsers } = await import('@utils/collections/users');
    const users = await getUsers();

    return users.filter(ownsResources).map((user) => ({ params: { id: user.data.id }, props: user }));
  }

  protected static async fetchData(params: { id?: string }) {
    if (!params.id) return null;

    const { getUsers } = await import('@utils/collections/users');
    const user = (await getUsers()).find((u) => u.data.id === params.id);

    return user && ownsResources(user) ? user : null;
  }
}
