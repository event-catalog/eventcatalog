import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GET as getMarkdown } from '../../pages/docs/[type]/[id]/[version].md';
import { GET as getMdx } from '../../pages/docs/[type]/[id]/[version].mdx';

const event = vi.hoisted(() => ({
  data: {
    id: 'MyEvent',
    version: '1.0.0',
  },
  filePath: '../domains/mydomain/events/MyEvent/index.mdx',
}));

vi.mock('astro:content', () => ({
  getCollection: async (collection: string) => (collection === 'events' ? [event] : []),
}));

describe('resource markdown API', () => {
  const originalProjectDir = process.env.PROJECT_DIR;
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-markdown-api-'));
  const markdown = '# My Event\n\nEvent documentation.';

  beforeAll(() => {
    process.env.PROJECT_DIR = projectDir;
    const resourceDirectory = path.join(projectDir, 'domains', 'mydomain', 'events', 'MyEvent');
    fs.mkdirSync(resourceDirectory, { recursive: true });
    fs.writeFileSync(path.join(resourceDirectory, 'index.mdx'), markdown);
  });

  afterAll(() => {
    if (originalProjectDir === undefined) {
      delete process.env.PROJECT_DIR;
    } else {
      process.env.PROJECT_DIR = originalProjectDir;
    }
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it.each([
    ['.md', getMarkdown],
    ['.mdx', getMdx],
  ])('reads the %s resource from PROJECT_DIR when Astro provides a relative file path', async (_extension, get) => {
    const response = await get({
      params: { type: 'events', id: 'MyEvent', version: '1.0.0' },
      props: {},
    } as any);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(markdown);
  });
});
