import fs from 'fs/promises';
import matter from 'gray-matter';
import { CatalogFile } from '../scanner';
import { locateParseError } from '../utils/locations';

export interface ParsedFile {
  file: CatalogFile;
  frontmatter: Record<string, unknown>;
  content: string;
  raw: string;
}

export interface ParseError {
  file: CatalogFile;
  error: Error;
  /** 1-based line of the parse problem, when it could be determined */
  line?: number;
  /** 1-based column of the parse problem, when it could be determined */
  column?: number;
}

export const parseFrontmatter = async (file: CatalogFile): Promise<ParsedFile | ParseError> => {
  let fileContent: string;
  try {
    fileContent = await fs.readFile(file.path, 'utf-8');
  } catch (error) {
    return { file, error: error instanceof Error ? error : new Error(String(error)) };
  }

  try {
    const { data, content } = matter(fileContent);

    return {
      file,
      frontmatter: data,
      content,
      raw: fileContent,
    };
  } catch (error) {
    const location = locateParseError(fileContent);
    return {
      file,
      error: error instanceof Error ? error : new Error(String(error)),
      ...(location ? { line: location.line, column: location.column } : {}),
    };
  }
};

export const parseAllFiles = async (
  files: CatalogFile[]
): Promise<{
  parsed: ParsedFile[];
  errors: ParseError[];
}> => {
  const results = await Promise.all(files.map(parseFrontmatter));

  const parsed: ParsedFile[] = [];
  const errors: ParseError[] = [];

  for (const result of results) {
    if ('error' in result) {
      errors.push(result);
    } else {
      parsed.push(result);
    }
  }

  return { parsed, errors };
};
