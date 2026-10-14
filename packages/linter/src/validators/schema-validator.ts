import { z } from 'zod';
import { schemas } from '../schemas';
import { ParsedFile } from '../parser';
import { ValidationError } from '../types';

/** Name the type of a value the way the messages have always read, e.g. `received undefined` or `received array`. */
const describeReceived = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'number' && Number.isNaN(value)) return 'nan';
  return typeof value;
};

export const validateSchema = (parsedFile: ParsedFile): ValidationError[] => {
  const { file, frontmatter } = parsedFile;
  const schema = schemas[file.resourceType];
  const errors: ValidationError[] = [];

  try {
    // reportInput keeps the failing value on each issue, so messages can say what was received
    schema.parse(frontmatter, { reportInput: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        let message = issue.message;
        // A date that doesn't parse is reported as an invalid date, not as a type error
        const isInvalidDate = issue.code === 'invalid_type' && issue.input instanceof Date && Number.isNaN(issue.input.getTime());
        // A missing enum or literal field reports the allowed values, like any other missing field
        const isMissingValue = issue.code === 'invalid_value' && issue.input === undefined;

        if (isInvalidDate) {
          message = 'Invalid date';
        } else if (issue.code === 'invalid_type') {
          // Records (key/value maps) have always been described as objects
          const expected = issue.expected === 'record' ? 'object' : issue.expected;
          message = `Expected ${expected}, but received ${describeReceived(issue.input)}`;
        } else if (issue.code === 'invalid_value') {
          const allowed = issue.values.map((value) => `'${String(value)}'`).join(' | ');
          message = isMissingValue
            ? `Expected ${allowed}, but received undefined`
            : `Invalid enum value. Expected ${allowed}, received '${String(issue.input)}'`;
        } else if (issue.code === 'invalid_format' && issue.format === 'email') {
          message = 'Invalid email';
        }

        let rule = 'schema/required-fields';
        if ((issue.code === 'invalid_type' && !isInvalidDate) || isMissingValue) {
          rule = 'schema/valid-type';
        } else if (issue.code === 'invalid_format' && issue.format === 'email') {
          rule = 'schema/valid-email';
        } else if (field && field.includes('version')) {
          rule = 'schema/valid-semver';
        }

        errors.push({
          type: 'schema',
          resource: `${file.resourceType}/${file.resourceId}`,
          field: field || undefined,
          message: field ? `${field}: ${message}` : message,
          file: file.relativePath,
          rule,
        });
      }
    } else {
      errors.push({
        type: 'schema',
        resource: `${file.resourceType}/${file.resourceId}`,
        message: error instanceof Error ? error.message : String(error),
        file: file.relativePath,
        rule: 'schema/validation-error',
      });
    }
  }

  return errors;
};

export const validateAllSchemas = (parsedFiles: ParsedFile[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const parsedFile of parsedFiles) {
    errors.push(...validateSchema(parsedFile));
  }

  return errors;
};
