import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { getSystems } from '@utils/collections/systems';
import { Page as ContextPage } from './context/_index.data';

// A system's visualiser page, with levels from its context diagram down to its
// messages. Same data as the System Context page, but every system gets a page
// (the context level is optional, the system's resources always exist).
export class Page extends ContextPage {
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isAuthEnabled() || !isVisualiserEnabled()) {
      return [];
    }

    const systems = await getSystems();

    return systems
      .filter((system) => system.data.visualiser !== false)
      .map((system) => ({
        params: {
          id: system.data.id,
          version: system.data.version,
        },
        props: {
          type: 'systems',
          ...system,
        },
      }));
  }
}
