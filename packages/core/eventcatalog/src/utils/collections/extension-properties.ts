import { z } from 'astro/zod';

export const EXTENSION_PROPERTY_PREFIX = 'x-';

export const withExtensionProperties = <Shape extends z.core.$ZodShape, Config extends z.core.$ZodObjectConfig>(
  schema: z.ZodObject<Shape, Config>
) => {
  const knownProperties = new Set(Object.keys(schema.shape));

  return schema.catchall(z.unknown()).superRefine((data, context) => {
    for (const property of Object.keys(data)) {
      const isKnownProperty = knownProperties.has(property);
      const isExtensionProperty =
        property.startsWith(EXTENSION_PROPERTY_PREFIX) && property.length > EXTENSION_PROPERTY_PREFIX.length;

      if (!isKnownProperty && !isExtensionProperty) {
        context.addIssue({
          code: 'custom',
          path: [property],
          message: `Unknown property "${property}". Custom properties must start with "${EXTENSION_PROPERTY_PREFIX}".`,
        });
      }
    }
  });
};
