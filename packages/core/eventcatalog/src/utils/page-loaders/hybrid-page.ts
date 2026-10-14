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
   * The page's data: its props in a static build, or looked up from its URL on a server. Undefined
   * when nothing matches (an unknown resource or version): the page then returns
   * `Astro.rewrite('/404')`. Throwing a Response instead made Astro answer with an empty 500.
   */
  static async getData(astro: AstroGlobal): Promise<any> {
    // Try props first (static mode)
    if (astro.props && this.hasValidProps(astro.props)) {
      return this.transformProps(astro.props);
    }

    return (await this.fetchData(astro.params)) ?? undefined;
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
}
