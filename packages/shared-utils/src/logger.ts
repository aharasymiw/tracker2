/**
 * Structured logger interface. Concrete implementations (pino, etc.) will live in
 * apps/server; packages should only depend on this interface.
 *
 * IMPORTANT: never log decrypted vault contents, raw key material, plaintext
 * passwords, session secrets, or PRNG seeds.
 */

export type LogMeta = Record<string, unknown>;

export interface Logger {
  trace(msg: string, meta?: LogMeta): void;
  debug(msg: string, meta?: LogMeta): void;
  info(msg: string, meta?: LogMeta): void;
  warn(msg: string, meta?: LogMeta): void;
  error(msg: string, meta?: LogMeta): void;
  fatal(msg: string, meta?: LogMeta): void;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Drops every log call. Useful for tests and deterministic replays.
 */
export class NoopLogger implements Logger {
  trace(_msg: string, _meta?: LogMeta): void {}
  debug(_msg: string, _meta?: LogMeta): void {}
  info(_msg: string, _meta?: LogMeta): void {}
  warn(_msg: string, _meta?: LogMeta): void {}
  error(_msg: string, _meta?: LogMeta): void {}
  fatal(_msg: string, _meta?: LogMeta): void {}
}

/**
 * Minimal stub that routes through console.*. Meant as a fallback or dev-only
 * logger; production apps should use a real structured logger.
 */
export class ConsoleLogger implements Logger {
  constructor(private readonly minLevel: LogLevel = 'info') {}

  private readonly levelOrder: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.minLevel];
  }

  private format(level: LogLevel, msg: string, meta?: LogMeta): string {
    const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
    if (meta && Object.keys(meta).length > 0) {
      return `${base} ${JSON.stringify(meta)}`;
    }
    return base;
  }

  trace(msg: string, meta?: LogMeta): void {
    if (this.shouldLog('trace')) console.debug(this.format('trace', msg, meta));
  }
  debug(msg: string, meta?: LogMeta): void {
    if (this.shouldLog('debug')) console.debug(this.format('debug', msg, meta));
  }
  info(msg: string, meta?: LogMeta): void {
    if (this.shouldLog('info')) console.info(this.format('info', msg, meta));
  }
  warn(msg: string, meta?: LogMeta): void {
    if (this.shouldLog('warn')) console.warn(this.format('warn', msg, meta));
  }
  error(msg: string, meta?: LogMeta): void {
    if (this.shouldLog('error')) console.error(this.format('error', msg, meta));
  }
  fatal(msg: string, meta?: LogMeta): void {
    if (this.shouldLog('fatal')) console.error(this.format('fatal', msg, meta));
  }
}
