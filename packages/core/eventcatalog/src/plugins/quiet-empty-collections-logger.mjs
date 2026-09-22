import nodeLogger from 'astro/logger/node';
import { wrapLoggerDestination } from './empty-collection-warning.mjs';

/**
 * Astro logger destination used by EventCatalog builds and the dev server.
 * Drops the empty-collection content warning for collections EventCatalog defines.
 * Every other log event is written with Astro's default node logger.
 */
export default function quietEmptyCollectionsLogger(options) {
  return wrapLoggerDestination(nodeLogger(options));
}
