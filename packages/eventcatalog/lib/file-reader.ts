import fs from 'fs';
import path from 'path';
import type { Schema, OAS } from '@eventcatalog/types';
import matter from 'gray-matter';

// https://github.com/react-syntax-highlighter/react-syntax-highlighter/blob/master/AVAILABLE_LANGUAGES_HLJS.MD
export const extentionToLanguageMap = {
  cs: 'csharp',
  js: 'javascript',
  json: 'json',
  yml: 'yml',
  java: 'java',
  pb: 'protobuf',
  proto: 'protobuf',
  thrift: 'thrift',
};

export const readMarkdownFile = (pathToFile: string) => {
  const file = fs.readFileSync(pathToFile, {
    encoding: 'utf-8',
  });
  return matter(file);
};

export const getSchemaFromDir = (pathToSchemaDir: string): Schema => {
  try {
    const files = fs.readdirSync(pathToSchemaDir);

    // See if any schemas are in there, ignoring extension
    const schemaFileName = files.find((fileName) => fileName.includes('schema'));
    if (!schemaFileName) throw new Error('No schema found');

    const schemaFile = fs.readFileSync(path.join(pathToSchemaDir, schemaFileName), 'utf-8');
    const extension = schemaFileName.split('.').pop();

    return {
      snippet: `${schemaFile}`,
      language: extentionToLanguageMap[extension] || extension,
      extension,
    };
  } catch (error) {
    return null;
  }
};

export const getOASFromDir = (pathToOASDir: string): OAS => {
  try {
    const files = fs.readdirSync(pathToOASDir);

    // See if any oas are in there, ignoring extension
    const oasFileName = files.find((fileName) => fileName.includes('oas'));
    if (!oasFileName) throw new Error('No schema found');

    const oasFile = fs.readFileSync(path.join(pathToOASDir, oasFileName), 'utf-8');
    const extension = oasFileName.split('.').pop();

    return {
      snippet: `${oasFile}`,
      language: extentionToLanguageMap[extension] || extension,
      extension,
    };
  } catch (error) {
    return null;
  }
};

export const getLastModifiedDateOfFile = (filePath) => {
  const stats = fs.statSync(filePath);
  const lastModifiedDate = new Date(stats.mtime);
  return `${lastModifiedDate.getFullYear()}/${lastModifiedDate.getMonth() + 1}/${lastModifiedDate.getDate()}`;
};
