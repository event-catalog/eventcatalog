import { isSSR } from '@utils/feature';
import { HybridPage } from '@utils/page-loaders/hybrid-page';
import { getDiagrams } from '@utils/collections/diagrams';

/**
 * Diagrams page class for full-screen diagram viewing
 */
export class Page extends HybridPage {
  static async getStaticPaths() {
    if (isSSR()) {
      return [];
    }

    const diagrams = await getDiagrams();

    return diagrams.map((diagram) => ({
      params: {
        id: diagram.data.id,
        version: diagram.data.version,
      },
      props: {},
    }));
  }

  protected static async fetchData(params: any) {
    const { id, version } = params;

    if (!id || !version) {
      return null;
    }

    const diagrams = await getDiagrams();
    const diagram = diagrams.find((d) => d.data.id === id && d.data.version === version);

    if (!diagram) {
      return null;
    }

    // Get all versions of this diagram for the version selector
    const allVersions = diagrams
      .filter((d) => d.data.id === id)
      .map((d) => d.data.version)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    return {
      ...diagram,
      allVersions,
    };
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Diagram not found',
    });
  }
}
