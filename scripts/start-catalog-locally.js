#!/usr/bin/env node

const path = require('path')
const { execSync } = require('child_process')

const eventCatalogDir = path.join(__dirname, '../packages/eventcatalog')
const projectDIR = path.join(__dirname, '../examples/basic')

execSync(`PROJECT_DIR=${projectDIR} npm run dev`, {
  cwd: eventCatalogDir,
  stdio: 'inherit',
})
