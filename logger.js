import pino from 'pino';

// Create logger with different configurations for dev vs production
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production'
    ? undefined // Use JSON in production
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
});

// Helper to create child loggers with context
export function createLogger(context) {
  return logger.child(context);
}

export default logger;
