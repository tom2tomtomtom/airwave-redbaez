import { Response } from 'express';
import { ApiResponse } from '../ApiResponse';
import { ApiError } from '../ApiError';
import { ErrorCode, getUserFriendlyMessage } from '../../types/errorTypes';

// Mock Express Response object
const mockResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
};

describe('ApiResponse', () => {
  let res: Response;

  beforeEach(() => {
    // Reset the mock before each test
    res = mockResponse();
    // Reset console spy if necessary (or use jest.spyOn directly in tests)
    jest.clearAllMocks(); 
  });

  describe('success', () => {
    it('should send success response with default status and message', () => {
      const data = { id: 1, name: 'Test' };
      ApiResponse.success(res, data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data,
      });
    });

    it('should send success response with custom status and message', () => {
      const data = { result: 'ok' };
      const message = 'Created successfully';
      const statusCode = 201;
      ApiResponse.success(res, data, message, statusCode);

      expect(res.status).toHaveBeenCalledWith(statusCode);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        data,
      });
    });
  });

  describe('error', () => {
    it('should handle ApiError correctly', () => {
      const errorCode = ErrorCode.RESOURCE_NOT_FOUND;
      const message = 'Resource not here!';
      const details = { field: 'id' };
      const apiError = new ApiError(errorCode, message, details);
      const expectedStatusCode = 404; // From StatusCodeMap for NOT_FOUND

      ApiResponse.error(res, apiError);

      expect(res.status).toHaveBeenCalledWith(expectedStatusCode);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: getUserFriendlyMessage(errorCode), // Expects user-friendly message
        errorCode: errorCode,
        details: details,
      });
    });

    it('should handle ApiError without details', () => {
      const errorCode = ErrorCode.AUTHENTICATION_REQUIRED;
      const apiError = new ApiError(errorCode);
      const expectedStatusCode = 401;

      ApiResponse.error(res, apiError);

      expect(res.status).toHaveBeenCalledWith(expectedStatusCode);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: getUserFriendlyMessage(errorCode),
        errorCode: errorCode,
        details: undefined, // No details provided
      });
    });

    it('should handle generic Error correctly', () => {
      const genericError = new Error('Something broke');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(); // Suppress console output

      ApiResponse.error(res, genericError); // Uses default status 500

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected server error occurred.',
        errorCode: undefined,
        details: undefined,
      });
      expect(consoleSpy).toHaveBeenCalledWith('Generic Error:', genericError);
      consoleSpy.mockRestore();
    });

    it('should handle non-Error type correctly', () => {
      const unknownError = 'Just a string error';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      ApiResponse.error(res, unknownError, 400); // Use custom default status

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected error occurred.',
        errorCode: undefined,
        details: undefined,
      });
      expect(consoleSpy).toHaveBeenCalledWith('Unknown Error Type:', unknownError);
      consoleSpy.mockRestore();
    });

    it('should log internalDetails from ApiError', () => {
      const errorCode = ErrorCode.DATABASE_ERROR;
      const internalDetails = { query: 'SELECT * FROM fail', trace: '...' };
      const apiError = new ApiError(errorCode, 'DB issue', undefined, internalDetails);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const expectedStatusCode = 500;

      ApiResponse.error(res, apiError);

      expect(res.status).toHaveBeenCalledWith(expectedStatusCode);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: getUserFriendlyMessage(errorCode),
        errorCode: errorCode,
        details: undefined,
      });
      expect(consoleSpy).toHaveBeenCalledWith('Internal Error Details:', internalDetails);
      consoleSpy.mockRestore();
    });
  });
});
