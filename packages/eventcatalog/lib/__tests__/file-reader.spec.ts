import path from 'path';
import fs from 'fs';
import { getSchemaFromDir, getLastModifiedDateOfFile, getOpenAPISpecFromDir } from '../file-reader';

let PROJECT_DIR: any;

describe('file-reader lib', () => {
  beforeAll(() => {
    PROJECT_DIR = process.env.PROJECT_DIR;
    process.env.PROJECT_DIR = path.join(__dirname, 'assets');
  });

  afterAll(() => {
    process.env.PROJECT_DIR = PROJECT_DIR;
  });

  describe('getSchemaFromDir', () => {
    it('returns the schema file found in the given directory path', () => {
      const rawSchemaFile = fs.readFileSync(
        path.join(process.env.PROJECT_DIR, 'events', 'EventWithSchemaAndExamples', 'schema.json'),
        { encoding: 'utf-8' }
      );

      const result = getSchemaFromDir(path.join(process.env.PROJECT_DIR, 'events', 'EventWithSchemaAndExamples'));

      expect(result.snippet).toEqual(rawSchemaFile);
      expect(result.language).toEqual('json');
    });

    it('returns null when no schema file can be found in the given directory path', () => {
      const result = getSchemaFromDir(path.join(process.env.PROJECT_DIR, 'events', 'EmailSent'));

      expect(result).toEqual(null);
    });
  });

  describe('getOpenAPISpecFromDir', () => {
    it('returns the OPEN API file found in the given directory path', () => {
      const rawFile = fs.readFileSync(path.join(process.env.PROJECT_DIR, 'services', 'Payment Service', 'openapi.yaml'), {
        encoding: 'utf-8',
      });

      const result = getOpenAPISpecFromDir(path.join(process.env.PROJECT_DIR, 'services', 'Payment Service'));

      expect(result).toEqual(rawFile);
    });

    it('returns null when no schema file can be found in the given directory path', () => {
      const result = getSchemaFromDir(path.join(process.env.PROJECT_DIR, 'services', 'Email Service'));

      expect(result).toEqual(null);
    });
  });

  describe('getLastModifiedDateOfFile', () => {
    it('returns the date the given file was last modified', () => {
      const result = getLastModifiedDateOfFile(
        path.join(process.env.PROJECT_DIR, 'events', 'EventWithSchemaAndExamples', 'schema.json')
      );

      const stats = fs.statSync(path.join(process.env.PROJECT_DIR, 'events', 'EventWithSchemaAndExamples', 'schema.json'));

      const fileData = new Date(stats.mtime);
      const expectedResult = `${fileData.getFullYear()}/${fileData.getMonth() + 1}/${fileData.getDate()}`;

      expect(result).toEqual(expectedResult);
    });
  });
});
