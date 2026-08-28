import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ParsedFile } from '../parser';
import { ValidationError } from '../types';
import { LinterConfig, getEffectiveRules } from '../config';

/**
 * Checks that files referenced from frontmatter actually exist on disk.
 *
 * Mirrors how EventCatalog core resolves each reference:
 *  - `schemaPath`, `schemas[].file`, `schemas[].path`, `specifications` paths and
 *    data product `outputs[].contract.path` are relative to the resource's own folder
 *  - `schemas[].ref` may be a `file://<relative>` or `file:///<absolute>` reference
 *  - `styles.icon` values starting with `/` are served from the catalog's `public/` folder
 *
 * Rule: `refs/file-exists`
 */

export const FILE_EXISTS_RULE = 'refs/file-exists';

export interface FileExistsOptions {
  /** Check `styles.icon` paths against the `public/` folder. Defaults to true. */
  icons?: boolean;
  /** Folder (relative to the catalog root) that static assets are served from. Defaults to `public`. */
  publicDir?: string;
}

export type FileReferenceKind = 'schema' | 'specification' | 'contract' | 'icon';

export interface FileReference {
  /** Frontmatter path the value came from, e.g. `schemas[0].file` */
  field: string;
  /** The raw value from the frontmatter */
  value: string;
  /** Absolute path the value resolves to */
  resolvedPath: string;
  kind: FileReferenceKind;
}

const FILE_REF_PREFIX = 'file://';

const isRemote = (value: string): boolean => /^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !value.startsWith(FILE_REF_PREFIX);

const asString = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

/** Resolves `file://` schema refs the same way core does. Returns undefined for anything else. */
const resolveFileRef = (ref: string, resourceDir: string): string | undefined => {
  if (!ref.startsWith(FILE_REF_PREFIX)) return undefined;

  if (ref.startsWith('file:///') || ref.startsWith('file://localhost/')) {
    try {
      return fileURLToPath(ref);
    } catch {
      return undefined;
    }
  }

  const relative = decodeURIComponent(ref.slice(FILE_REF_PREFIX.length));
  return relative ? path.resolve(resourceDir, relative) : undefined;
};

/** Derives the catalog root from a scanned file (its absolute path minus its relative path). */
export const getCatalogRoot = (parsedFile: ParsedFile): string => {
  const { path: absolutePath, relativePath } = parsedFile.file;
  const normalisedAbsolute = absolutePath.replace(/\\/g, '/');
  const normalisedRelative = relativePath.replace(/\\/g, '/');
  if (normalisedAbsolute.endsWith(normalisedRelative)) {
    return absolutePath.slice(0, absolutePath.length - relativePath.length).replace(/[\\/]+$/, '') || path.sep;
  }
  return path.dirname(absolutePath);
};

export const extractFileReferences = (parsedFile: ParsedFile, options: FileExistsOptions = {}): FileReference[] => {
  const { file, frontmatter } = parsedFile;
  const resourceDir = path.dirname(file.path);
  const references: FileReference[] = [];

  const addLocal = (field: string, value: unknown, kind: FileReferenceKind) => {
    const str = asString(value);
    if (!str || isRemote(str)) return;
    references.push({ field, value: str, resolvedPath: path.resolve(resourceDir, str), kind });
  };

  // schemaPath: <resource dir>/<schemaPath>
  addLocal('schemaPath', frontmatter.schemaPath, 'schema');

  // schemas[]: file / path are relative to the resource, ref may be a file:// url
  if (Array.isArray(frontmatter.schemas)) {
    frontmatter.schemas.forEach((schema, index) => {
      if (!schema || typeof schema !== 'object') return;
      const entry = schema as Record<string, unknown>;
      if (asString(entry.file)) {
        addLocal(`schemas[${index}].file`, entry.file, 'schema');
      } else if (asString(entry.path)) {
        addLocal(`schemas[${index}].path`, entry.path, 'schema');
      }
      const ref = asString(entry.ref);
      if (ref) {
        const resolved = resolveFileRef(ref, resourceDir);
        if (resolved) {
          references.push({ field: `schemas[${index}].ref`, value: ref, resolvedPath: resolved, kind: 'schema' });
        }
      }
    });
  }

  // specifications: object form (openapiPath / asyncapiPath / graphqlPath) or array form ({ type, path })
  const specifications = frontmatter.specifications;
  if (Array.isArray(specifications)) {
    specifications.forEach((spec, index) => {
      if (!spec || typeof spec !== 'object') return;
      addLocal(`specifications[${index}].path`, (spec as Record<string, unknown>).path, 'specification');
    });
  } else if (specifications && typeof specifications === 'object') {
    const spec = specifications as Record<string, unknown>;
    for (const key of ['openapiPath', 'asyncapiPath', 'graphqlPath']) {
      addLocal(`specifications.${key}`, spec[key], 'specification');
    }
  }

  // data product output contracts
  if (file.resourceType === 'dataProduct' && Array.isArray(frontmatter.outputs)) {
    frontmatter.outputs.forEach((output, index) => {
      if (!output || typeof output !== 'object') return;
      const contract = (output as Record<string, unknown>).contract;
      if (!contract || typeof contract !== 'object') return;
      addLocal(`outputs[${index}].contract.path`, (contract as Record<string, unknown>).path, 'contract');
    });
  }

  // styles.icon: "/icons/foo.svg" is served from public/
  if (options.icons !== false && frontmatter.styles && typeof frontmatter.styles === 'object') {
    const icon = asString((frontmatter.styles as Record<string, unknown>).icon);
    if (icon && icon.startsWith('/') && !icon.startsWith('//')) {
      const publicDir = path.resolve(getCatalogRoot(parsedFile), options.publicDir || 'public');
      references.push({
        field: 'styles.icon',
        value: icon,
        resolvedPath: path.join(publicDir, ...icon.split('/').filter(Boolean)),
        kind: 'icon',
      });
    }
  }

  return references;
};

const KIND_LABELS: Record<FileReferenceKind, string> = {
  schema: 'schema file',
  specification: 'specification file',
  contract: 'contract file',
  icon: 'icon',
};

const fileExists = (filePath: string): boolean => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveOptions = (parsedFile: ParsedFile, config?: LinterConfig): FileExistsOptions => {
  if (!config) return {};
  const rules = getEffectiveRules(parsedFile.file.relativePath, config);
  return (rules[FILE_EXISTS_RULE]?.options as FileExistsOptions) || {};
};

export const validateFileReferencesForFile = (parsedFile: ParsedFile, options: FileExistsOptions = {}): ValidationError[] => {
  const { file } = parsedFile;
  const catalogRoot = getCatalogRoot(parsedFile);
  const errors: ValidationError[] = [];

  for (const reference of extractFileReferences(parsedFile, options)) {
    if (fileExists(reference.resolvedPath)) continue;

    const resolvedRelative = path.relative(catalogRoot, reference.resolvedPath).replace(/\\/g, '/');
    const location = resolvedRelative.startsWith('..') ? reference.resolvedPath : resolvedRelative;

    errors.push({
      type: 'reference',
      resource: `${file.resourceType}/${file.resourceId}`,
      field: reference.field,
      message: `Referenced ${KIND_LABELS[reference.kind]} "${reference.value}" does not exist (looked for "${location}")`,
      file: file.relativePath,
      severity: 'error',
      rule: FILE_EXISTS_RULE,
    });
  }

  return errors;
};

export const validateFileReferences = (parsedFiles: ParsedFile[], config?: LinterConfig): ValidationError[] => {
  return parsedFiles.flatMap((parsedFile) => validateFileReferencesForFile(parsedFile, resolveOptions(parsedFile, config)));
};
