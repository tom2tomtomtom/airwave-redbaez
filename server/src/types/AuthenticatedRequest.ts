// server/src/types/AuthenticatedRequest.ts
import { Request } from 'express';
import { AuthenticatedUser } from './shared';

/**
 * Extends the Express Request interface to include authenticated user information.
 */
/**
 * Defines the structure for an Express Request after successful authentication,
 * ensuring the `user` property conforms to the `AuthenticatedUser` type.
 */
export interface AuthenticatedRequest extends Request {
  /**
   * The authenticated user object. Guaranteed to exist in routes protected by successful authentication.
   * Use optional chaining (`req.user?.userId`) in middleware or routes where auth isn't guaranteed.
   */
  user?: AuthenticatedUser; // Use the canonical AuthenticatedUser type
}
