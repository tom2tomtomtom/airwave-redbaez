/**
 * Logging utility for consistent logging across the application
 */
// @ts-nocheck
// @ts-ignore - We need to import winston this way due to incompatible typings
import * as winston from 'winston';

// Extend the Winston TransformableInfo interface
interface LogEntry extends winston.Logform.TransformableInfo {
  timestamp: string;
  [key: string]: any;
}

// Define log format
const logFormat = winston.format.printf((info: LogEntry) => {
  const { level, message, timestamp, ...metadata } = info;
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create the logger
// Create the logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      dirname: 'logs' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log',
      dirname: 'logs'
    })
  ]
});

// Create a directory for logs if it doesn't exist
import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Create a logger with a specific context
 * @param context The context for the logger (e.g., the service or component name)
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, meta?: Record<string, any>) => {
      logger.debug(`[${context}] ${message}`, meta);
    },
    info: (message: string, meta?: Record<string, any>) => {
      logger.info(`[${context}] ${message}`, meta);
    },
    warn: (message: string, meta?: Record<string, any>) => {
      logger.warn(`[${context}] ${message}`, meta);
    },
    error: (message: string, meta?: Record<string, any>) => {
      logger.error(`[${context}] ${message}`, meta);
    }
  };
}
