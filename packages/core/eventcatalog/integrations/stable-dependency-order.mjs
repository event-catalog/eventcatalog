// Astro crawls framework packages with vitefu, which looks them up concurrently and lists
// each one in `resolve.external` / `resolve.noExternal` as its lookup finishes, so the
// order changes from one start to the next. Vite hashes these lists unsorted to decide
// whether its pre-bundled dependencies are still valid, so every `eventcatalog dev` saw a
// "changed" config and re-bundled all of them. Only membership matters in these lists, so
// sorting them keeps the hash (and the dependency cache) stable across starts.

const byName = (a, b) => {
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
};

const sortResolveLists = (resolve) => {
  if (Array.isArray(resolve?.external)) resolve.external.sort(byName);
  if (Array.isArray(resolve?.noExternal)) resolve.noExternal.sort(byName);
};

export default function stableDependencyOrder() {
  return {
    name: 'eventcatalog:stable-dependency-order',
    apply: 'serve',
    configResolved(config) {
      sortResolveLists(config.resolve);
      sortResolveLists(config.ssr);
      for (const environment of Object.values(config.environments ?? {})) sortResolveLists(environment.resolve);
    },
  };
}
