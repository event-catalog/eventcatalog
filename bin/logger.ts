type LoggerLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export const levels: Record<LoggerLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90,
};

export class Logger {
  readonly level: LoggerLevel;

  constructor(opts: Partial<{ level: LoggerLevel }> = {}) {
    this.level = opts.level ?? 'info';
  }

  private isLogLevelEnabled(level: LoggerLevel): boolean {
    return levels[this.level] <= levels[level];
  }

  debug(...data: any[]): void {
    if (this.isLogLevelEnabled('debug')) {
      console.debug(...data);
    }
  }

  info(...data: any[]): void {
    if (this.isLogLevelEnabled('info')) {
      console.info(...data);
    }
  }

  warn(...data: any[]): void {
    if (this.isLogLevelEnabled('warn')) {
      console.warn(...data);
    }
  }

  error(...data: any[]): void {
    if (this.isLogLevelEnabled('error')) {
      console.error(...data);
    }
  }
}
