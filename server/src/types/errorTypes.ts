/**
 * Error classification system for the AirWAVE API
 * Provides consistent error types and codes across the application
 */

// Base error codes by category
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTH',
  AUTHORIZATION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER = 'SERVER',
  DATABASE = 'DB',
  EXTERNAL = 'EXTERNAL',
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  INPUT = 'INPUT',
  BUSINESS_LOGIC = 'BUSINESS',
  SECURITY = 'SECURITY'
}

// Specific error codes
export const ErrorCode = {
  // Validation errors
  VALIDATION_FAILED: `${ErrorCategory.VALIDATION}_001`,
  INVALID_INPUT: `${ErrorCategory.VALIDATION}_002`,
  MISSING_FIELD: `${ErrorCategory.VALIDATION}_003`,
  INVALID_FORMAT: `${ErrorCategory.VALIDATION}_004`,
  
  // Authentication errors
  INVALID_CREDENTIALS: `${ErrorCategory.AUTHENTICATION}_001`,
  EXPIRED_TOKEN: `${ErrorCategory.AUTHENTICATION}_002`,
  INVALID_TOKEN: `${ErrorCategory.AUTHENTICATION}_003`,
  MISSING_TOKEN: `${ErrorCategory.AUTHENTICATION}_004`,
  AUTHENTICATION_REQUIRED: `${ErrorCategory.AUTHENTICATION}_005`,
  ACCOUNT_LOCKED: `${ErrorCategory.AUTHENTICATION}_006`,
  PASSWORD_EXPIRED: `${ErrorCategory.AUTHENTICATION}_007`,
  MFA_REQUIRED: `${ErrorCategory.AUTHENTICATION}_008`,
  MFA_FAILED: `${ErrorCategory.AUTHENTICATION}_009`,
  SESSION_EXPIRED: `${ErrorCategory.AUTHENTICATION}_010`,
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS: `${ErrorCategory.AUTHORIZATION}_001`,
  FORBIDDEN_RESOURCE: `${ErrorCategory.AUTHORIZATION}_002`,
  ROLE_REQUIRED: `${ErrorCategory.AUTHORIZATION}_003`,
  PERMISSION_DENIED: `${ErrorCategory.AUTHORIZATION}_004`,
  
  // Not found errors
  RESOURCE_NOT_FOUND: `${ErrorCategory.NOT_FOUND}_001`,
  ENDPOINT_NOT_FOUND: `${ErrorCategory.NOT_FOUND}_002`,
  USER_NOT_FOUND: `${ErrorCategory.NOT_FOUND}_003`,
  
  // Conflict errors
  RESOURCE_ALREADY_EXISTS: `${ErrorCategory.CONFLICT}_001`,
  CONFLICTING_REQUEST: `${ErrorCategory.CONFLICT}_002`,
  OUTDATED_VERSION: `${ErrorCategory.CONFLICT}_003`,
  
  // Security errors
  INVALID_CSRF_TOKEN: `${ErrorCategory.SECURITY}_001`,
  RATE_LIMIT_EXCEEDED: `${ErrorCategory.SECURITY}_002`,
  SUSPICIOUS_ACTIVITY: `${ErrorCategory.SECURITY}_003`,
  IP_BLOCKED: `${ErrorCategory.SECURITY}_004`,
  
  // Server errors
  INTERNAL_ERROR: `${ErrorCategory.SERVER}_001`,
  SERVICE_UNAVAILABLE: `${ErrorCategory.SERVER}_002`,
  NOT_IMPLEMENTED: `${ErrorCategory.SERVER}_003`,
  
  // Database errors
  DATABASE_ERROR: `${ErrorCategory.DATABASE}_001`,
  QUERY_FAILED: `${ErrorCategory.DATABASE}_002`,
  CONSTRAINT_VIOLATION: `${ErrorCategory.DATABASE}_003`,
  TRANSACTION_FAILED: `${ErrorCategory.DATABASE}_004`,
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: `${ErrorCategory.EXTERNAL}_001`,
  EXTERNAL_TIMEOUT: `${ErrorCategory.EXTERNAL}_002`,
  EXTERNAL_RATE_LIMIT: `${ErrorCategory.EXTERNAL}_003`,
  
  // Network errors
  NETWORK_ERROR: `${ErrorCategory.NETWORK}_001`,
  REQUEST_TIMEOUT: `${ErrorCategory.NETWORK}_002`,
  CONNECTION_RESET: `${ErrorCategory.NETWORK}_003`,
  
  // Rate limiting
  TOO_MANY_REQUESTS: `${ErrorCategory.RATE_LIMIT}_001`,
  QUOTA_EXCEEDED: `${ErrorCategory.RATE_LIMIT}_002`,
  
  // Input errors
  FILE_TOO_LARGE: `${ErrorCategory.INPUT}_001`,
  UNSUPPORTED_MEDIA_TYPE: `${ErrorCategory.INPUT}_002`,
  MALFORMED_REQUEST: `${ErrorCategory.INPUT}_003`,
  
  // Business logic errors
  OPERATION_FAILED: `${ErrorCategory.BUSINESS_LOGIC}_001`,
  INVALID_STATE_TRANSITION: `${ErrorCategory.BUSINESS_LOGIC}_002`,
  PRECONDITION_FAILED: `${ErrorCategory.BUSINESS_LOGIC}_003`,
  ASSET_PROCESSING_FAILED: `${ErrorCategory.BUSINESS_LOGIC}_004`
};

// Map status codes to error categories
export const StatusCodeMap: Record<ErrorCategory, number> = {
  [ErrorCategory.VALIDATION]: 400,
  [ErrorCategory.AUTHENTICATION]: 401,
  [ErrorCategory.AUTHORIZATION]: 403,
  [ErrorCategory.NOT_FOUND]: 404,
  [ErrorCategory.CONFLICT]: 409,
  [ErrorCategory.SERVER]: 500,
  [ErrorCategory.DATABASE]: 500,
  [ErrorCategory.EXTERNAL]: 502,
  [ErrorCategory.NETWORK]: 504,
  [ErrorCategory.RATE_LIMIT]: 429,
  [ErrorCategory.INPUT]: 400,
  [ErrorCategory.BUSINESS_LOGIC]: 422,
  [ErrorCategory.SECURITY]: 403
};

// Map for user-friendly error messages
export const UserFriendlyMessages: Record<string, string> = {
  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'The provided information is invalid. Please check your input and try again.',
  [ErrorCode.INVALID_INPUT]: 'The provided input is invalid. Please check your input and try again.',
  [ErrorCode.MISSING_FIELD]: 'Required fields are missing. Please fill in all required fields.',
  [ErrorCode.INVALID_FORMAT]: 'The format of the provided data is invalid. Please check and try again.',
  
  // Authentication
  [ErrorCode.INVALID_CREDENTIALS]: 'The email or password provided is incorrect. Please try again.',
  [ErrorCode.EXPIRED_TOKEN]: 'Your session has expired. Please log in again.',
  [ErrorCode.MISSING_TOKEN]: 'Authentication required. Please log in to continue.',
  [ErrorCode.INVALID_TOKEN]: 'Invalid authentication token. Please log in again.',
  [ErrorCode.AUTHENTICATION_REQUIRED]: 'Authentication is required to access this resource.',
  [ErrorCode.ACCOUNT_LOCKED]: 'Your account has been locked due to too many failed login attempts. Please contact support.',
  [ErrorCode.PASSWORD_EXPIRED]: 'Your password has expired. Please reset your password to continue.',
  [ErrorCode.MFA_REQUIRED]: 'Multi-factor authentication is required to complete this login.',
  [ErrorCode.MFA_FAILED]: 'Multi-factor authentication verification failed. Please try again.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  
  // Authorization
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  [ErrorCode.FORBIDDEN_RESOURCE]: 'Access to this resource is forbidden.',
  [ErrorCode.ROLE_REQUIRED]: 'A specific role is required to perform this action.',
  [ErrorCode.PERMISSION_DENIED]: 'Permission denied. You do not have the necessary permissions.',
  
  // Not found
  [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.USER_NOT_FOUND]: 'The requested user was not found.',
  
  // Conflict
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'A resource with this information already exists.',
  
  // Security
  [ErrorCode.INVALID_CSRF_TOKEN]: 'Invalid CSRF token. Please refresh the page and try again.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
  [ErrorCode.SUSPICIOUS_ACTIVITY]: 'Suspicious activity detected. Please contact support if you believe this is an error.',
  [ErrorCode.IP_BLOCKED]: 'Your IP address has been temporarily blocked due to suspicious activity.',
  
  // Server
  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Our team has been notified.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'This service is temporarily unavailable. Please try again later.',
  [ErrorCode.NOT_IMPLEMENTED]: 'This feature is not yet implemented.',
  
  // Database
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Our team has been notified.',
  
  // External
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service error occurred. Please try again later.',
  
  // Network
  [ErrorCode.NETWORK_ERROR]: 'A network error occurred. Please check your connection and try again.',
  [ErrorCode.REQUEST_TIMEOUT]: 'The request timed out. Please try again later.',
  
  // Rate limiting
  [ErrorCode.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later.',
  
  // Input
  [ErrorCode.FILE_TOO_LARGE]: 'The file size exceeds the maximum limit.',
  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: 'The file type is not supported.',
  
  // Business logic
  [ErrorCode.OPERATION_FAILED]: 'The operation could not be completed. Please try again.',
  [ErrorCode.ASSET_PROCESSING_FAILED]: 'Asset processing failed. Please try again with a different file.'
};

/**
 * Determines if an error is retryable
 */
export const isRetryableError = (code: string): boolean => {
  const retryableCodes = [
    // Server errors
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.INTERNAL_ERROR,
    
    // External service errors
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    ErrorCode.EXTERNAL_TIMEOUT,
    
    // Network errors
    ErrorCode.NETWORK_ERROR,
    ErrorCode.REQUEST_TIMEOUT,
    ErrorCode.CONNECTION_RESET,
    
    // Database errors
    ErrorCode.DATABASE_ERROR,
    
    // Authentication errors
    ErrorCode.SESSION_EXPIRED,
    ErrorCode.EXPIRED_TOKEN,
    
    // Rate limiting
    ErrorCode.RATE_LIMIT_EXCEEDED,
    ErrorCode.TOO_MANY_REQUESTS
  ];
  return retryableCodes.includes(code);
};

/**
 * Get HTTP status code from error code
 */
export const getStatusCode = (code: string): number => {
  const category = code.split('_')[0] as ErrorCategory;
  return StatusCodeMap[category] || 500;
};

/**
 * Get user-friendly message for error code
 */
export const getUserFriendlyMessage = (code: string): string => {
  return UserFriendlyMessages[code] || 'An unexpected error occurred. Please try again later.';
};
