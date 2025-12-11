/**
 * Centralized logging utility
 * Provides consistent logging with environment-based controls
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

/**
 * Logger class for structured logging
 */
class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private log(level: LogLevel, ...args: any[]) {
    // Suppress logs in test environment unless explicitly enabled
    if (isTest && !import.meta.env.VITE_ENABLE_TEST_LOGS) {
      return;
    }

    // In production, only log warnings and errors
    if (!isDevelopment && (level === 'debug' || level === 'info')) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.context}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
    }
  }

  debug(...args: any[]) {
    this.log('debug', ...args);
  }

  info(...args: any[]) {
    this.log('info', ...args);
  }

  warn(...args: any[]) {
    this.log('warn', ...args);
  }

  error(...args: any[]) {
    this.log('error', ...args);
  }
}

/**
 * Create a logger instance for a specific context
 * @param context - Context identifier (e.g., 'GeminiService', 'PrinterService')
 * @returns Logger instance
 */
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

/**
 * Default logger instance
 */
export const logger = new Logger('App');
