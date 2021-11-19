#!/usr/bin/env node

const cli = require('commander')
const path = require('path')
const { execSync } = require('child_process')
const fs = require('fs-extra')

// cli.version(require('../package.json').version).usage('<command> [options]');
cli
  .command('start [siteDir]')
  .description('Start the development server.')
  .action((siteDir, { port, host, locale, config, hotOnly, open, poll }) => {
    const projectBuildDir = path.join(process.cwd(), 'build')

    // copy the build back...
    fs.copySync(
      projectBuildDir,
      path.join(__dirname, '../.next'),
      { overwrite: true },
      function (err) {
        if (err) {
          console.error(err)
        } else {
          console.log('success!')
        }
      }
    )

    execSync(`PROJECT_DIR=${process.cwd()} npm run start:next`, {
      cwd: path.join(__dirname, '../'),
      stdio: 'inherit',
    })
  })

cli
  .command('build [siteDir]')
  .description('Start the development server.')
  .action((siteDir, { port, host, locale, config, hotOnly, open, poll }) => {
    execSync(`PROJECT_DIR=${process.cwd()} npm run build:next`, {
      cwd: path.join(__dirname, '../'),
      stdio: 'inherit',
    })

    const projectBuildDir = path.join(process.cwd(), 'build')

    fs.ensureDir(projectBuildDir)

    fs.copySync(
      path.join(__dirname, '../.next'),
      projectBuildDir,
      { overwrite: true },
      function (err) {
        if (err) {
          console.error(err)
        } else {
          console.log('success!')
        }
      }
    )
  })

cli
  .command('dev [siteDir]')
  .description('Start the development server.')
  .action((siteDir, { port, host, locale, config, hotOnly, open, poll }) => {

    const excludeFilesForCopy = ['.next', 'eventcatalog.config.js', 'bin', 'README.md']

    const usersProjectDir = process.cwd()
    const coreDirectory = path.join(__dirname, '../')
    const coreDestination = path.join(usersProjectDir, 'eventcatalog-core')

    const exclusions = excludeFilesForCopy.map((file) => path.join(coreDestination, file))

    fs.ensureDirSync(coreDestination)
    fs.copySync(coreDirectory, coreDestination)

    // remove any files we don't care about
    exclusions.map((path) => {
      try {
        fs.lstatSync(path).isDirectory()
          ? fs.rmSync(path, { recursive: true, force: true })
          : fs.unlinkSync(path)
      } catch (error) {}
    })

    fs.copyFileSync(
      path.join(usersProjectDir, 'eventcatalog.config.js'),
      path.join(coreDestination, 'eventcatalog.config.js')
    )

    execSync(`PROJECT_DIR=${process.cwd()} npm run dev:next`, {
      cwd: coreDestination,
      stdio: 'inherit',
    })
  })

async function run() {
  cli.parse(process.argv)

  if (!process.argv.slice(2).length) {
    cli.outputHelp()
  }
}

run()

process.on('unhandledRejection', (err) => {
  console.error(err)
  // console.error(chalk.red(err.stack));
  process.exit(1)
})
