import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? 'info' : 'debug';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport for all logs
  new winston.transports.Console(),
  
  // File transport for error logs
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  
  // File transport for all logs
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Ensure log directory exists
import fs from 'fs';
import path from 'path';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Export a simplified logger interface for easy use
export default {
  error: (message: string, meta?: any) => logger.error(formatMessage(message, meta)),
  warn: (message: string, meta?: any) => logger.warn(formatMessage(message, meta)),
  info: (message: string, meta?: any) => logger.info(formatMessage(message, meta)),
  http: (message: string, meta?: any) => logger.http(formatMessage(message, meta)),
  debug: (message: string, meta?: any) => logger.debug(formatMessage(message, meta)),
};

// Helper function to format messages with metadata
function formatMessage(message: string, meta?: any): string {
  if (!meta) return message;
  
  try {
    if (typeof meta === 'object') {
      return `${message} ${JSON.stringify(meta)}`;
    } else {
      return `${message} ${meta}`;
    }
  } catch (error) {
    return `${message} [Unserializable data]`;
  }
}
