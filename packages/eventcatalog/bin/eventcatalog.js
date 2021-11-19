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

    execSync(`PROJECT_DIR=${process.cwd()} npm run start`, {
      cwd: path.join(__dirname, '../'),
      stdio: 'inherit',
    })
  })

cli
  .command('build [siteDir]')
  .description('Start the development server.')
  .action((siteDir, { port, host, locale, config, hotOnly, open, poll }) => {
    execSync(`PROJECT_DIR=${process.cwd()} npm run build`, {
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
    // might need to copy files over to the application
    // might need to link the files over

    // might need to tell the application the working DIR

    console.log(process.cwd())

    execSync(`PROJECT_DIR=${process.cwd()} npm run dev`, {
      cwd: path.join(__dirname, '../'),
      stdio: 'inherit',
    })

    // console.log('WHAT')
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
