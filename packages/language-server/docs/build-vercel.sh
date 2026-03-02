#!/bin/bash
set -e
cd "$(dirname "$0")/../../.."
pnpm --filter @eventcatalog/sdk run build
pnpm --filter @eventcatalog/language-server run build
cd packages/language-server/docs
npx astro build
cp -r dist /vercel/path0/dist
