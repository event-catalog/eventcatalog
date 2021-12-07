import spawn from 'cross-spawn'

interface InstallArgs {
  /**
   * Indicate whether the given dependencies are devDependencies.
   */
  devDependencies?: boolean
}

/**
 * Spawn a package manager installation with NPM.
 *
 * @returns A Promise that resolves once the installation is finished.
 */
export function install(
  root: string,
  dependencies: string[] | null,
  { devDependencies }: InstallArgs
): Promise<void> {
  /**
   * NPM-specific command-line flags.
   */
  const npmFlags: string[] = []
  /**
   * Return a Promise that resolves once the installation is finished.
   */
  return new Promise((resolve, reject) => {
    const command = 'npm'

    /**
     * Call `npm install [--save|--save-dev] ...`.
     */
    const args: string[] = ['install', '--save-exact']
    args.push(devDependencies ? '--save-dev' : '--save')
    if (dependencies) {
      args.push(...dependencies)
    }
    args.push(...npmFlags)

    // until warns are fixed...
    args.push('--silent')

    /**
     * Spawn the installation process.
     */
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject({ command: `${command} ${args.join(' ')}` })
        return
      }
      resolve()
    })
  })
}
