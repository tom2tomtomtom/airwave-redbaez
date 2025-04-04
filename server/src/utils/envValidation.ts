// Environment validation utility
// This file provides functions to validate required environment variables

/**
 * Validates that required environment variables are set
 * @param requiredVars Array of required environment variable names
 * @param isProduction Whether the application is running in production mode
 * @returns Object containing validation results
 */
export function validateEnvironment(requiredVars: string[], isProduction: boolean = process.env.NODE_ENV === 'production'): {
  isValid: boolean;
  missing: string[];
  message: string;
} {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  // In production, all required variables must be set
  const isValid = isProduction ? missing.length === 0 : true;
  
  let message = '';
  if (missing.length > 0) {
    message = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProduction) {
      message += '. Application cannot start in production without these variables.';
    } else {
      message += '. Application may not function correctly without these variables.';
    }
  } else {
    message = 'All required environment variables are set.';
  }
  
  return {
    isValid,
    missing,
    message
  };
}

/**
 * Validates environment variables and throws an error in production if any required variables are missing
 * @param requiredVars Array of required environment variable names
 */
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const result = validateEnvironment(requiredVars, isProduction);
  
  if (!result.isValid) {
    console.error(result.message);
    if (isProduction) {
      throw new Error(result.message);
    }
  } else {
    console.log(result.message);
  }
}

/**
 * Gets an environment variable with a fallback, but logs a warning if using fallback in production
 * @param name Environment variable name
 * @param fallback Fallback value to use if environment variable is not set
 * @param required Whether the variable is required in production
 * @returns The environment variable value or fallback
 */
export function getEnvVar(name: string, fallback: string, required: boolean = false): string {
  const value = process.env[name];
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!value) {
    if (isProduction && required) {
      const message = `Required environment variable ${name} is not set in production`;
      console.error(message);
      throw new Error(message);
    } else if (isProduction) {
      console.warn(`Warning: Using fallback value for ${name} in production`);
    } else {
      console.info(`Using fallback value for ${name} in development`);
    }
    return fallback;
  }
  
  return value;
}
