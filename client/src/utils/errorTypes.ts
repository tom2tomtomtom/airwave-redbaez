/**
 * Error classification system for client-side error handling
 * Aligns with server-side error categorization
 */

// Error Categories
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTH',
  AUTHORIZATION = 'AUTHZ',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  NETWORK = 'NETWORK',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

// Specific Error Codes
export const ErrorCode = {
  // Validation errors
  VALIDATION_FAILED: `${ErrorCategory.VALIDATION}_001`,
  INVALID_INPUT: `${ErrorCategory.VALIDATION}_002`,
  MISSING_REQUIRED_FIELD: `${ErrorCategory.VALIDATION}_003`,

  // Authentication errors
  INVALID_CREDENTIALS: `${ErrorCategory.AUTHENTICATION}_001`,
  SESSION_EXPIRED: `${ErrorCategory.AUTHENTICATION}_002`,
  INVALID_TOKEN: `${ErrorCategory.AUTHENTICATION}_003`,
  NOT_AUTHENTICATED: `${ErrorCategory.AUTHENTICATION}_004`,

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: `${ErrorCategory.AUTHORIZATION}_001`,
  ACCESS_DENIED: `${ErrorCategory.AUTHORIZATION}_002`,
  RESOURCE_FORBIDDEN: `${ErrorCategory.AUTHORIZATION}_003`,

  // Not found errors
  RESOURCE_NOT_FOUND: `${ErrorCategory.NOT_FOUND}_001`,
  ENDPOINT_NOT_FOUND: `${ErrorCategory.NOT_FOUND}_002`,
  FILE_NOT_FOUND: `${ErrorCategory.NOT_FOUND}_003`,

  // Conflict errors
  RESOURCE_ALREADY_EXISTS: `${ErrorCategory.CONFLICT}_001`,
  STALE_DATA: `${ErrorCategory.CONFLICT}_002`,
  VERSION_CONFLICT: `${ErrorCategory.CONFLICT}_003`,

  // Network errors
  NETWORK_UNAVAILABLE: `${ErrorCategory.NETWORK}_001`,
  REQUEST_TIMEOUT: `${ErrorCategory.NETWORK}_002`,
  CORS_ERROR: `${ErrorCategory.NETWORK}_003`,
  API_UNREACHABLE: `${ErrorCategory.NETWORK}_004`,

  // Server errors
  INTERNAL_SERVER_ERROR: `${ErrorCategory.SERVER}_001`,
  SERVICE_UNAVAILABLE: `${ErrorCategory.SERVER}_002`,
  DATABASE_ERROR: `${ErrorCategory.SERVER}_003`,
  EXTERNAL_SERVICE_ERROR: `${ErrorCategory.SERVER}_004`,

  // Client errors
  RUNTIME_ERROR: `${ErrorCategory.CLIENT}_001`,
  RENDER_ERROR: `${ErrorCategory.CLIENT}_002`,
  MEMORY_ERROR: `${ErrorCategory.CLIENT}_003`,
  ASSET_LOADING_ERROR: `${ErrorCategory.CLIENT}_004`,

  // Unknown errors
  UNKNOWN_ERROR: `${ErrorCategory.UNKNOWN}_001`
};

// Maps error codes to user-friendly messages
export const ErrorMessages: Record<string, string> = {
  [ErrorCode.VALIDATION_FAILED]: 'The provided information is invalid.',
  [ErrorCode.INVALID_INPUT]: 'One or more fields contain invalid data.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'One or more required fields are missing.',

  [ErrorCode.INVALID_CREDENTIALS]: 'The username or password you entered is incorrect.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.INVALID_TOKEN]: 'Your authentication token is invalid.',
  [ErrorCode.NOT_AUTHENTICATED]: 'You need to be logged in to access this resource.',

  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  [ErrorCode.ACCESS_DENIED]: 'Access denied.',
  [ErrorCode.RESOURCE_FORBIDDEN]: 'You do not have access to this resource.',

  [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.ENDPOINT_NOT_FOUND]: 'The requested endpoint does not exist.',
  [ErrorCode.FILE_NOT_FOUND]: 'The requested file was not found.',

  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'A resource with this information already exists.',
  [ErrorCode.STALE_DATA]: 'The data you are modifying has changed since you last retrieved it.',
  [ErrorCode.VERSION_CONFLICT]: 'Version conflict detected.',

  [ErrorCode.NETWORK_UNAVAILABLE]: 'Network connection is unavailable. Please check your internet connection.',
  [ErrorCode.REQUEST_TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCode.CORS_ERROR]: 'Cross-origin request blocked.',
  [ErrorCode.API_UNREACHABLE]: 'Unable to reach the API. Please try again later.',

  [ErrorCode.INTERNAL_SERVER_ERROR]: 'An internal server error occurred. Our team has been notified.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Our team has been notified.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An error occurred with an external service.',

  [ErrorCode.RUNTIME_ERROR]: 'An unexpected error occurred in the application.',
  [ErrorCode.RENDER_ERROR]: 'An error occurred while rendering the interface.',
  [ErrorCode.MEMORY_ERROR]: 'The application has encountered a memory issue.',
  [ErrorCode.ASSET_LOADING_ERROR]: 'Failed to load necessary assets.',

  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred. Please try again or contact support.'
};

// Maps HTTP status codes to error categories
export const statusCodeToErrorCategory = (statusCode: number): ErrorCategory => {
  if (statusCode >= 400 && statusCode < 500) {
    if (statusCode === 400) return ErrorCategory.VALIDATION;
    if (statusCode === 401) return ErrorCategory.AUTHENTICATION;
    if (statusCode === 403) return ErrorCategory.AUTHORIZATION;
    if (statusCode === 404) return ErrorCategory.NOT_FOUND;
    if (statusCode === 409) return ErrorCategory.CONFLICT;
    return ErrorCategory.CLIENT;
  } else if (statusCode >= 500) {
    return ErrorCategory.SERVER;
  }
  return ErrorCategory.UNKNOWN;
};

// Determines if an error is transient and can be retried
export const isTransientError = (error: any): boolean => {
  // Network errors are typically transient
  if (error.code?.startsWith(ErrorCategory.NETWORK)) return true;
  
  // Some server errors can be retried
  if (error.code === ErrorCode.SERVICE_UNAVAILABLE) return true;
  if (error.code === ErrorCode.INTERNAL_SERVER_ERROR) return true;
  
  // Check status codes if error has status
  if (error.status) {
    return error.status === 408 || // Request Timeout
           error.status === 429 || // Too Many Requests
           error.status === 503 || // Service Unavailable
           error.status === 504;   // Gateway Timeout
  }
  
  // Check for network-related errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('network')) return true;
  
  return false;
};
