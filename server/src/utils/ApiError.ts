// server/src/utils/ApiError.ts
import { ErrorCode, getStatusCode } from '../types/errorTypes';

/**
 * Custom error class for API-specific errors.
 * Allows attaching a specific ErrorCode and statusCode.
 */
export class ApiError extends Error {
  public statusCode: number;
  public errorCode: ErrorCode;
  public details?: unknown; // Optional: For validation errors or extra context
  public internalDetails?: unknown; // Optional: For internal logging, not sent to client

  constructor(
    errorCode: ErrorCode,
    message?: string, // Optional custom message, defaults based on errorCode
    details?: unknown,
    internalDetails?: unknown
  ) {
    // Use the provided message or derive one (can enhance getUserFriendlyMessage later if needed)
    super(message || `Error: ${errorCode}`); 
    this.name = 'ApiError'; // Set the error name
    this.errorCode = errorCode;
    this.statusCode = getStatusCode(errorCode); // Get status code based on error code
    this.details = details;
    this.internalDetails = internalDetails;

    // Ensure the stack trace is captured correctly
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
