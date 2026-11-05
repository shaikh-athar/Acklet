// packages/shared/src/tool-logger.ts

export type ToolLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVEL_PRIORITY: Record<ToolLogLevel, number> = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  none: 5
};

/**
 * Scoped, branded logger utility for Acklet client tools.
 * Allows easy debugging in development with support for turning off
 * or filtering low-priority logs in production.
 */
export class ToolLogger {
  constructor(private readonly prefix: string) {}

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`%c[${this.prefix}] [DEBUG]`, 'color: #94A3B8; font-weight: bold;', message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`%c[${this.prefix}] [INFO]`, 'color: #8B5CF6; font-weight: bold;', message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`%c[${this.prefix}] [WARN]`, 'color: #F59E0B; font-weight: bold;', message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`%c[${this.prefix}] [ERROR]`, 'color: #EF4444; font-weight: bold;', message, ...args);
    }
  }

  private shouldLog(level: ToolLogLevel): boolean {
    if (typeof window === 'undefined') return true;

    const win = window as any;
    const runtimeOverride: ToolLogLevel | undefined = win.__ACKLET_LOG_LEVEL__;
    const storageOverride = (win.localStorage?.getItem('acklet.log_level') || '').toLowerCase() as ToolLogLevel;
    const activeLevel: ToolLogLevel = runtimeOverride || (storageOverride in LOG_LEVEL_PRIORITY ? storageOverride : 'debug');

    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[activeLevel];
  }
}

/**
 * Creates a scoped logger with the given tool or component prefix.
 * Example: const log = createToolLogger('TempEmail');
 */
export function createToolLogger(prefix: string): ToolLogger {
  return new ToolLogger(prefix);
}

