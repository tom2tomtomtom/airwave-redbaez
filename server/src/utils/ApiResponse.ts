// server/src/utils/ApiResponse.ts
import { Response } from 'express';
import { ApiError } from './ApiError'; // Assuming ApiError is in the same directory
import { getUserFriendlyMessage, ErrorCode } from '../types/errorTypes';

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static badRequest(
    res: Response,
    message: string = 'Bad request'
  ): Response {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  static error(
    res: Response,
    error: unknown, // Use unknown for better type safety
    defaultStatusCode: number = 500
  ): Response {
    let statusCode: number;
    let errorCode: ErrorCode | undefined;
    let message: string;
    let details: unknown | undefined;

    if (error instanceof ApiError) {
      statusCode = error.statusCode;
      errorCode = error.code; // Fixed: use code instead of errorCode
      message = error.message;
      details = error.details;
      // Log the details if available
      if (error.details) {
        logger.error('Error Details:', error.details);
      }
    } else if (error instanceof Error) {
      // Handle generic errors
      statusCode = defaultStatusCode;
      message = 'An unexpected server error occurred.';
      logger.error('Generic Error:', error); // Log the actual error
    } else {
      // Handle non-Error throws
      statusCode = defaultStatusCode;
      message = 'An unexpected error occurred.';
      logger.error('Unknown Error Type:', error);
    }

    // Attempt to get a more user-friendly message if an errorCode exists
    const userFriendlyMessage = errorCode ? getUserFriendlyMessage(errorCode) : message;

    return res.status(statusCode).json({
      success: false,
      message: userFriendlyMessage,
      errorCode, // Include the specific error code if available
      details,   // Include validation details if available
    });
  }
}
