// Simple structured logger for better observability

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private readonly context: string;
  private readonly isProduction: boolean;

  constructor(context: string) {
    this.context = context;
    this.isProduction = process.env.APP_ENV === 'production';
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level: level.toUpperCase(),
      context: this.context,
      message,
      ...context,
    };

    if (this.isProduction) {
      // JSON for production log aggregators
      return JSON.stringify(baseLog);
    }

    // Pretty print for development
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const paddedLevel = level.toUpperCase().padEnd(5);
    return `[${timestamp}] ${paddedLevel} [${this.context}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isProduction && process.env.DEBUG === 'true') {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    };
    console.error(this.formatMessage('error', message, errorContext));
  }

  // Discord-specific helpers
  discordCommand(command: string, user?: string): void {
    this.info('Discord command received', { command, user });
  }

  discordCommandSuccess(
    command: string,
    duration?: number,
    context?: LogContext
  ): void {
    this.info('Discord command completed', {
      command,
      duration: duration ? `${duration}ms` : undefined,
      ...context,
    });
  }

  discordCommandError(
    command: string,
    error: Error | unknown,
    context?: LogContext
  ): void {
    this.error('Discord command failed', error, { command, ...context });
  }

  // API-specific helpers
  apiRequest(method: string, path: string): void {
    this.info('API request', { method, path });
  }

  apiResponse(
    method: string,
    path: string,
    statusCode: number,
    duration?: number
  ): void {
    this.info('API response', {
      method,
      path,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  apiError(
    method: string,
    path: string,
    statusCode: number,
    error: Error | unknown
  ): void {
    this.error('API error', error, { method, path, statusCode });
  }
}

// Create logger instances for different contexts
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Predefined loggers for common contexts
export const logger = {
  server: createLogger('Server'),
  discord: createLogger('Discord'),
  api: createLogger('API'),
  github: createLogger('GitHub'),
  db: createLogger('Database'),
  worker: createLogger('Worker'),
};
