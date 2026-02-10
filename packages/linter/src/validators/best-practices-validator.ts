import { ParsedFile } from '../parser';
import { ValidationError } from '../types';

export const validateBestPractices = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const parsedFile of parsedFiles) {
    const { file, frontmatter, content } = parsedFile;

    // Check for required summary
    if (!frontmatter.summary || (typeof frontmatter.summary === 'string' && frontmatter.summary.trim() === '')) {
      errors.push({
        type: 'schema',
        resource: `${file.resourceType}/${file.resourceId}`,
        field: 'summary',
        message: 'Summary is required for better documentation',
        file: file.relativePath,
        severity: 'error',
        rule: 'best-practices/summary-required',
      });
    }

    // Check for required owners (skip users and teams - they are owners, not owned)
    if (
      file.resourceType !== 'user' &&
      file.resourceType !== 'team' &&
      (!frontmatter.owners || !Array.isArray(frontmatter.owners) || frontmatter.owners.length === 0)
    ) {
      errors.push({
        type: 'schema',
        resource: `${file.resourceType}/${file.resourceId}`,
        field: 'owners',
        message: 'At least one owner is required',
        file: file.relativePath,
        severity: 'error',
        rule: 'best-practices/owner-required',
      });
    }

    // Check for required description (markdown body content)
    if (!content || content.trim() === '') {
      errors.push({
        type: 'schema',
        resource: `${file.resourceType}/${file.resourceId}`,
        field: 'description',
        message: 'Resource should have a markdown description (body content) beyond just frontmatter',
        file: file.relativePath,
        severity: 'warning',
        rule: 'best-practices/description-required',
      });
    }

    // Check for required schemaPath on messages (events, commands, queries)
    if (
      (file.resourceType === 'event' || file.resourceType === 'command' || file.resourceType === 'query') &&
      !frontmatter.schemaPath
    ) {
      errors.push({
        type: 'schema',
        resource: `${file.resourceType}/${file.resourceId}`,
        field: 'schemaPath',
        message: `${file.resourceType} should have a schemaPath defined for consumers to understand the contract`,
        file: file.relativePath,
        severity: 'warning',
        rule: 'best-practices/schema-required',
      });
    }
  }

  return errors;
};
