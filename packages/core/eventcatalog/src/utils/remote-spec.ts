export const SAFE_ENV_PREFIXES = ['EVENTCATALOG_', 'EC_'];

const isAllowedEnvVariable = (varName: string, allowAnyEnvInHeaders: boolean): boolean => {
  if (allowAnyEnvInHeaders) return true;
  return SAFE_ENV_PREFIXES.some((prefix) => varName.startsWith(prefix));
};

export const resolveHeaderTemplates = (
  value: string,
  {
    allowAnyEnvInHeaders = false,
  }: {
    allowAnyEnvInHeaders?: boolean;
  } = {}
): string => {
  return value.replace(/\$\{(\w+)\}/g, (_, varName) => {
    if (!isAllowedEnvVariable(varName, allowAnyEnvInHeaders)) {
      return '';
    }

    // import.meta.env works in Vite contexts, process.env is the runtime fallback for SSR.
    return import.meta.env[varName] || process.env[varName] || '';
  });
};

export const resolveHeaders = (
  headers: Record<string, string>,
  {
    allowAnyEnvInHeaders = false,
  }: {
    allowAnyEnvInHeaders?: boolean;
  } = {}
): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, resolveHeaderTemplates(String(value), { allowAnyEnvInHeaders })])
  );
};

export const isSameOrigin = (sourceUrl: string, targetUrl: string): boolean => {
  try {
    return new URL(sourceUrl).origin === new URL(targetUrl).origin;
  } catch {
    return false;
  }
};
