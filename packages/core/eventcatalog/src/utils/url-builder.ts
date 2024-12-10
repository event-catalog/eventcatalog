const cleanUrl = (url: string) => {
  return url.replace(/\/+/g, '/');
};

// Custom URL builder as Astro does not support this stuff out the box
export const buildUrl = (url: string, ignoreTrailingSlash = false) => {
  // Should a trailingSlash be added to urls?
  const trailingSlash = __EC_TRAILING_SLASH__;

  let newUrl = url;

  // If the base URL is not the root, we need to append it
  if (import.meta.env.BASE_URL !== '/') {
    newUrl = `${import.meta.env.BASE_URL}${url}`;
  }

  // Should we add a trailing slash to the url?
  if (trailingSlash && !ignoreTrailingSlash) {
    if (url.endsWith('/')) return newUrl;
    return cleanUrl(`${newUrl}/`);
  }

  return cleanUrl(newUrl);
};
