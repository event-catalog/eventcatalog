import { generate } from '../generate';
import config from './assets/eventcatalog.config';

import path from 'path';

beforeEach(() => {
  jest.resetModules();
});

const mockPlugin = jest.fn();

jest.mock('@eventcatalog/plugin-doc-generator-asyncapi', () => ({
  __esModule: true, // this property makes it work
  default: mockPlugin,
  namedExport: jest.fn(),
}));

let PROJECT_DIR: any;

describe('generate script', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR;
    process.env.PROJECT_DIR = path.join(__dirname, 'assets');
  });

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR;
  });

  it('gets all generators from the `eventcatalog.config.js` file and runs them', async () => {
    await generate();

    expect(mockPlugin).toHaveBeenCalled();
    expect(mockPlugin).toHaveBeenCalledWith({ eventCatalogConfig: config }, { file: './asyncapi.yml' });
  });
});
