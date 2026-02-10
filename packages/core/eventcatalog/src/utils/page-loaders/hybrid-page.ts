import type { AstroGlobal } from 'astro';
import { isSSR } from '@utils/feature';

/**
 * Base class for all hybrid pages with static methods
 */
export class HybridPage<T = any> {
  /**
   * Static method for prerender setting
   */
  static get prerender(): boolean {
    return !isSSR();
  }

  /**
   * Static method for generating static paths
   */
  static async getStaticPaths(): Promise<Array<{ params: any; props: any }>> {
    if (isSSR()) {
      return [];
    }
    // Don't call this.generateStaticPaths() here - let each subclass implement this method directly
    throw new Error('getStaticPaths must be implemented by subclass');
  }

  /**
   * Static method for getting data
   */
  static async getData(astro: AstroGlobal): Promise<any> {
    // Try props first (static mode)
    if (astro.props && this.hasValidProps(astro.props)) {
      return this.transformProps(astro.props);
    }

    const data = await this.fetchData(astro.params);

    if (!data) {
      throw this.createNotFoundResponse();
    }

    return data;
  }

  /**
   * Methods to be overridden by subclasses
   */
  protected static async fetchData(params: any): Promise<any> {
    throw new Error('fetchData must be implemented by subclass');
  }

  /**
   * Override these static methods if needed
   */
  protected static hasValidProps(props: any): boolean {
    return props && Object.keys(props).length > 0 && props.data;
  }

  protected static transformProps(props: any): any {
    return props;
  }

  protected static createNotFoundResponse(): Response {
    return new Response(null, {
      status: 404,
      statusText: 'Not found',
    });
  }
}
