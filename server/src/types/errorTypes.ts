/**
 * Type definitions for API responses
 * Standardizes response formats across the application
 */

// Standard API response format
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  meta?: ResponseMetadata;
}

// Error response format
export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// Metadata for paginated responses
export interface ResponseMetadata {
  pagination?: PaginationMetadata;
  timestamp?: string;
  processingTime?: number;
}

// Pagination metadata
export interface PaginationMetadata {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Error codes enum
export enum ErrorCode {
  // Authentication errors (400-499)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  
  // Validation errors (400-499)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors (400-499)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Operation errors (400-499)
  OPERATION_FAILED = 'OPERATION_FAILED',
  
  // Rate limiting errors (400-499)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500-599)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  
  // Media processing errors
  MEDIA_PROCESSING_FAILED = 'MEDIA_PROCESSING_FAILED',
  INVALID_MEDIA_FORMAT = 'INVALID_MEDIA_FORMAT',
  
  // External service errors
  CREATOMATE_ERROR = 'CREATOMATE_ERROR',
  ELEVENLABS_ERROR = 'ELEVENLABS_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  ASSEMBLYAI_ERROR = 'ASSEMBLYAI_ERROR',
  MUBERT_ERROR = 'MUBERT_ERROR'
}

/**
 * Get user-friendly error messages for error codes
 * @param code The error code
 * @returns A user-friendly error message
 */
export function getUserFriendlyMessage(code: ErrorCode): string {
  switch (code) {
    // Authentication errors
    case ErrorCode.UNAUTHORIZED:
      return 'You are not authorized to perform this action.';
    case ErrorCode.FORBIDDEN:
      return 'You do not have permission to access this resource.';
    case ErrorCode.INVALID_CREDENTIALS:
      return 'The provided credentials are invalid.';
    case ErrorCode.TOKEN_EXPIRED:
      return 'Your session has expired. Please log in again.';
    case ErrorCode.AUTHENTICATION_REQUIRED:
      return 'Authentication is required to access this resource.';
    
    // Validation errors
    case ErrorCode.VALIDATION_FAILED:
      return 'The provided data failed validation.';
    case ErrorCode.INVALID_INPUT:
      return 'The input provided is invalid.';
    case ErrorCode.MISSING_REQUIRED_FIELD:
      return 'A required field is missing.';
    
    // Resource errors
    case ErrorCode.RESOURCE_NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorCode.RESOURCE_ALREADY_EXISTS:
      return 'The resource already exists.';
    case ErrorCode.RESOURCE_CONFLICT:
      return 'There is a conflict with the current state of the resource.';
    
    // Operation errors
    case ErrorCode.OPERATION_FAILED:
      return 'The requested operation failed.';
    
    // Rate limiting errors
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 'Rate limit exceeded. Please try again later.';
    
    // Server errors
    case ErrorCode.INTERNAL_SERVER_ERROR:
    case ErrorCode.INTERNAL_ERROR:
      return 'An internal server error occurred. Please try again later.';
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 'The service is currently unavailable. Please try again later.';
    case ErrorCode.DATABASE_ERROR:
      return 'A database error occurred. Please try again later.';
    case ErrorCode.EXTERNAL_API_ERROR:
      return 'An error occurred with an external service. Please try again later.';
    
    // Media processing errors
    case ErrorCode.MEDIA_PROCESSING_FAILED:
      return 'Media processing failed. Please try again with a different file.';
    case ErrorCode.INVALID_MEDIA_FORMAT:
      return 'The media format is invalid. Please use a supported format.';
    
    // External service errors
    case ErrorCode.CREATOMATE_ERROR:
      return 'An error occurred with the video generation service.';
    case ErrorCode.ELEVENLABS_ERROR:
      return 'An error occurred with the voice generation service.';
    case ErrorCode.OPENAI_ERROR:
      return 'An error occurred with the AI service.';
    case ErrorCode.ASSEMBLYAI_ERROR:
      return 'An error occurred with the transcription service.';
    case ErrorCode.MUBERT_ERROR:
      return 'An error occurred with the music generation service.';
    
    default:
      return 'An unexpected error occurred.';
  }
}
