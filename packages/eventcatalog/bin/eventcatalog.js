#!/usr/bin/env node

const cli = require('commander')
const path = require('path')
const { execSync } = require('child_process')
const fs = require('fs-extra')

const usersProjectDir = process.cwd()
const coreDirectory = path.join(__dirname, '../')
const coreDestination = path.join(usersProjectDir, 'eventcatalog-core')

const copyCoreApplicationCodeIntoUsersProjectDir = () => {
  const excludeFilesForCopy = ['.next', 'eventcatalog.config.js', 'bin', 'README.md']
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
}

cli
  .command('start [siteDir]')
  .description('Start the development server.')
  .action(() => {
    // fs.rmSync(path.join(coreDestination, 'node_modules'), { recursive: true, force: true })
    // fs.copySync(
    //   path.join(usersProjectDir, 'node_modules'),
    //   path.join(coreDestination, 'node_modules')
    // )

    execSync(`PROJECT_DIR=${process.cwd()} npm run start`, {
      cwd: usersProjectDir,
      stdio: 'inherit',
    })
  })

cli
  .command('build [siteDir]')
  .description('Start the development server.')
  .action(() => {
    if (!fs.existsSync(coreDestination)) {
      // get the application ready
      copyCoreApplicationCodeIntoUsersProjectDir()
    }

    // build using nextjs
    execSync(`PROJECT_DIR=${process.cwd()} npm run build`, {
      cwd: coreDestination,
      stdio: 'inherit',
    })

    // everything is built make sure its back in the users project directory
    fs.copySync(path.join(coreDestination, '.next'), path.join(usersProjectDir, '.next'))
  })

cli
  .command('dev [siteDir]')
  .description('Start the development server.')
  .action(() => {
    copyCoreApplicationCodeIntoUsersProjectDir()

    execSync(`PROJECT_DIR=${process.cwd()} npm run dev`, {
      cwd: coreDestination,
      stdio: 'inherit',
    })
  })
  
cli

  .command('generate [siteDir]')
  .description('Start the generator scripts.')
  .action(() => {
    if (!fs.existsSync(coreDestination)) {
      // get the application ready
      copyCoreApplicationCodeIntoUsersProjectDir()
    }

    execSync(`PROJECT_DIR=${process.cwd()} npm run generate`, {
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
