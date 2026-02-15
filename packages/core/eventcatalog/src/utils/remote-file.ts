export function resolveTemplateVariables(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.replace(/\$\{(\w+)\}/g, (_, varName) => {
      // Vite may statically replace import.meta.env in SSR builds;
      // process.env keeps runtime env access for dynamic keys.
      return import.meta.env[varName] || process.env[varName] || '';
    });
  }

  if (typeof input === 'object' && input !== null) {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, resolveTemplateVariables(value)]));
  }

  return input;
}
