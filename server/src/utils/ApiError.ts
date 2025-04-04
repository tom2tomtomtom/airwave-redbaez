/**
 * Custom API Error class for standardized error handling
 */
import { ErrorCode } from '../types/errorTypes';
import { logger } from './logger';

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.statusCode = this.determineStatusCode(code);
    
    // Log the error when it's created
    logger.error(`API Error: ${code} - ${message}`, { details });
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Determine HTTP status code based on error code
   */
  private determineStatusCode(code: ErrorCode): number {
    switch (code) {
      // Authentication errors
      case ErrorCode.UNAUTHORIZED:
        return 401;
      case ErrorCode.FORBIDDEN:
        return 403;
      case ErrorCode.INVALID_CREDENTIALS:
        return 401;
      case ErrorCode.TOKEN_EXPIRED:
        return 401;
      case ErrorCode.AUTHENTICATION_REQUIRED:
        return 401;
      
      // Validation errors
      case ErrorCode.VALIDATION_FAILED:
      case ErrorCode.INVALID_INPUT:
      case ErrorCode.MISSING_REQUIRED_FIELD:
        return 400;
      
      // Resource errors
      case ErrorCode.RESOURCE_NOT_FOUND:
        return 404;
      case ErrorCode.RESOURCE_ALREADY_EXISTS:
      case ErrorCode.RESOURCE_CONFLICT:
        return 409;
      
      // Operation errors
      case ErrorCode.OPERATION_FAILED:
        return 400;
      
      // Rate limiting errors
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429;
      
      // Media processing errors
      case ErrorCode.MEDIA_PROCESSING_FAILED:
      case ErrorCode.INVALID_MEDIA_FORMAT:
        return 422;
      
      // External service errors
      case ErrorCode.CREATOMATE_ERROR:
      case ErrorCode.ELEVENLABS_ERROR:
      case ErrorCode.OPENAI_ERROR:
      case ErrorCode.ASSEMBLYAI_ERROR:
      case ErrorCode.MUBERT_ERROR:
        return 502;
      
      // Server errors
      case ErrorCode.INTERNAL_SERVER_ERROR:
      case ErrorCode.INTERNAL_ERROR:
      case ErrorCode.DATABASE_ERROR:
      default:
        return 500;
      
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 503;
    }
  }
  
  /**
   * Convert to a standardized response object
   */
  toResponse() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}
