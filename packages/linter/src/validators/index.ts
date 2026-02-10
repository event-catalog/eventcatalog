export * from './schema-validator';
export * from './reference-validator';
export * from './best-practices-validator';

import { ParsedFile } from '../parser';
import { ValidationError } from '../types';
import { CatalogDependencies } from '../config';
import { validateAllSchemas } from './schema-validator';
import {
  validateReferences,
  validateOrphanMessages,
  validateDeprecatedReferences,
  validateDuplicateResourceIds,
} from './reference-validator';
import { validateBestPractices } from './best-practices-validator';

export const validateCatalog = (parsedFiles: ParsedFile[], dependencies?: CatalogDependencies): ValidationError[] => {
  const schemaErrors = validateAllSchemas(parsedFiles);
  const referenceErrors = validateReferences(parsedFiles, dependencies);
  const orphanErrors = validateOrphanMessages(parsedFiles, dependencies);
  const deprecatedRefErrors = validateDeprecatedReferences(parsedFiles);
  const duplicateErrors = validateDuplicateResourceIds(parsedFiles);
  const bestPracticeErrors = validateBestPractices(parsedFiles);

  return [
    ...schemaErrors,
    ...referenceErrors,
    ...orphanErrors,
    ...deprecatedRefErrors,
    ...duplicateErrors,
    ...bestPracticeErrors,
  ];
};
