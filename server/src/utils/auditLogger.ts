/**
 * Security Audit Logger for the AIrWAVE platform
 * Provides detailed logging of security-relevant events for compliance and forensics
 */
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE = 'AUTH_LOGIN_FAILURE',
  LOGOUT = 'AUTH_LOGOUT',
  PASSWORD_CHANGE = 'AUTH_PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'AUTH_PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'AUTH_PASSWORD_RESET_COMPLETE',
  TOKEN_REFRESH = 'AUTH_TOKEN_REFRESH',
  
  // Authorization events
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  ELEVATED_PRIVILEGE_USE = 'ELEVATED_PRIVILEGE_USE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  
  // Resource access events
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  RESOURCE_CREATED = 'RESOURCE_CREATED',
  RESOURCE_UPDATED = 'RESOURCE_UPDATED',
  RESOURCE_DELETED = 'RESOURCE_DELETED',
  
  // Security events
  CSRF_VIOLATION = 'SECURITY_CSRF_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'SECURITY_RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SECURITY_SUSPICIOUS_ACTIVITY',
  CONFIG_CHANGE = 'SECURITY_CONFIG_CHANGE',
  API_KEY_GENERATED = 'SECURITY_API_KEY_GENERATED',
  API_KEY_REVOKED = 'SECURITY_API_KEY_REVOKED',
  SECURITY_HEADERS_APPLIED = 'SECURITY_HEADERS_APPLIED',
  
  // System events
  SERVER_START = 'SYSTEM_SERVER_START',
  SERVER_STOP = 'SYSTEM_SERVER_STOP',
  BACKUP_CREATED = 'SYSTEM_BACKUP_CREATED',
  DB_MIGRATION = 'SYSTEM_DB_MIGRATION'
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  timestamp: string;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceId?: string;
  resourceType?: string;
  action?: string;
  status: 'success' | 'failure';
  details?: any;
  requestId?: string;
  sessionId?: string;
}

/**
 * Maximum size for security audit log file before rotation (in bytes)
 * Default: 50MB
 */
const MAX_LOG_SIZE = 50 * 1024 * 1024;

/**
 * Maximum number of log files to keep
 */
const MAX_LOG_FILES = 10;

/**
 * Audit log directory
 */
const AUDIT_LOG_DIR = process.env.AUDIT_LOG_DIR || path.join(process.cwd(), 'logs', 'audit');

/**
 * Ensure audit log directory exists
 */
function ensureLogDirectory() {
  if (!fs.existsSync(AUDIT_LOG_DIR)) {
    fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
  }
}

/**
 * Get current audit log file path
 */
function getAuditLogPath(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(AUDIT_LOG_DIR, `audit-${date}.log`);
}

/**
 * Rotate log files if needed
 */
function rotateLogFilesIfNeeded(logPath: string): void {
  try {
    if (!fs.existsSync(logPath)) {
      return;
    }
    
    const stats = fs.statSync(logPath);
    if (stats.size >= MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = `${logPath}.${timestamp}`;
      fs.renameSync(logPath, rotatedPath);
      
      // Clean up old log files if we have too many
      cleanupOldLogFiles();
    }
  } catch (error) {
    logger.error('Error rotating audit log files:', error);
  }
}

/**
 * Clean up old log files
 */
function cleanupOldLogFiles(): void {
  try {
    const files = fs.readdirSync(AUDIT_LOG_DIR)
      .filter(file => file.startsWith('audit-') && file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(AUDIT_LOG_DIR, file),
        time: fs.statSync(path.join(AUDIT_LOG_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // Keep only the MAX_LOG_FILES most recent files
    if (files.length > MAX_LOG_FILES) {
      files.slice(MAX_LOG_FILES).forEach(file => {
        fs.unlinkSync(file.path);
        logger.debug(`Deleted old audit log file: ${file.name}`);
      });
    }
  } catch (error) {
    logger.error('Error cleaning up old audit log files:', error);
  }
}

/**
 * Log a security audit event
 */
export function logAuditEvent(event: AuditLogEntry): void {
  try {
    // Ensure audit log directory exists
    ensureLogDirectory();
    
    // Get current log file path
    const logPath = getAuditLogPath();
    
    // Rotate log files if needed
    rotateLogFilesIfNeeded(logPath);
    
    // Format the audit entry with ISO timestamp if not already provided
    const entry = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };
    
    // Write to audit log file
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    
    // Also log to application logger at appropriate level
    const logMessage = `AUDIT: ${entry.eventType} - ${entry.status} - User: ${entry.userId || 'unknown'} - IP: ${entry.ipAddress || 'unknown'}`;
    
    if (entry.status === 'failure') {
      logger.warn(logMessage, { auditEvent: entry });
    } else {
      logger.info(logMessage, { auditEvent: entry });
    }
  } catch (error) {
    logger.error('Failed to write audit log:', error);
  }
}

/**
 * Create audit logger middleware for Express
 */
export function createAuditMiddleware(resourceType: string) {
  return (req: any, res: any, next: () => void) => {
    // Store original methods to wrap
    const originalEnd = res.end;
    
    // Override res.end method to capture response
    res.end = function(chunk: any, encoding: string) {
      // Call original method
      originalEnd.call(res, chunk, encoding);
      
      // Determine action based on HTTP method
      let action: string;
      switch (req.method) {
        case 'GET':
          action = 'READ';
          break;
        case 'POST':
          action = 'CREATE';
          break;
        case 'PUT':
        case 'PATCH':
          action = 'UPDATE';
          break;
        case 'DELETE':
          action = 'DELETE';
          break;
        default:
          action = req.method;
      }
      
      // Only audit write operations and sensitive data access
      if (action !== 'READ' || req.path.includes('sensitive')) {
        // Determine event type
        let eventType: AuditEventType;
        if (action === 'CREATE') {
          eventType = AuditEventType.RESOURCE_CREATED;
        } else if (action === 'UPDATE') {
          eventType = AuditEventType.RESOURCE_UPDATED;
        } else if (action === 'DELETE') {
          eventType = AuditEventType.RESOURCE_DELETED;
        } else {
          eventType = AuditEventType.SENSITIVE_DATA_ACCESS;
        }
        
        // Create audit log entry
        const auditEntry: AuditLogEntry = {
          eventType,
          timestamp: new Date().toISOString(),
          userId: req.user?.id,
          username: req.user?.username || req.user?.email,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          resourceId: req.params.id || req.body?.id,
          resourceType,
          action,
          status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure',
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          },
          requestId: req.headers['x-request-id'],
          sessionId: req.sessionID
        };
        
        // Log the audit event
        logAuditEvent(auditEntry);
      }
    };
    
    next();
  };
}

// Export a default audit logger instance
export const auditLogger = { logAuditEvent, createAuditMiddleware };
export default auditLogger;
