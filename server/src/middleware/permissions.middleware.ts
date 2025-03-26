import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';
import { ErrorCode } from '../types/errorTypes';
import { permissionService, Permission } from '../services/PermissionService';

/**
 * Middleware to check if a user has a specific permission
 * @param permission The permission to check for
 */
export const requirePermission = (permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip check in development mode if configured
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_PERMISSIONS === 'true') {
      console.warn(`[DEV] Bypassing permission check for: ${permission}`);
      return next();
    }

    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.userId) {
        throw new ApiError({
          statusCode: 401,
          message: 'Authentication required',
          code: ErrorCode.AUTHENTICATION_REQUIRED
        });
      }

      const hasPermission = await permissionService.hasPermission(
        req.user.userId,
        permission
      );

      if (!hasPermission) {
        throw new ApiError({
          statusCode: 403,
          message: 'You do not have permission to access this resource',
          code: ErrorCode.PERMISSION_DENIED
        });
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError({
          statusCode: 500,
          message: 'Permission check failed',
          code: ErrorCode.INTERNAL_ERROR
        }));
      }
    }
  };
};

/**
 * Middleware to check if a user has all of the specified permissions
 * @param permissions Array of permissions to check for
 */
export const requireAllPermissions = (permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip check in development mode if configured
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_PERMISSIONS === 'true') {
      console.warn(`[DEV] Bypassing permissions check for: ${permissions.join(', ')}`);
      return next();
    }

    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.userId) {
        throw new ApiError({
          statusCode: 401,
          message: 'Authentication required',
          code: ErrorCode.AUTHENTICATION_REQUIRED
        });
      }

      const hasAllPermissions = await permissionService.hasAllPermissions(
        req.user.userId,
        permissions
      );

      if (!hasAllPermissions) {
        throw new ApiError({
          statusCode: 403,
          message: 'You do not have all required permissions to access this resource',
          code: ErrorCode.PERMISSION_DENIED
        });
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError({
          statusCode: 500,
          message: 'Permission check failed',
          code: ErrorCode.INTERNAL_ERROR
        }));
      }
    }
  };
};

/**
 * Middleware to check if a user has any of the specified permissions
 * @param permissions Array of permissions to check for
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip check in development mode if configured
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_PERMISSIONS === 'true') {
      console.warn(`[DEV] Bypassing permissions check for: ${permissions.join(', ')}`);
      return next();
    }

    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.userId) {
        throw new ApiError({
          statusCode: 401,
          message: 'Authentication required',
          code: ErrorCode.AUTHENTICATION_REQUIRED
        });
      }

      const hasAnyPermission = await permissionService.hasAnyPermission(
        req.user.userId,
        permissions
      );

      if (!hasAnyPermission) {
        throw new ApiError({
          statusCode: 403,
          message: 'You need at least one of the required permissions to access this resource',
          code: ErrorCode.PERMISSION_DENIED
        });
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError({
          statusCode: 500,
          message: 'Permission check failed',
          code: ErrorCode.INTERNAL_ERROR
        }));
      }
    }
  };
};

/**
 * Middleware to require admin role
 * This is a shorthand for requiring the admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // Skip check in development mode if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_PERMISSIONS === 'true') {
    console.warn('[DEV] Bypassing admin role check');
    return next();
  }

  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.userId) {
      throw new ApiError({
        statusCode: 401,
        message: 'Authentication required',
        code: ErrorCode.AUTHENTICATION_REQUIRED
      });
    }

    // Check if user has admin role
    const userData = await permissionService.getUserRole(req.user.userId);
    
    if (!userData) {
      throw new ApiError({
        statusCode: 404,
        message: 'User not found',
        code: ErrorCode.USER_NOT_FOUND
      });
    }

    if (userData.role !== 'admin') {
      throw new ApiError({
        statusCode: 403,
        message: 'Admin access required',
        code: ErrorCode.PERMISSION_DENIED
      });
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError({
        statusCode: 500,
        message: 'Admin check failed',
        code: ErrorCode.INTERNAL_ERROR
      }));
    }
  }
};
