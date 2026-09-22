import { mergeEcConfigOptions } from 'astro-expressive-code';
import defaults from '../ec.config.mjs';

export default function preprocessConfig({ ecConfig }) {
  return mergeEcConfigOptions(defaults, ecConfig);
}
