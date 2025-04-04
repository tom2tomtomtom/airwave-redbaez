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
  
  // Validation errors (400-499)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors (400-499)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Rate limiting errors (400-499)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500-599)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
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
