import { z } from 'zod';
import { schemas } from '../schemas';
import { ParsedFile } from '../parser';
import { ValidationError } from '../types';
import { unwrapSchema } from '../utils/zod-schemas';

/** Name the type of a value the way the messages have always read, e.g. `received undefined` or `received array`. */
const describeReceived = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'number' && Number.isNaN(value)) return 'nan';
  return typeof value;
};

/**
 * Zod 4's z.object() accepts a Date and strips it to {}, where Zod 3 rejected it. Frontmatter parsing turns an unquoted
 * YAML date (e.g. `repository: 2026-10-14`) into a Date, so report the Dates found where an object is expected.
 */
const findDatesInObjectFields = (schema: z.ZodTypeAny, value: unknown, path: PropertyKey[] = []): z.core.$ZodIssue[] => {
  const inner = unwrapSchema(schema);

  if (value instanceof Date) {
    if (inner instanceof z.ZodObject) {
      return [{ code: 'invalid_type', expected: 'object', input: value, path, message: 'Invalid input' }];
    }
    if (inner instanceof z.ZodUnion) {
      // A union only takes the Date if one of its other (non-object) options does
      const options = inner.options as z.ZodTypeAny[];
      const accepted = options.some(
        (option) => !(unwrapSchema(option) instanceof z.ZodObject) && option.safeParse(value).success
      );
      return accepted ? [] : [{ code: 'invalid_union', errors: [], input: value, path, message: 'Invalid input' }];
    }
    return [];
  }

  if (inner instanceof z.ZodUnion) {
    const branch = (inner.options as z.ZodTypeAny[]).find((option) => option.safeParse(value).success);
    return branch ? findDatesInObjectFields(branch, value, path) : [];
  }
  if (inner instanceof z.ZodArray && Array.isArray(value)) {
    return value.flatMap((item, index) => findDatesInObjectFields(inner.element as z.ZodTypeAny, item, [...path, index]));
  }
  if (inner instanceof z.ZodObject && value && typeof value === 'object' && !Array.isArray(value)) {
    const shape = inner.shape as Record<string, z.ZodTypeAny>;
    return Object.entries(value).flatMap(([key, child]) =>
      shape[key] ? findDatesInObjectFields(shape[key], child, [...path, key]) : []
    );
  }
  if (inner instanceof z.ZodRecord && value && typeof value === 'object' && !Array.isArray(value)) {
    const valueType = inner.valueType as z.ZodTypeAny;
    return Object.entries(value).flatMap(([key, child]) => findDatesInObjectFields(valueType, child, [...path, key]));
  }
  return [];
};

export const validateSchema = (parsedFile: ParsedFile): ValidationError[] => {
  const { file, frontmatter } = parsedFile;
  const schema = schemas[file.resourceType];
  const errors: ValidationError[] = [];

  try {
    // reportInput keeps the failing value on each issue, so messages can say what was received
    const result = schema.safeParse(frontmatter, { reportInput: true });
    const dateIssues = findDatesInObjectFields(schema, frontmatter);
    // A Date in an object field is the error there: drop what Zod reported about the {} it was stripped to
    const isUnderDate = (issue: z.core.$ZodIssue) =>
      dateIssues.some((dateIssue) => dateIssue.path.every((key, index) => issue.path[index] === key));
    const issues = [...(result.success ? [] : result.error.issues.filter((issue) => !isUnderDate(issue))), ...dateIssues];
    if (issues.length > 0) throw new z.ZodError(issues);
  } catch (error) {
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        let message = issue.message;
        // A date that doesn't parse is reported as an invalid date, not as a type error
        const isInvalidDate = issue.code === 'invalid_type' && issue.input instanceof Date && Number.isNaN(issue.input.getTime());
        // Literals and enums both fail as invalid_value; the schemas have no single-value enums, so one value is a literal
        const isInvalidLiteral = issue.code === 'invalid_value' && issue.values.length === 1;
        // An enum given a missing or non-string value is a type error, listing the allowed values as the expected type
        const isEnumTypeError = issue.code === 'invalid_value' && !isInvalidLiteral && typeof issue.input !== 'string';

        if (isInvalidDate) {
          message = 'Invalid date';
        } else if (issue.code === 'invalid_type') {
          // Records (key/value maps) have always been described as objects
          const expected = issue.expected === 'record' ? 'object' : issue.expected;
          message = `Expected ${expected}, but received ${describeReceived(issue.input)}`;
        } else if (isInvalidLiteral) {
          message = `Invalid literal value, expected ${JSON.stringify(issue.values[0])}`;
        } else if (issue.code === 'invalid_value') {
          const allowed = issue.values.map((value) => `'${String(value)}'`).join(' | ');
          message = isEnumTypeError
            ? `Expected ${allowed}, but received ${describeReceived(issue.input)}`
            : `Invalid enum value. Expected ${allowed}, received '${String(issue.input)}'`;
        } else if (issue.code === 'invalid_format' && issue.format === 'email') {
          message = 'Invalid email';
        } else if (issue.code === 'invalid_format' && issue.format === 'url') {
          message = 'Invalid url';
        }

        let rule = 'schema/required-fields';
        if ((issue.code === 'invalid_type' && !isInvalidDate) || isEnumTypeError) {
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
