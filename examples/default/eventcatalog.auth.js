export default {
    debug: false,
    providers: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
        },
        okta: {
            clientId: process.env.AUTH_OKTA_ID,
            clientSecret: process.env.AUTH_OKTA_SECRET,
            issuer: process.env.AUTH_OKTA_ISSUER,
        },
        entra: {
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
        },
        auth0: {
            clientId: process.env.AUTH_AUTH0_ID,
            clientSecret: process.env.AUTH_AUTH0_SECRET,
            issuer: process.env.AUTH_AUTH0_ISSUER,
        },
    },
}