declare module 'auth:config' {
  const config: import('./src/config').FullAuthConfig;
  export default config;
}

declare module '@eventcatalog/auth-astro' {
  const index: import('./index').Integration;

  type FullAuthConfig = import('./src/config').FullAuthConfig;
  const defineConfig: (config: FullAuthConfig) => FullAuthConfig;
  export default index;
  export { defineConfig };
}
