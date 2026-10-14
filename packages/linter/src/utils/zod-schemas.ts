import { z } from 'zod';

/** Strip wrappers (optional / nullable / default / pipes / lazy) to get at the underlying schema. */
export const unwrapSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  let current: z.ZodTypeAny = schema;
  // Bounded loop guards against a malformed schema cycling forever
  for (let i = 0; i < 20; i++) {
    if (
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable ||
      current instanceof z.ZodDefault ||
      current instanceof z.ZodLazy
    ) {
      current = current.unwrap() as z.ZodTypeAny;
    } else if (current instanceof z.ZodPipe) {
      // .transform() pipes the schema into a transform, z.preprocess() pipes a transform into the schema
      current = (current.in instanceof z.ZodTransform ? current.out : current.in) as z.ZodTypeAny;
    } else {
      break;
    }
  }
  return current;
};
