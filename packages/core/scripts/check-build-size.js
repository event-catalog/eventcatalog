#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const __dirname = import.meta.dirname;

/**
 * Recursively calculate the total size of a directory in bytes
 */
function getDirSizeBytes(dirPath) {
  let totalSize = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      totalSize += getDirSizeBytes(itemPath);
    } else {
      totalSize += stats.size;
    }
  }

  return totalSize;
}

/**
 * Get directory size in KB
 */
function getDirSizeKB(dirPath) {
  return Math.round(getDirSizeBytes(dirPath) / 1024);
}

/**
 * Format size with appropriate units
 */
function formatSize(kb) {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(2)} MB`;
  }
  return `${kb} KB`;
}

/**
 * Main size check
 */
function main() {
  const args = process.argv.slice(2);
  const catalog = args[0] || 'default';

  const distPath = path.join(__dirname, `../../../examples/${catalog}/dist`);
  const baselinePath = path.join(__dirname, '../.size-baseline.json');

  // Check if dist exists
  if (!fs.existsSync(distPath)) {
    console.error(`❌ Build output not found at: ${distPath}`);
    console.error('   Run the build first: pnpm run verify-build:catalog');
    process.exit(1);
  }

  // Check if baseline exists
  if (!fs.existsSync(baselinePath)) {
    console.error(`❌ Baseline file not found at: ${baselinePath}`);
    console.error('   Run: node scripts/update-size-baseline.js');
    process.exit(1);
  }

  // Read baseline
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  const baselineSize = baseline.dist.size;

  // Calculate current size
  const currentSize = getDirSizeKB(distPath);

  // Get threshold from env or default to 5%
  const threshold = parseFloat(process.env.SIZE_THRESHOLD) || 5;
  const maxAllowed = Math.round(baselineSize * (1 + threshold / 100));

  // Calculate delta
  const delta = currentSize - baselineSize;
  const deltaPercent = ((delta / baselineSize) * 100).toFixed(2);
  const deltaSign = delta >= 0 ? '+' : '';

  // Output report
  console.log('\n📦 Build Size Report\n');
  console.log(`   Baseline:     ${formatSize(baselineSize)}`);
  console.log(`   Current:      ${formatSize(currentSize)}`);
  console.log(`   Delta:        ${deltaSign}${formatSize(Math.abs(delta))} (${deltaSign}${deltaPercent}%)`);
  console.log(`   Threshold:    ${threshold}% (max ${formatSize(maxAllowed)})`);
  console.log('');

  // Check if over budget
  if (currentSize > maxAllowed) {
    console.error(`❌ Build size exceeds budget by ${formatSize(currentSize - maxAllowed)}`);
    console.error(`   To update baseline: node scripts/update-size-baseline.js`);
    process.exit(1);
  }

  console.log('✅ Build size within budget\n');
  process.exit(0);
}

main();
