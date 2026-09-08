import type { AstroIntegration } from 'astro'
import { type AstroAuthConfig, virtualConfigModule } from './config'
import { dirname, join } from 'node:path'

export default (config: AstroAuthConfig = {}): AstroIntegration => ({
	name: 'astro-auth',
	hooks: {
		'astro:config:setup': async ({
			config: astroConfig,
			injectRoute,
			injectScript,
			updateConfig,
			logger,
		}) => {
			updateConfig({
				vite: {
					plugins: [virtualConfigModule(config.configFile)],
					optimizeDeps: { exclude: ['auth:config'] },
				},
			})

			config.prefix ??= '/api/auth'

			if (config.injectEndpoints !== false) {
				const currentDir = dirname(import.meta.url.replace('file://', ''))
				const entrypoint = join(`${currentDir}/api/[...auth].ts`)
				injectRoute({
					pattern: `${config.prefix}/[...auth]`,
					entrypoint,
				})
			}

			if (!astroConfig.adapter) {
				logger.error('No Adapter found, please make sure you provide one in your Astro config')
			}
			const edge = ['@astrojs/vercel/edge', '@astrojs/cloudflare'].includes(
				astroConfig.adapter.name
			)

			if (
				(!edge && globalThis.process && process.versions.node < '19.0.0') ||
				(process.env.NODE_ENV === 'development' && edge)
			) {
				injectScript(
					'page-ssr',
					`import crypto from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = crypto;
if (typeof globalThis.crypto.subtle === "undefined") globalThis.crypto.subtle = crypto.webcrypto.subtle;
if (typeof globalThis.crypto.randomUUID === "undefined") globalThis.crypto.randomUUID = crypto.randomUUID;
`
				)
			}
		},
	},
})
