import type { PluginOption } from 'vite'
import type { AuthConfig } from '@auth/core/types'

export const virtualConfigModule = (configFile: string = './auth.config'): PluginOption => {
	const virtualModuleId = 'auth:config'
	const resolvedId = '\0' + virtualModuleId

	return {
		name: 'auth-astro-config',
		resolveId: (id) => {
			if (id === virtualModuleId) {
				return resolvedId
			}
		},
		load: (id) => {
			if (id === resolvedId) {
				return `import authConfig from "${configFile}"; export default authConfig`
			}
		},
	}
}

export interface AstroAuthConfig {
	/**
	 * Defines the base path for the auth routes.
	 * @default '/api/auth'
	 */
	prefix?: string
	/**
	 * Defineds wether or not you want the integration to handle the API routes
	 * @default true
	 */
	injectEndpoints?: boolean
	/**
	 * Path to the config file
	 */
	configFile?: string
}

export interface FullAuthConfig extends AstroAuthConfig, Omit<AuthConfig, 'raw'> {}
export const defineConfig = (config: FullAuthConfig) => {
	config.prefix ??= '/api/auth'
	config.basePath = config.prefix
	return config
}
