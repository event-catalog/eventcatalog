const cleanUrl = (url: string) => {
  return url.replace(/\/+/g, '/');
};

// Custom URL builder as Astro does not support this stuff out the box
export const buildUrl = (url: string, ignoreTrailingSlash = false, urlAlreadyIncludesBaseUrl = false) => {
  // Should a trailingSlash be added to urls?
  const trailingSlash = __EC_TRAILING_SLASH__;

  let newUrl = url;

  // If the base URL is not the root, we need to append it
  if (import.meta.env.BASE_URL !== '/' && !urlAlreadyIncludesBaseUrl) {
    newUrl = `${import.meta.env.BASE_URL}${url}`;
  }

  // Should we add a trailing slash to the url?
  if (trailingSlash && !ignoreTrailingSlash) {
    if (url.endsWith('/')) return newUrl;
    return cleanUrl(`${newUrl}/`);
  }

  return cleanUrl(newUrl);
};

// Helper function to build URLs with query parameters
export const buildUrlWithParams = (baseUrl: string, params: Record<string, string | undefined>) => {
  // Filter out undefined values and empty strings
  const validParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== '')
    .reduce<Record<string, string>>((acc, [key, value]) => ({ ...acc, [key]: value as string }), {});

  // If no valid params, just return the base URL
  if (Object.keys(validParams).length === 0) {
    return buildUrl(baseUrl);
  }

  // Build query string with encoded values
  const queryString = Object.entries(validParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `${buildUrl(baseUrl)}?${queryString}`;
};

export const buildEditUrlForResource = (editUrl: string, filePath: string) => {
  // filepath may have ../ or ./ in it, so we need to remove it
  const cleanFilePath = filePath.replace(/^\.\.?\//g, '');
  return `${editUrl}/${cleanFilePath}`;
};
