export type CompatibilityStrategy = 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE';

export type SchemaChangeType =
  | 'FIELD_ADDED_REQUIRED'
  | 'FIELD_ADDED_OPTIONAL'
  | 'FIELD_REMOVED_REQUIRED'
  | 'FIELD_REMOVED_OPTIONAL'
  | 'TYPE_CHANGED'
  | 'REQUIRED_ADDED'
  | 'REQUIRED_REMOVED';

export type SchemaChange = {
  type: SchemaChangeType;
  field: string;
  message: string;
  previousType?: string;
  currentType?: string;
};

export type BreakingChange = SchemaChange & {
  breaking: true;
};
