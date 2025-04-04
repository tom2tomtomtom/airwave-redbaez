// server/src/utils/__tests__/ApiError.test.ts
import { ApiError } from '../ApiError';
import { ErrorCode } from '../../types/errorTypes';

describe('ApiError', () => {
  it('should create an instance with default message based on errorCode', () => {
    const errorCode = ErrorCode.VALIDATION_FAILED;
    const error = new ApiError(errorCode);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.errorCode).toBe(errorCode);
    expect(error.statusCode).toBe(400); // Default for VALIDATION category
    expect(error.message).toBe(`Error: ${errorCode}`);
    expect(error.name).toBe('ApiError');
    expect(error.details).toBeUndefined();
    expect(error.internalDetails).toBeUndefined();
    expect(error.stack).toBeDefined();
  });

  it('should create an instance with a custom message', () => {
    const errorCode = ErrorCode.RESOURCE_NOT_FOUND;
    const customMessage = 'Specific resource not found';
    const error = new ApiError(errorCode, customMessage);

    expect(error.errorCode).toBe(errorCode);
    expect(error.statusCode).toBe(404); // Default for NOT_FOUND category
    expect(error.message).toBe(customMessage);
  });

  it('should create an instance with details', () => {
    const errorCode = ErrorCode.INVALID_INPUT;
    const details = { field: 'email', reason: 'invalid format' };
    const error = new ApiError(errorCode, undefined, details);

    expect(error.errorCode).toBe(errorCode);
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual(details);
  });

  it('should create an instance with internalDetails', () => {
    const errorCode = ErrorCode.DATABASE_ERROR;
    const internalDetails = { query: 'SELECT * FROM users', error: 'connection timeout' };
    const error = new ApiError(errorCode, undefined, undefined, internalDetails);

    expect(error.errorCode).toBe(errorCode);
    expect(error.statusCode).toBe(500);
    expect(error.internalDetails).toEqual(internalDetails);
    expect(error.details).toBeUndefined();
  });

  it('should correctly map errorCode to statusCode', () => {
    const validationError = new ApiError(ErrorCode.VALIDATION_FAILED, 'An error occurred');
    const authError = new ApiError(ErrorCode.AUTHENTICATION_REQUIRED, 'An error occurred');
    const forbiddenError = new ApiError(ErrorCode.PERMISSION_DENIED, 'An error occurred');
    const notFoundError = new ApiError(ErrorCode.RESOURCE_NOT_FOUND, 'An error occurred');
    const conflictError = new ApiError(ErrorCode.RESOURCE_ALREADY_EXISTS, 'An error occurred');
    const externalError = new ApiError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'An error occurred');
    const logicError = new ApiError(ErrorCode.OPERATION_FAILED, 'An error occurred');

    expect(validationError.statusCode).toBe(400);
    expect(authError.statusCode).toBe(401);
    expect(forbiddenError.statusCode).toBe(403);
    expect(notFoundError.statusCode).toBe(404);
    expect(conflictError.statusCode).toBe(409);
    expect(externalError.statusCode).toBe(502);
    expect(logicError.statusCode).toBe(422);
  });
});
