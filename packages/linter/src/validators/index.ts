export * from './schema-validator';
export * from './reference-validator';
export * from './best-practices-validator';
export * from './unknown-field-validator';
export * from './structure-validator';
export * from './file-validator';

import { ParsedFile } from '../parser';
import { ValidationError } from '../types';
import { CatalogDependencies, LinterConfig } from '../config';
import { validateAllSchemas } from './schema-validator';
import {
  validateReferences,
  validateOrphanMessages,
  validateDeprecatedReferences,
  validateDuplicateResourceIds,
} from './reference-validator';
import { validateBestPractices } from './best-practices-validator';
import { validateUnknownFields } from './unknown-field-validator';
import { validateFileReferences } from './file-validator';

export const validateCatalog = (
  parsedFiles: ParsedFile[],
  dependencies?: CatalogDependencies,
  config?: LinterConfig
): ValidationError[] => {
  const schemaErrors = validateAllSchemas(parsedFiles);
  const unknownFieldErrors = validateUnknownFields(parsedFiles, config);
  const fileErrors = validateFileReferences(parsedFiles, config);
  const referenceErrors = validateReferences(parsedFiles, dependencies);
  const orphanErrors = validateOrphanMessages(parsedFiles, dependencies);
  const deprecatedRefErrors = validateDeprecatedReferences(parsedFiles);
  const duplicateErrors = validateDuplicateResourceIds(parsedFiles);
  const bestPracticeErrors = validateBestPractices(parsedFiles);

  return [
    ...schemaErrors,
    ...unknownFieldErrors,
    ...fileErrors,
    ...referenceErrors,
    ...orphanErrors,
    ...deprecatedRefErrors,
    ...duplicateErrors,
    ...bestPracticeErrors,
  ];
};
