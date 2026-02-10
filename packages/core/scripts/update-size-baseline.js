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
 * Main update function
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

  // Calculate current size
  const currentSize = getDirSizeKB(distPath);

  // Read existing baseline if it exists
  let oldSize = null;
  if (fs.existsSync(baselinePath)) {
    const existing = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    oldSize = existing.dist.size;
  }

  // Create new baseline
  const baseline = {
    dist: {
      size: currentSize,
      unit: 'KB',
      updatedAt: new Date().toISOString().split('T')[0],
    },
  };

  // Write baseline
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');

  // Output report
  console.log('\n📦 Size Baseline Updated\n');
  if (oldSize !== null) {
    const delta = currentSize - oldSize;
    const deltaPercent = ((delta / oldSize) * 100).toFixed(2);
    const deltaSign = delta >= 0 ? '+' : '';
    console.log(`   Previous:  ${formatSize(oldSize)}`);
    console.log(`   New:       ${formatSize(currentSize)}`);
    console.log(`   Change:    ${deltaSign}${formatSize(Math.abs(delta))} (${deltaSign}${deltaPercent}%)`);
  } else {
    console.log(`   Size:      ${formatSize(currentSize)}`);
  }
  console.log(`   File:      ${baselinePath}`);
  console.log("\n✅ Don't forget to commit .size-baseline.json\n");
}

main();
