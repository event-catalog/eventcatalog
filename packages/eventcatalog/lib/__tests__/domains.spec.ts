import path from 'path';
import { getAllServiceNames } from '../domains';

let PROJECT_DIR: any;

describe('events lib', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR;
    process.env.PROJECT_DIR = path.join(__dirname, 'assets');
  });

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR;
  });

  describe('getAllServiceNames', () => {
    it('returns unique list of service names from all events and services within the catalog', async () => {
      const result = await getAllServiceNames();
      expect(result).toEqual(['Shopping', 'Email']);
    });
  });
});
