/**
 * This is an optional file that can add authentication to your EventCatalog.
 *
 * To enable authentication you need to set `server:output` in your `eventcatalog.config.js` file.
 * And then pick which provider you want to use.
 *
 * You can read more in the documentation:
 * https://www.eventcatalog.dev/docs/development/guides/authentication/introduction
 *
 */

// export default {
//   debug: false,
//   providers: {
//     // GitHub Authentication
//     github: {
//       clientId: process.env.AUTH_GITHUB_CLIENT_ID,
//       clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET,
//     },
//     // Azure AD Entra ID
//     entra: {
//       clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
//       clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
//       issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
//     },
//     // Google Authentication
//     google: {
//       clientId: process.env.AUTH_GOOGLE_ID,
//       clientSecret: process.env.AUTH_GOOGLE_SECRET,
//     },
//     // Auth0 Authentication
//     auth0: {
//       clientId: process.env.AUTH_AUTH0_ID,
//       clientSecret: process.env.AUTH_AUTH0_SECRET,
//       issuer: process.env.AUTH_AUTH0_ISSUER,
//     },
//     // Okta Authentication
//     okta: {
//       clientId: process.env.AUTH_OKTA_CLIENT_ID,
//       clientSecret: process.env.AUTH_OKTA_CLIENT_SECRET,
//       issuer: process.env.AUTH_OKTA_ISSUER,
//     },
//   },
// }
