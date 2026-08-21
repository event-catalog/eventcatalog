import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const COMMERCIAL_HEADER = `/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/src/federation/LICENSE
 */`;

describe('federation license boundary', () => {
  const federationDirectory = path.resolve(__dirname, '../federation');

  it('marks every federation implementation file as commercially licensed', async () => {
    const files = (await fs.readdir(federationDirectory)).filter((file) => file.endsWith('.ts'));

    await Promise.all(
      files.map(async (file) => {
        const contents = await fs.readFile(path.join(federationDirectory, file), 'utf8');
        expect(contents.startsWith(COMMERCIAL_HEADER), `${file} is missing the commercial license header`).toBe(true);
      })
    );
  });

  it('documents the source and package distribution boundaries', async () => {
    const [rootLicense, packageLicense, federationLicense, sdkPackage] = await Promise.all([
      fs.readFile(path.resolve(__dirname, '../../../../LICENSE'), 'utf8'),
      fs.readFile(path.resolve(__dirname, '../../LICENSE'), 'utf8'),
      fs.readFile(path.join(federationDirectory, 'LICENSE'), 'utf8'),
      fs.readFile(path.resolve(__dirname, '../../../sdk/package.json'), 'utf8').then((contents) => JSON.parse(contents)),
    ]);

    expect(rootLicense).toContain('packages/core/src/federation/');
    expect(packageLicense).toContain('dist/federation/');
    expect(packageLicense).toContain('The EventCatalog Commercial License');
    expect(federationLicense).toContain('The EventCatalog Commercial License');
    expect(sdkPackage.license).toBe('MIT');
  });
});
