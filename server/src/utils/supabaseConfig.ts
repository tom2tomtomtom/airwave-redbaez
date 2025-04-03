import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { logger } from './logger';
import { auditLogger, AuditEventType } from './auditLogger';

dotenv.config();

/**
 * Database configuration and connection options
 */
interface DatabaseConfig {
  url: string;
  key: string;
  serviceRoleKey?: string;
  useServiceRole: boolean;
  autoRefreshToken: boolean;
  persistSession: boolean;
  maxRetries: number;
  timeoutDuration: number;
}

/**
 * Load database configuration from environment variables
 * with secure defaults and validation
 */
function loadDatabaseConfig(): DatabaseConfig {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Validate required configuration
  if (!supabaseUrl) {
    const error = 'Missing SUPABASE_URL. Check your environment variables.';
    logger.error(error);
    throw new Error(error);
  }
  
  if (!supabaseKey) {
    const error = 'Missing SUPABASE_KEY. Check your environment variables.';
    logger.error(error);
    throw new Error(error);
  }
  
  // Only use service role in development mode when present and explicitly enabled
  const useServiceRole = Boolean(
    isDevelopment && 
    serviceRoleKey && 
    process.env.USE_SERVICE_ROLE === 'true'
  );
  
  if (useServiceRole) {
    logger.warn('⚠️ Using Supabase service role key - ONLY FOR DEVELOPMENT');
    
    // Log this security-relevant event to the audit log
    auditLogger.logAuditEvent({
      eventType: AuditEventType.CONFIG_CHANGE,
      timestamp: new Date().toISOString(),
      status: 'success',
      details: {
        component: 'database',
        change: 'Using service role key in development mode'
      }
    });
  }
  
  return {
    url: supabaseUrl,
    key: supabaseKey,
    serviceRoleKey,
    useServiceRole,
    autoRefreshToken: true,
    persistSession: false,
    maxRetries: 3,
    timeoutDuration: 30000 // 30 seconds
  };
}
