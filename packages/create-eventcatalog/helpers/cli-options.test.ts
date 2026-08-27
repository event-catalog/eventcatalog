import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatValidTemplates, isValidTemplate, resolveInstallSkills, resolveTemplateDirectory } from './cli-options.ts';

describe('create-catalog CLI options', () => {
  it('accepts the templates that ship with create-eventcatalog', () => {
    assert.equal(isValidTemplate('default'), true);
    assert.equal(isValidTemplate('empty'), true);
    assert.equal(isValidTemplate('graphql'), true);
    assert.equal(isValidTemplate('amazon-api-gateway'), true);
    assert.equal(isValidTemplate('amazon-apigateway'), true);
    assert.equal(isValidTemplate('does-not-exist'), false);
    assert.match(formatValidTemplates(), /default, empty, asyncapi/);
  });

  it('maps documented template aliases onto template directories', () => {
    assert.equal(resolveTemplateDirectory('amazon-apigateway'), 'amazon-api-gateway');
    assert.equal(resolveTemplateDirectory('amazon-api-gateway'), 'amazon-api-gateway');
    assert.equal(resolveTemplateDirectory('missing'), null);
  });

  it('skips the skills prompt when --skills or --no-skills is passed', () => {
    assert.equal(resolveInstallSkills(['node', 'create-catalog', '--no-skills']), false);
    assert.equal(resolveInstallSkills(['node', 'create-catalog', '--skills']), true);
    assert.equal(resolveInstallSkills(['node', 'create-catalog', '--skills', '--no-skills']), false);
    assert.equal(resolveInstallSkills(['node', 'create-catalog']), 'prompt');
  });
});
