import fs from 'fs/promises';
import matter from 'gray-matter';
import { CatalogFile } from '../scanner';

export interface ParsedFile {
  file: CatalogFile;
  frontmatter: Record<string, unknown>;
  content: string;
  raw: string;
}

export interface ParseError {
  file: CatalogFile;
  error: Error;
}

export const parseFrontmatter = async (file: CatalogFile): Promise<ParsedFile | ParseError> => {
  try {
    const fileContent = await fs.readFile(file.path, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      file,
      frontmatter: data,
      content,
      raw: fileContent,
    };
  } catch (error) {
    return {
      file,
      error: error instanceof Error ? error : new Error(String(error)),
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
