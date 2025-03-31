// server/src/types/routeHandler.ts
import { Response, NextFunction, RequestHandler, Request } from 'express';
import { AuthenticatedRequest } from './AuthenticatedRequest';

/**
 * Type definition for route handlers that require authenticated users.
 * This properly types the request handler to work with Express Router.
 */
export type AuthenticatedRouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<Response | void | undefined>;

/**
 * Helper function to cast an authenticated route handler to a standard Express request handler.
 * This resolves TypeScript errors when using authenticated handlers with Express router.
 * 
 * @param handler The authenticated route handler function
 * @returns A properly typed Express request handler
 */
export const asRouteHandler = (handler: AuthenticatedRouteHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // We know that at this point, req.user has been populated by the auth middleware
    return handler(req as AuthenticatedRequest, res, next);
  };
};
