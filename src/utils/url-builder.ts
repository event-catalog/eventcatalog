import config from '@eventcatalog';

const cleanUrl = (urlString: string) => {
  const url = new URL(urlString);
  url.pathname = url.pathname.replace(/\/+/g, '/');
  return url.toString();
};

// Custom URL builder as Astro does not support this stuff out the box
export const buildUrl = (url: string, ignoreTrailingSlash = false) => {
  // Should a trailingSlash be added to urls?
  const trailingSlash = config.trailingSlash || false;

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
