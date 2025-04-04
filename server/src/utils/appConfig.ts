import { validateRequiredEnvVars } from '../utils/envValidation';

// Define required environment variables for the application
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'REDIS_URL'
];

// Additional variables required only in production
const PRODUCTION_REQUIRED_ENV_VARS = [
  ...REQUIRED_ENV_VARS,
  'CORS_ORIGIN',
  'PORT'
];

/**
 * Validates all required environment variables for the application
 * This should be called early in the application startup
 */
export function validateAppEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const varsToValidate = isProduction ? PRODUCTION_REQUIRED_ENV_VARS : REQUIRED_ENV_VARS;
  
  validateRequiredEnvVars(varsToValidate);
}
