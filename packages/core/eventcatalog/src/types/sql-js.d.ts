declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: unknown[]): Database;
    prepare(sql: string): {
      bind(params?: unknown[]): boolean;
      step(): boolean;
      getAsObject(): Record<string, unknown>;
      get(): unknown[];
      free(): boolean;
    };
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
    wasmBinary?: ArrayBuffer;
  }): Promise<SqlJsStatic>;
}
